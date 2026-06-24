from calendar import monthrange
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Alert, Bill, MeterReading, User
from app.schemas import MeterReading as MeterReadingSchema
from app.security import get_current_user, require_admin
from app.services.alert_service import (
    check_frequent_anomalies,
    check_high_bill_alert,
    check_monthly_usage_alert,
)
from app.services.anomaly import detect_anomaly

router = APIRouter()


# ----------------------------
# Billing Logic
# ----------------------------
def calculate_bill(units: float) -> float:
    if units <= 100:
        rate = 1.5
    elif units <= 300:
        rate = 3.0
    else:
        rate = 5.0
    return units * rate


# ----------------------------
# Add Reading (With Anomaly Detection)
# ----------------------------
@router.post("/add-reading")
def add_reading(
    reading: MeterReadingSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.id != reading.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to add readings for another user",
        )

    user = db.query(User).filter(User.id == reading.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    units = reading.current_reading - reading.previous_reading

    previous_readings = (
        db.query(MeterReading)
        .filter(MeterReading.user_id == reading.user_id)
        .order_by(MeterReading.timestamp.asc())
        .all()
    )

    history_units: List[float] = [r.units for r in previous_readings]

    average_value: float | None = None
    percentage_increase: float | None = None
    explanation = "Insufficient data"

    if history_units:
        average_value = sum(history_units) / len(history_units)
        if average_value == 0:
            percentage_increase = 100.0 if units > 0 else 0.0
        else:
            percentage_increase = ((units - average_value) / average_value) * 100

        percentage_increase = round(percentage_increase, 2)

        if percentage_increase > 0:
            explanation = f"Your usage increased by {percentage_increase:.2f}% compared to your average."
        elif percentage_increase < 0:
            explanation = f"Your usage decreased by {abs(percentage_increase):.2f}% compared to your average."
        else:
            explanation = "Your usage is unchanged compared to your average."

    _detected_anomaly, z_score = detect_anomaly(history_units, units)
    is_anomaly = percentage_increase is not None and percentage_increase > 30

    bill_amount = calculate_bill(units)

    db_reading = MeterReading(
        user_id=reading.user_id,
        units=units,
        load_value=reading.current_reading,
        timestamp=datetime.utcnow(),
        is_anomaly=is_anomaly,
    )

    db.add(db_reading)

    # If anomaly → create alert + check frequent anomalies
    if is_anomaly:
        anomaly_alert = Alert(
            user_id=reading.user_id,
            message="Abnormal consumption detected",
            explanation=explanation,
            percentage_increase=percentage_increase,
            status="open",
            type="ANOMALY",
            timestamp=datetime.utcnow(),
        )
        db.add(anomaly_alert)

        # Check if too many anomalies in last 7 days
        check_frequent_anomalies(db, reading.user_id)

    db.commit()
    db.refresh(db_reading)

    return {
        "message": "Reading stored successfully",
        "units_consumed": units,
        "average_value": round(average_value, 2) if average_value is not None else None,
        "percentage_increase": percentage_increase,
        "explanation": explanation,
        "estimated_bill": bill_amount,
        "is_anomaly": is_anomaly,
        "z_score": round(z_score, 3),
    }


# ----------------------------
# Get History (Self or Admin)
# ----------------------------
@router.get("/history/{user_id}")
def get_history(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this history",
        )

    readings = (
        db.query(MeterReading)
        .filter(MeterReading.user_id == user_id)
        .order_by(MeterReading.timestamp.desc())
        .all()
    )

    return readings


# ----------------------------
# Get Summary (Self or Admin)
# ----------------------------
@router.get("/summary/{user_id}")
def get_summary(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this summary",
        )

    readings = (
        db.query(MeterReading)
        .filter(MeterReading.user_id == user_id)
        .all()
    )

    total_units = sum(r.units for r in readings)
    estimated_total_bill = calculate_bill(total_units)

    return {
        "user_id": user_id,
        "total_units": total_units,
        "estimated_total_bill": estimated_total_bill,
        "total_readings": len(readings),
    }


# ----------------------------
# Get User Bills (Self or Admin)
# ----------------------------
@router.get("/bills/{user_id}")
def get_user_bills(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view these bills",
        )

    bills = (
        db.query(Bill)
        .filter(Bill.user_id == user_id)
        .order_by(Bill.month.desc())
        .all()
    )
    return bills


# ----------------------------
# Get User Alerts (Self or Admin)
# ----------------------------
@router.get("/alerts/{user_id}")
def get_user_alerts(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view these alerts",
        )

    alerts = (
        db.query(Alert)
        .filter(Alert.user_id == user_id)
        .order_by(Alert.timestamp.desc())
        .all()
    )
    return alerts


# ----------------------------
# Generate Monthly Bill (Self or Admin)
# ----------------------------
@router.post("/generate-bill/{user_id}")
def generate_monthly_bill(
    user_id: int,
    year: int | None = None,
    month: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to generate bills for this user",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    now = datetime.now()
    target_year = year or now.year
    target_month = month or now.month

    if target_month < 1 or target_month > 12:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Month must be between 1 and 12")

    start_date = datetime(target_year, target_month, 1)
    last_day = monthrange(target_year, target_month)[1]
    end_date = datetime(target_year, target_month, last_day, 23, 59, 59)

    readings = (
        db.query(MeterReading)
        .filter(
            MeterReading.user_id == user_id,
            MeterReading.timestamp >= start_date,
            MeterReading.timestamp <= end_date,
        )
        .all()
    )

    if not readings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No readings found for this month",
        )

    total_units = sum(r.units for r in readings)
    predicted_amount = calculate_bill(total_units)

    month_label = f"{target_year}-{str(target_month).zfill(2)}"

    existing_bill = (
        db.query(Bill)
        .filter(Bill.user_id == user_id, Bill.month == month_label)
        .first()
    )

    if existing_bill:
        existing_bill.total_units = total_units
        existing_bill.predicted_amount = predicted_amount
        bill_record = existing_bill
    else:
        bill_record = Bill(
            user_id=user_id,
            month=month_label,
            total_units=total_units,
            predicted_amount=predicted_amount,
        )
        db.add(bill_record)

    # Intelligent Alerts
    check_monthly_usage_alert(db, user_id, total_units)
    check_high_bill_alert(db, user_id, predicted_amount)

    db.commit()
    db.refresh(bill_record)

    return {
        "message": "Bill processed successfully",
        "month": month_label,
        "total_units": total_units,
        "predicted_amount": predicted_amount,
    }


# ----------------------------
# Dashboard Analytics (Self or Admin)
# ----------------------------
@router.get("/dashboard/{user_id}")
def get_dashboard(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this dashboard",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    now = datetime.utcnow()
    year = now.year
    month = now.month

    start_date = datetime(year, month, 1)
    last_day = monthrange(year, month)[1]
    end_date = datetime(year, month, last_day, 23, 59, 59)

    # Current month readings
    monthly_readings = (
        db.query(MeterReading)
        .filter(
            MeterReading.user_id == user_id,
            MeterReading.timestamp >= start_date,
            MeterReading.timestamp <= end_date,
        )
        .all()
    )

    current_month_units = sum(r.units for r in monthly_readings)
    predicted_bill = calculate_bill(current_month_units)

    # Total anomalies (all time)
    total_anomalies = (
        db.query(MeterReading)
        .filter(MeterReading.user_id == user_id, MeterReading.is_anomaly == True)
        .count()
    )

    # Active alerts count
    total_alerts = (
        db.query(Alert)
        .filter(Alert.user_id == user_id)
        .count()
    )

    # Latest bill
    latest_bill = (
        db.query(Bill)
        .filter(Bill.user_id == user_id)
        .order_by(Bill.id.desc())
        .first()
    )

    # Total readings
    total_readings = (
        db.query(MeterReading)
        .filter(MeterReading.user_id == user_id)
        .count()
    )

    # --- Secure Area Intelligence Calculations (Computed on Backend) ---
    # 1. Fetch other user IDs in the same area (role='user')
    area_users = db.query(User).filter(User.area == user.area, User.role == "user").all()
    area_user_ids = [u.id for u in area_users]

    # 2. Get current month units for all users in the area to calculate average & percentile
    area_monthly_usage = []
    for uid in area_user_ids:
        u_readings = db.query(MeterReading).filter(
            MeterReading.user_id == uid,
            MeterReading.timestamp >= start_date,
            MeterReading.timestamp <= end_date,
        ).all()
        u_units = sum(r.units for r in u_readings)
        area_monthly_usage.append(u_units)

    area_average_usage = sum(area_monthly_usage) / len(area_monthly_usage) if area_monthly_usage else current_month_units

    # Calculate percentile rank
    users_with_lower_usage = sum(1 for val in area_monthly_usage if val < current_month_units)
    area_percentile = (users_with_lower_usage / len(area_monthly_usage)) * 100 if area_monthly_usage else 50

    area_comparison_text = (
        f"You consume more than {area_percentile:.0f}% users in your area."
        if area_percentile >= 50
        else f"You consume less than {100 - area_percentile:.0f}% users in your area."
    )

    # 3. Peak hour calculation using historical readings
    all_readings = db.query(MeterReading).filter(MeterReading.user_id == user_id).all()
    hour_buckets = {}
    for r in all_readings:
        hour = r.timestamp.hour
        hour_buckets[hour] = hour_buckets.get(hour, 0.0) + r.units

    peak_hour = 19
    if hour_buckets:
        peak_hour = max(hour_buckets, key=hour_buckets.get)

    hour12 = peak_hour % 12 or 12
    meridiem = "PM" if peak_hour >= 12 else "AM"
    peak_usage_text = f"Your peak usage is around {hour12}:00 {meridiem}."

    # 4. Monthly trend to calculate efficiency score
    last_month_start = start_date - timedelta(days=28)
    last_month_end = start_date - timedelta(seconds=1)
    last_month_readings = db.query(MeterReading).filter(
        MeterReading.user_id == user_id,
        MeterReading.timestamp >= last_month_start,
        MeterReading.timestamp <= last_month_end,
    ).all()
    last_month_units = sum(r.units for r in last_month_readings)

    percentage_change = (
        ((current_month_units - last_month_units) / last_month_units) * 100
        if last_month_units > 0
        else 0
    )

    usage_ratio = current_month_units / area_average_usage if area_average_usage > 0 else 1
    upward_penalty = percentage_change * 0.5 if percentage_change > 0 else 0
    relative_penalty = max(0.0, (usage_ratio - 1) * 60)
    relative_bonus = max(0.0, (1 - usage_ratio) * 20)
    raw_score = 100 - relative_penalty - upward_penalty + relative_bonus
    efficiency_score = max(0, min(100, round(raw_score)))

    return {
        "user_id": user_id,
        "current_month_units": current_month_units,
        "predicted_bill_this_month": predicted_bill,
        "total_anomalies": total_anomalies,
        "total_alerts": total_alerts,
        "total_readings": total_readings,
        "latest_bill": {
            "month": latest_bill.month if latest_bill else None,
            "total_units": latest_bill.total_units if latest_bill else 0,
            "amount": latest_bill.predicted_amount if latest_bill else 0,
        },
        "area_average_usage": round(area_average_usage, 2),
        "area_comparison_text": area_comparison_text,
        "peak_usage_text": peak_usage_text,
        "efficiency_score": efficiency_score,
    }
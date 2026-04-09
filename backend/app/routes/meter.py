from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from app.schemas import MeterReading as MeterReadingSchema
from app.database import SessionLocal
from app.models import MeterReading, User, Alert, Bill
from app.services.anomaly import detect_anomaly
from app.services.alert_service import (
    check_frequent_anomalies,
    check_monthly_usage_alert,
    check_high_bill_alert
)

router = APIRouter()


# ----------------------------
# DB Dependency
# ----------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ----------------------------
# Billing Logic
# ----------------------------
def calculate_bill(units: float):
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
def add_reading(reading: MeterReadingSchema, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.id == reading.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

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
        is_anomaly=is_anomaly
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
            timestamp=datetime.utcnow()
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
        "z_score": round(z_score, 3)
    }


# ----------------------------
# Get History
# ----------------------------
@router.get("/history/{user_id}")
def get_history(user_id: int, db: Session = Depends(get_db)):

    readings = (
        db.query(MeterReading)
        .filter(MeterReading.user_id == user_id)
        .order_by(MeterReading.timestamp.desc())
        .all()
    )

    return readings


# ----------------------------
# Get Summary
# ----------------------------
@router.get("/summary/{user_id}")
def get_summary(user_id: int, db: Session = Depends(get_db)):

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
        "total_readings": len(readings)
    }


# ----------------------------
# Generate Monthly Bill
# ----------------------------
@router.post("/generate-bill/{user_id}")
def generate_monthly_bill(
    user_id: int,
    year: int | None = None,
    month: int | None = None,
    db: Session = Depends(get_db),
):

    from calendar import monthrange

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"error": "User not found"}

    now = datetime.now()
    target_year = year or now.year
    target_month = month or now.month

    if target_month < 1 or target_month > 12:
        raise HTTPException(status_code=400, detail="Month must be between 1 and 12")

    start_date = datetime(target_year, target_month, 1)
    last_day = monthrange(target_year, target_month)[1]
    end_date = datetime(target_year, target_month, last_day, 23, 59, 59)

    readings = (
        db.query(MeterReading)
        .filter(
            MeterReading.user_id == user_id,
            MeterReading.timestamp >= start_date,
            MeterReading.timestamp <= end_date
        )
        .all()
    )

    if not readings:
        return {"message": "No readings found for this month"}

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
            predicted_amount=predicted_amount
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
        "predicted_amount": predicted_amount
    }

# ----------------------------
# Dashboard Analytics
# ----------------------------
@router.get("/dashboard/{user_id}")
def get_dashboard(user_id: int, db: Session = Depends(get_db)):

    from calendar import monthrange
    from sqlalchemy import func

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"error": "User not found"}

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
            MeterReading.timestamp <= end_date
        )
        .all()
    )

    current_month_units = sum(r.units for r in monthly_readings)
    predicted_bill = calculate_bill(current_month_units)

    # Total anomalies (all time)
    total_anomalies = (
        db.query(MeterReading)
        .filter(
            MeterReading.user_id == user_id,
            MeterReading.is_anomaly == True
        )
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
            "amount": latest_bill.predicted_amount if latest_bill else 0
        }
    }
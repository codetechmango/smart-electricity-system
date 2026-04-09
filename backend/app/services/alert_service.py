from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import MeterReading, Alert


# ----------------------------
# High Monthly Usage Check
# ----------------------------
def check_monthly_usage_alert(db: Session, user_id: int, total_units: float):

    MONTHLY_UNIT_THRESHOLD = 1000  # Adjustable

    if total_units > MONTHLY_UNIT_THRESHOLD:
        alert = Alert(
            user_id=user_id,
            message=f"High monthly usage detected: {total_units} units.",
            type="HIGH_USAGE",
            timestamp=datetime.utcnow()
        )
        db.add(alert)


# ----------------------------
# High Bill Alert
# ----------------------------
def check_high_bill_alert(db: Session, user_id: int, predicted_amount: float):

    BILL_THRESHOLD = 3000  # Adjustable

    if predicted_amount > BILL_THRESHOLD:
        alert = Alert(
            user_id=user_id,
            message=f"High predicted bill: ₹{predicted_amount}",
            type="HIGH_BILL",
            timestamp=datetime.utcnow()
        )
        db.add(alert)


# ----------------------------
# Frequent Anomaly Check (Last 7 Days)
# ----------------------------
def check_frequent_anomalies(db: Session, user_id: int):

    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    anomaly_count = (
        db.query(MeterReading)
        .filter(
            MeterReading.user_id == user_id,
            MeterReading.is_anomaly == True,
            MeterReading.timestamp >= seven_days_ago
        )
        .count()
    )

    if anomaly_count >= 3:  # Adjustable threshold
        alert = Alert(
            user_id=user_id,
            message="Multiple anomalies detected in the last 7 days.",
            type="FREQUENT_ANOMALY",
            timestamp=datetime.utcnow()
        )
        db.add(alert)
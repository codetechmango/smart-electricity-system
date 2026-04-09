from fastapi import APIRouter
from sqlalchemy import or_
from app.database import SessionLocal
from app.models import User, MeterReading, Alert

router = APIRouter()

@router.get("/dashboard")
def get_dashboard():
    db = SessionLocal()

    try:
        # Users count
        total_users = db.query(User).count()

        # Readings count and sum of units
        readings = db.query(MeterReading).all()
        total_readings = len(readings)
        total_units_sum = sum(r.units for r in readings)

        # Active alerts count
        active_alerts = db.query(Alert).filter(or_(Alert.status == "open", Alert.status.is_(None))).count()

        return {
            "total_users": total_users,
            "total_readings": total_readings,
            "total_units": total_units_sum,
            "active_alerts": active_alerts
        }

    finally:
        db.close()


@router.get("/alerts")
def get_alerts():
    db = SessionLocal()
    try:
        alerts = db.query(Alert).order_by(Alert.timestamp.desc()).all()
        return alerts
    finally:
        db.close()


@router.get("/readings")
def get_readings():
    db = SessionLocal()
    try:
        readings = db.query(MeterReading).order_by(MeterReading.timestamp.desc()).all()
        return readings
    finally:
        db.close()
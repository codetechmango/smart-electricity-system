from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Alert, MeterReading, User
from app.security import require_admin

router = APIRouter()


@router.get("/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
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
        "active_alerts": active_alerts,
    }


@router.get("/alerts")
def get_alerts(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    alerts = db.query(Alert).order_by(Alert.timestamp.desc()).all()
    return alerts


@router.get("/readings")
def get_readings(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    readings = db.query(MeterReading).order_by(MeterReading.timestamp.desc()).all()
    return readings
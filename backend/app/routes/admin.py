from calendar import monthrange
from datetime import datetime
import random

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Alert, Bill, MeterReading, User
from app.security import require_admin

router = APIRouter()


def calculate_bill(units: float) -> float:
	if units <= 100:
		rate = 1.5
	elif units <= 300:
		rate = 3.0
	else:
		rate = 5.0
	return units * rate


@router.delete("/clear-bills")
def clear_all_bills(
	db: Session = Depends(get_db),
	_: User = Depends(require_admin),
) -> dict[str, str]:
	db.query(Bill).delete(synchronize_session=False)
	db.commit()
	return {"message": "All bill records cleared successfully"}


@router.delete("/reset-system")
def reset_system(
	db: Session = Depends(get_db),
	_: User = Depends(require_admin),
) -> dict[str, str]:
	db.query(Bill).delete(synchronize_session=False)
	db.query(MeterReading).delete(synchronize_session=False)
	db.query(Alert).delete(synchronize_session=False)
	db.commit()
	return {"message": "System reset successfully"}


@router.put("/alerts/{alert_id}/resolve")
def resolve_alert(
	alert_id: int,
	db: Session = Depends(get_db),
	_: User = Depends(require_admin),
) -> dict[str, str]:
	alert = db.query(Alert).filter(Alert.id == alert_id).first()
	if not alert:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

	alert.status = "resolved"
	alert.resolved_at = datetime.utcnow()
	db.commit()

	return {"message": "Alert marked as resolved"}


@router.post("/generate-demo-data")
def generate_demo_data(
	db: Session = Depends(get_db),
	_: User = Depends(require_admin),
) -> dict[str, int | str]:
	current_date = datetime.now()
	current_month = current_date.month
	current_year = current_date.year

	def month_window(lookback_months: int) -> list[tuple[int, int]]:
		months: list[tuple[int, int]] = []
		for offset in range(lookback_months, -1, -1):
			month = current_month - offset
			year = current_year
			while month <= 0:
				month += 12
				year -= 1
			months.append((year, month))
		return months

	users = db.query(User).all()
	if not users:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No users found")

	# Keep user accounts intact, regenerate all usage-related demo data.
	db.query(Alert).delete(synchronize_session=False)
	db.query(Bill).delete(synchronize_session=False)
	db.query(MeterReading).delete(synchronize_session=False)

	recent_months = month_window(3)
	total_readings = 0
	total_anomalies = 0
	total_bills = 0

	for user in users:
		base_units = random.uniform(90, 140)
		trend_step = random.uniform(5, 11)
		cumulative_load = random.uniform(900, 2800)
		monthly_units: dict[str, float] = {}
		history_units: list[float] = []
		global_idx = 0

		current_month_entry_count = random.randint(3, 5)
		spike_position = random.randint(0, max(0, current_month_entry_count - 1))

		for year, month in recent_months:
			is_current_month = year == current_year and month == current_month
			reading_count = current_month_entry_count if is_current_month else random.randint(2, 4)
			last_day = monthrange(year, month)[1]
			max_day = min(last_day, current_date.day) if is_current_month else last_day
			max_day = max(1, max_day)

			if is_current_month:
				preferred_days = [5, 10, 20, 24, 28]
				days = [min(max_day, preferred_days[idx % len(preferred_days)]) for idx in range(reading_count)]
			else:
				days = sorted(random.randint(2, max_day) for _ in range(reading_count))

			for idx, day in enumerate(days):
				hour = 8 + ((idx * 3) % 10)
				timestamp = datetime(year, month, day, hour, 0, 0)

				units = base_units + (global_idx * trend_step) + random.uniform(-12, 12)
				if is_current_month:
					units += idx * random.uniform(2, 5)

				is_anomaly = is_current_month and idx == spike_position

				if is_anomaly:
					units *= random.uniform(1.8, 2.4)

				units = round(max(units, 30.0), 2)
				cumulative_load += units

				db.add(
					MeterReading(
						user_id=user.id,
						units=units,
						load_value=round(cumulative_load, 2),
						timestamp=timestamp,
						is_anomaly=is_anomaly,
					)
				)

				month_label = timestamp.strftime("%Y-%m")
				monthly_units[month_label] = monthly_units.get(month_label, 0.0) + units
				total_readings += 1

				if is_anomaly:
					total_anomalies += 1
					average_value = sum(history_units) / len(history_units) if history_units else None
					percentage_increase: float | None = None
					explanation = "Insufficient data"

					if average_value is not None:
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

					db.add(
						Alert(
							user_id=user.id,
							message=f"Usage spike detected for {user.name}",
							explanation=explanation,
							percentage_increase=percentage_increase,
							status="open",
							type="ANOMALY",
							timestamp=timestamp,
						)
					)

				history_units.append(units)
				global_idx += 1

		for month_label, units_sum in monthly_units.items():
			db.add(
				Bill(
					user_id=user.id,
					month=month_label,
					total_units=round(units_sum, 2),
					predicted_amount=round(calculate_bill(units_sum), 2),
				)
			)
			total_bills += 1

	db.commit()

	return {
		"message": "Demo dataset generated successfully",
		"users_processed": len(users),
		"readings_created": total_readings,
		"anomalies_created": total_anomalies,
		"bills_created": total_bills,
	}

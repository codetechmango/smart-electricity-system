from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, SessionLocal, engine
import app.models
from app.models import User
from app.routes import admin, auth, meter, user
from app.routes.dashboard import router as dashboard_router
from app.security import hash_password

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard_router)
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(meter.router, prefix="/meter", tags=["Meter"])
app.include_router(user.router, prefix="/users", tags=["Users"])


def ensure_auth_columns() -> None:
    with engine.begin() as connection:
        columns = connection.exec_driver_sql("PRAGMA table_info(users)").fetchall()
        column_names = {column[1] for column in columns}

        if "password_hash" not in column_names:
            connection.exec_driver_sql("ALTER TABLE users ADD COLUMN password_hash VARCHAR NOT NULL DEFAULT ''")

        if "role" not in column_names:
            connection.exec_driver_sql("ALTER TABLE users ADD COLUMN role VARCHAR NOT NULL DEFAULT 'user'")


def ensure_alert_columns() -> None:
    with engine.begin() as connection:
        columns = connection.exec_driver_sql("PRAGMA table_info(alerts)").fetchall()
        column_names = {column[1] for column in columns}

        if "explanation" not in column_names:
            connection.exec_driver_sql("ALTER TABLE alerts ADD COLUMN explanation VARCHAR")

        if "percentage_increase" not in column_names:
            connection.exec_driver_sql("ALTER TABLE alerts ADD COLUMN percentage_increase FLOAT")

        if "status" not in column_names:
            connection.exec_driver_sql("ALTER TABLE alerts ADD COLUMN status VARCHAR NOT NULL DEFAULT 'open'")

        if "resolved_at" not in column_names:
            connection.exec_driver_sql("ALTER TABLE alerts ADD COLUMN resolved_at DATETIME")

        connection.exec_driver_sql("UPDATE alerts SET status = 'open' WHERE status IS NULL OR status = ''")


def ensure_default_auth_users() -> None:
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "admin@smartgrid.com").first()
        if not admin:
            db.add(
                User(
                    name="System Admin",
                    email="admin@smartgrid.com",
                    area="HQ",
                    password_hash=hash_password("Admin@123"),
                    role="admin",
                )
            )

        demo_user = db.query(User).filter(User.email == "priya@consumer.com").first()
        if not demo_user:
            db.add(
                User(
                    name="Priya Kumar",
                    email="priya@consumer.com",
                    area="Chennai North",
                    password_hash=hash_password("User@123"),
                    role="user",
                )
            )

        db.query(User).filter(User.role.is_(None)).update({"role": "user"}, synchronize_session=False)
        db.query(User).filter(User.password_hash.is_(None)).update({"password_hash": ""}, synchronize_session=False)
        db.commit()
    finally:
        db.close()


@app.on_event("startup")
def on_startup() -> None:
    ensure_auth_columns()
    Base.metadata.create_all(bind=engine)
    ensure_alert_columns()
    ensure_default_auth_users()

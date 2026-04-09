from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import AuthLoginRequest, AuthRegisterRequest, AuthResponse, UserResponse
from app.security import create_access_token, hash_password, verify_password

router = APIRouter()


@router.post("/register", response_model=AuthResponse)
def register(payload: AuthRegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    role = "user"
    user = User(
        name=payload.name,
        email=payload.email,
        area=payload.area,
        password_hash=hash_password(payload.password),
        role=role,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role})

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=AuthResponse)
def login(payload: AuthLoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token({"sub": str(user.id), "role": user.role})

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )

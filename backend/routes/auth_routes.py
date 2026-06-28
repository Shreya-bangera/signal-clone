from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models import get_db, User
from schemas import RegisterRequest, LoginRequest, TokenResponse, UserOut, UserUpdate
from auth import hash_password, verify_password, create_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

MOCK_OTP = "123456"

@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if req.otp != MOCK_OTP:
        raise HTTPException(400, "Invalid OTP. Use 123456")
    if db.query(User).filter(User.phone == req.phone).first():
        raise HTTPException(400, "Phone already registered")
    if req.username and db.query(User).filter(User.username == req.username).first():
        raise HTTPException(400, "Username taken")
    user = User(
        phone=req.phone,
        display_name=req.display_name,
        username=req.username,
        password_hash=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=create_token(user.id), user=UserOut.model_validate(user))

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == req.phone).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    return TokenResponse(access_token=create_token(user.id), user=UserOut.model_validate(user))

@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)

@router.patch("/me", response_model=UserOut)
def update_me(req: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if req.display_name:
        current_user.display_name = req.display_name
    if req.about is not None:
        current_user.about = req.about
    if req.username:
        existing = db.query(User).filter(User.username == req.username, User.id != current_user.id).first()
        if existing:
            raise HTTPException(400, "Username taken")
        current_user.username = req.username
    db.commit()
    db.refresh(current_user)
    return UserOut.model_validate(current_user)

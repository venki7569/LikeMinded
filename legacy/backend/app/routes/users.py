"""
User CRUD API routes.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.database import get_db
from app.models.user import User

router = APIRouter(prefix="/api/users", tags=["Users"])


class UserCreate(BaseModel):
    name: str
    email: str
    domain: str
    role: str
    interests: str
    goals: str
    bio: Optional[str] = ""
    skill_level: Optional[str] = "intermediate"


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    domain: str
    role: str
    interests: str
    goals: str
    bio: str
    skill_level: str


@router.post("", response_model=dict)
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(**user_data.model_dump())
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User created successfully", "user": user.to_dict()}


@router.get("")
def list_users(db: Session = Depends(get_db)):
    """Get all users."""
    users = db.query(User).order_by(User.id).all()
    return {"users": [u.to_dict() for u in users], "total": len(users)}


@router.get("/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get a user by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user": user.to_dict()}


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Delete a user by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": f"User {user_id} deleted successfully"}

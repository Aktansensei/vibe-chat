from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from schemas import UserCreate, UserResponse
from services import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/register", response_model=UserResponse, status_code=201)
def register(data: UserCreate, db: Session = Depends(get_db)):
    return UserService(db).create_user(data)


@router.get("/", response_model=list[UserResponse])
def list_users(search: str | None = None, db: Session = Depends(get_db)):
    return UserService(db).get_all_users(search)


@router.get("/by-username/{username}", response_model=UserResponse)
def get_user_by_username(username: str, db: Session = Depends(get_db)):
    return UserService(db).get_user_by_username(username)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    return UserService(db).get_user_by_id(user_id)

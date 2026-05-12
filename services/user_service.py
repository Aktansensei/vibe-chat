from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from repositories import UserRepository
from schemas import UserCreate, UserResponse


class UserService:
    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def create_user(self, data: UserCreate) -> UserResponse:
        username = data.username.strip()
        if not username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username cannot be empty",
            )
        if len(username) > 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username too long (max 50 characters)",
            )
        if self.repo.get_by_username(username):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Username '{username}' is already taken",
            )
        user = self.repo.create(username)
        return UserResponse.model_validate(user)

    def get_user_by_id(self, user_id: int) -> UserResponse:
        user = self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User {user_id} not found",
            )
        return UserResponse.model_validate(user)

    def get_user_by_username(self, username: str) -> UserResponse:
        user = self.repo.get_by_username(username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User '{username}' not found",
            )
        return UserResponse.model_validate(user)

    def get_all_users(self, search: str | None = None) -> list[UserResponse]:
        users = self.repo.get_all()
        if search:
            query = search.lower()
            users = [u for u in users if query in u.username.lower()]
        return [UserResponse.model_validate(u) for u in users]

from datetime import datetime
from sqlalchemy.orm import Session
from models import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int) -> User | None:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_username(self, username: str) -> User | None:
        return self.db.query(User).filter(User.username == username).first()

    def create(self, username: str) -> User:
        user = User(username=username)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def get_all(self) -> list[User]:
        return self.db.query(User).all()

    def update_last_seen(self, user_id: int, dt: datetime) -> None:
        self.db.query(User).filter(User.id == user_id).update({"last_seen": dt})
        self.db.commit()

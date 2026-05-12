from sqlalchemy.orm import Session
from models import Message


class MessageRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, sender_id: int, receiver_id: int, content: str) -> Message:
        message = Message(sender_id=sender_id, receiver_id=receiver_id, content=content)
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        return message

    def get_chat_history(
        self, user1_id: int, user2_id: int, limit: int = 50
    ) -> list[Message]:
        return (
            self.db.query(Message)
            .filter(
                (
                    (Message.sender_id == user1_id) & (Message.receiver_id == user2_id)
                ) | (
                    (Message.sender_id == user2_id) & (Message.receiver_id == user1_id)
                )
            )
            .order_by(Message.created_at.asc())
            .limit(limit)
            .all()
        )

    def get_count(self, user1_id: int, user2_id: int) -> int:
        return (
            self.db.query(Message)
            .filter(
                (
                    (Message.sender_id == user1_id) & (Message.receiver_id == user2_id)
                ) | (
                    (Message.sender_id == user2_id) & (Message.receiver_id == user1_id)
                )
            )
            .count()
        )

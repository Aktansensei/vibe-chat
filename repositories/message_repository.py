from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from models import Message


class MessageRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        sender_id: int,
        receiver_id: int,
        content: str,
        message_type: str = "text",
        media_data: str | None = None,
    ) -> Message:
        message = Message(
            sender_id=sender_id,
            receiver_id=receiver_id,
            content=content,
            message_type=message_type,
            media_data=media_data,
        )
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        return message

    def get_chat_history(self, user1_id: int, user2_id: int, limit: int = 50) -> list[Message]:
        return (
            self.db.query(Message)
            .filter(
                ((Message.sender_id == user1_id) & (Message.receiver_id == user2_id)) |
                ((Message.sender_id == user2_id) & (Message.receiver_id == user1_id))
            )
            .order_by(Message.created_at.asc())
            .limit(limit)
            .all()
        )

    def get_last_message(self, user1_id: int, user2_id: int) -> Message | None:
        return (
            self.db.query(Message)
            .filter(
                ((Message.sender_id == user1_id) & (Message.receiver_id == user2_id)) |
                ((Message.sender_id == user2_id) & (Message.receiver_id == user1_id))
            )
            .order_by(Message.created_at.desc())
            .first()
        )

    def get_by_id(self, message_id: int) -> Message | None:
        return self.db.query(Message).filter(Message.id == message_id).first()

    def toggle_reaction(self, message_id: int, emoji: str, user_id: int) -> Message | None:
        message = self.get_by_id(message_id)
        if not message:
            return None

        reactions = dict(message.reactions or {})
        users = list(reactions.get(emoji, []))

        if user_id in users:
            users.remove(user_id)
        else:
            users.append(user_id)

        if users:
            reactions[emoji] = users
        else:
            reactions.pop(emoji, None)

        message.reactions = reactions
        flag_modified(message, "reactions")
        self.db.commit()
        self.db.refresh(message)
        return message

    def get_count(self, user1_id: int, user2_id: int) -> int:
        return (
            self.db.query(Message)
            .filter(
                ((Message.sender_id == user1_id) & (Message.receiver_id == user2_id)) |
                ((Message.sender_id == user2_id) & (Message.receiver_id == user1_id))
            )
            .count()
        )

from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from repositories import UserRepository, MessageRepository
from schemas import MessageCreate, MessageResponse, ChatHistory, RecentChat


class MessageService:
    def __init__(self, db: Session):
        self.user_repo = UserRepository(db)
        self.msg_repo = MessageRepository(db)

    def send_message(self, sender_id: int, data: MessageCreate) -> MessageResponse:
        if not self.user_repo.get_by_id(sender_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Sender {sender_id} not found")
        if not self.user_repo.get_by_id(data.receiver_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Receiver {data.receiver_id} not found")
        if sender_id == data.receiver_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot send message to yourself")

        if data.message_type == "text":
            content = data.content.strip()
            if not content:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message content cannot be empty")
        else:
            content = data.content
            if not data.media_data:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="media_data required for non-text messages")

        message = self.msg_repo.create(
            sender_id=sender_id,
            receiver_id=data.receiver_id,
            content=content,
            message_type=data.message_type,
            media_data=data.media_data,
        )
        return MessageResponse.model_validate(message)

    def get_chat_history(self, user1_id: int, user2_id: int, limit: int = 50) -> ChatHistory:
        for uid in (user1_id, user2_id):
            if not self.user_repo.get_by_id(uid):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User {uid} not found")
        messages = self.msg_repo.get_chat_history(user1_id, user2_id, limit)
        total = self.msg_repo.get_count(user1_id, user2_id)
        return ChatHistory(
            messages=[MessageResponse.model_validate(m) for m in messages],
            total=total,
        )

    def get_recent_chats(self, user_id: int) -> list[RecentChat]:
        if not self.user_repo.get_by_id(user_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User {user_id} not found")

        all_users = self.user_repo.get_all()
        chats = []
        for other in all_users:
            if other.id == user_id:
                continue
            last = self.msg_repo.get_last_message(user_id, other.id)
            if not last:
                continue
            chats.append(RecentChat(
                user_id=other.id,
                username=other.username,
                last_message=last.content,
                last_message_type=last.message_type,
                last_message_at=last.created_at,
                last_message_sender_id=last.sender_id,
            ))
        chats.sort(
            key=lambda c: c.last_message_at or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )
        return chats

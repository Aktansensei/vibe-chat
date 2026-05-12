from datetime import datetime
from pydantic import BaseModel, ConfigDict


class MessageBase(BaseModel):
    content: str = ""


class MessageCreate(MessageBase):
    receiver_id: int
    message_type: str = "text"
    media_data: str | None = None


class MessageResponse(MessageBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sender_id: int
    receiver_id: int
    message_type: str
    media_data: str | None
    reactions: dict
    created_at: datetime


class ChatHistory(BaseModel):
    messages: list[MessageResponse]
    total: int


class RecentChat(BaseModel):
    user_id: int
    username: str
    last_message: str | None
    last_message_type: str
    last_message_at: datetime | None
    last_message_sender_id: int | None

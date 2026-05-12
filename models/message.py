from datetime import datetime, timezone
from sqlalchemy import JSON, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    message_type: Mapped[str] = mapped_column(String(10), nullable=False, default="text")
    media_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    reactions: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    receiver_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id], back_populates="messages")
    receiver: Mapped["User"] = relationship("User", foreign_keys=[receiver_id])

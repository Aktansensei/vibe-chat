from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from schemas import MessageCreate, MessageResponse, ChatHistory, RecentChat
from services import MessageService

router = APIRouter(prefix="/messages", tags=["messages"])


@router.get("/recent", response_model=list[RecentChat])
def get_recent_chats(user_id: int, db: Session = Depends(get_db)):
    return MessageService(db).get_recent_chats(user_id)


@router.post("/", response_model=MessageResponse, status_code=201)
def send_message(sender_id: int, data: MessageCreate, db: Session = Depends(get_db)):
    return MessageService(db).send_message(sender_id, data)


@router.get("/{other_user_id}", response_model=ChatHistory)
def get_chat_history(
    other_user_id: int,
    user_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    return MessageService(db).get_chat_history(user_id, other_user_id, limit)

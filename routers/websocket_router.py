from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
import json

from database import get_db
from schemas import MessageCreate
from services import MessageService, UserService
from repositories import UserRepository

router = APIRouter(tags=["websocket"])


class ConnectionManager:
    def __init__(self):
        self.active: dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active[user_id] = websocket

    def disconnect(self, user_id: int):
        self.active.pop(user_id, None)

    async def send_to(self, user_id: int, payload: dict):
        ws = self.active.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(payload, default=str))
            except Exception:
                pass

    async def broadcast(self, payload: dict, exclude: int | None = None):
        for uid, ws in list(self.active.items()):
            if uid == exclude:
                continue
            try:
                await ws.send_text(json.dumps(payload, default=str))
            except Exception:
                pass

    def online_ids(self) -> list[int]:
        return list(self.active.keys())


manager = ConnectionManager()


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    user_id: int,
    websocket: WebSocket,
    db: Session = Depends(get_db),
):
    UserService(db).get_user_by_id(user_id)
    await manager.connect(user_id, websocket)

    UserRepository(db).update_last_seen(user_id, datetime.now(timezone.utc))
    await manager.broadcast({"type": "status", "user_id": user_id, "online": True}, exclude=user_id)
    await manager.send_to(user_id, {"type": "online_list", "user_ids": manager.online_ids()})

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
                event = data.get("type", "message")

                if event == "typing":
                    await manager.send_to(
                        int(data["receiver_id"]),
                        {"type": "typing", "sender_id": user_id},
                    )

                elif event == "stop_typing":
                    await manager.send_to(
                        int(data["receiver_id"]),
                        {"type": "stop_typing", "sender_id": user_id},
                    )

                else:
                    msg_data = MessageCreate(
                        content=data.get("content", ""),
                        receiver_id=int(data["receiver_id"]),
                        message_type=data.get("message_type", "text"),
                        media_data=data.get("media_data"),
                    )
                    UserRepository(db).update_last_seen(user_id, datetime.now(timezone.utc))
                    message = MessageService(db).send_message(user_id, msg_data)
                    payload = message.model_dump(mode="json")

                    await manager.send_to(user_id, {"type": "sent", **payload})
                    await manager.send_to(msg_data.receiver_id, {"type": "received", **payload})

            except (KeyError, ValueError, json.JSONDecodeError) as e:
                await manager.send_to(user_id, {"type": "error", "detail": str(e)})
            except Exception as e:
                await manager.send_to(user_id, {"type": "error", "detail": str(e)})

    except WebSocketDisconnect:
        _on_disconnect(user_id, db)
    except Exception:
        _on_disconnect(user_id, db)


def _on_disconnect(user_id: int, db: Session):
    manager.disconnect(user_id)
    UserRepository(db).update_last_seen(user_id, datetime.now(timezone.utc))
    import asyncio
    asyncio.create_task(
        manager.broadcast({"type": "status", "user_id": user_id, "online": False})
    )

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
import json

from database import get_db
from schemas import MessageCreate
from services import MessageService, UserService

router = APIRouter(tags=["websocket"])


class ConnectionManager:
    def __init__(self):
        # user_id -> WebSocket
        self.active: dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active[user_id] = websocket

    def disconnect(self, user_id: int):
        self.active.pop(user_id, None)

    async def send_to(self, user_id: int, payload: dict):
        ws = self.active.get(user_id)
        if ws:
            await ws.send_text(json.dumps(payload))


manager = ConnectionManager()


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    user_id: int,
    websocket: WebSocket,
    db: Session = Depends(get_db),
):
    # Validate user exists before accepting connection
    UserService(db).get_user_by_id(user_id)

    await manager.connect(user_id, websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
                msg_data = MessageCreate(
                    content=data["content"],
                    receiver_id=int(data["receiver_id"]),
                )
                message = MessageService(db).send_message(user_id, msg_data)
                payload = message.model_dump(mode="json")

                await manager.send_to(user_id, {"type": "sent", **payload})
                await manager.send_to(msg_data.receiver_id, {"type": "received", **payload})

            except (KeyError, ValueError, json.JSONDecodeError) as e:
                # Bad message format — keep connection alive, notify sender
                await manager.send_to(user_id, {"type": "error", "detail": str(e)})
            except Exception as e:
                # Business logic error (HTTPException etc) — keep connection alive
                await manager.send_to(user_id, {"type": "error", "detail": str(e)})

    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception:
        manager.disconnect(user_id)

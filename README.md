# 💬 Vibe Chat

> A clean, real-time chat application built with FastAPI and WebSockets.

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat&logo=sqlite&logoColor=white)](https://sqlite.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat)](LICENSE)

---

## 📸 Screenshots

| Login | Chat |
|-------|------|
| ![Login screen](https://via.placeholder.com/480x300/0f1117/5865f2?text=Login+Screen) | ![Chat screen](https://via.placeholder.com/480x300/0f1117/5865f2?text=Chat+Screen) |

---

## 🔗 Links

| | |
|---|---|
| 🌐 **Live Demo** | _coming soon_ |
| 🎥 **YouTube Demo** | _coming soon_ |

---

## ✨ Features

- ✅ **Real-time messaging** via WebSocket — no page refresh needed
- ✅ **Persistent history** — all messages stored in SQLite
- ✅ **Instant registration** — just type a username, no password required
- ✅ **Session restore** — user stays logged in via localStorage
- ✅ **Online delivery** — messages delivered instantly if recipient is connected
- ✅ **Unread badges** — sidebar shows unread message count
- ✅ **User search** — filter contacts by username
- ✅ **Dark mode UI** — modern minimal design out of the box
- ✅ **Layered architecture** — clean separation of routers / services / repositories

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | [FastAPI](https://fastapi.tiangolo.com) 0.115 |
| **Real-time** | WebSockets (native FastAPI) |
| **ORM** | [SQLAlchemy](https://sqlalchemy.org) 2.0 |
| **Database** | SQLite |
| **Validation** | [Pydantic](https://docs.pydantic.dev) v2 |
| **Server** | [Uvicorn](https://www.uvicorn.org) + uvloop |
| **Frontend** | Vanilla JS + CSS (no frameworks) |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/your-username/vibe-chat.git
cd vibe-chat

# 2. Create and activate virtual environment
python -m venv venv
source venv/bin/activate      # macOS / Linux
# venv\Scripts\activate       # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the server
uvicorn main:app --reload
```

Open **http://localhost:8000** in your browser.

> To test real-time messaging, open the same URL in two different browser tabs and register as two different users.

---

## 📁 Project Structure

```
vibe_chat/
├── main.py                  # FastAPI app, CORS, router registration
├── database.py              # SQLite engine, Base, get_db dependency
├── requirements.txt
│
├── models/                  # SQLAlchemy ORM models
│   ├── user.py
│   └── message.py
│
├── schemas/                 # Pydantic request/response schemas
│   ├── user.py
│   └── message.py
│
├── repositories/            # Database access layer (SQL only)
│   ├── user_repository.py
│   └── message_repository.py
│
├── services/                # Business logic layer
│   ├── user_service.py
│   └── message_service.py
│
├── routers/                 # HTTP + WebSocket endpoints
│   ├── user_router.py
│   ├── message_router.py
│   └── websocket_router.py
│
└── static/                  # Frontend (served at /static)
    ├── index.html
    ├── style.css
    └── script.js
```

### Architecture Rules

```
routers → services → repositories → models
```

- **Routers** handle HTTP/WebSocket only — no business logic
- **Services** contain all business rules — no SQL
- **Repositories** contain all SQL — no business logic

---

## 📡 API Reference

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/users/register` | Register a new user |
| `GET` | `/users/` | List all users (optional `?search=`) |
| `GET` | `/users/{id}` | Get user by ID |
| `GET` | `/users/by-username/{username}` | Get user by username |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/messages/?sender_id={id}` | Send a message |
| `GET` | `/messages/{other_id}?user_id={id}` | Get chat history |

### WebSocket

| Endpoint | Description |
|----------|-------------|
| `WS /ws/{user_id}` | Real-time connection |

**Send format:**
```json
{ "content": "Hello!", "receiver_id": 2 }
```

**Receive format:**
```json
{ "type": "sent" | "received" | "error", "id": 1, "content": "Hello!", "sender_id": 1, "receiver_id": 2, "created_at": "..." }
```

---

## 📄 License

MIT © 2026

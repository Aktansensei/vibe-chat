# 💬 Vibe Chat

> A clean, real-time chat application built with FastAPI and WebSockets.

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat&logo=sqlite&logoColor=white)](https://sqlite.org)
[![Deployed on Railway](https://img.shields.io/badge/Railway-deployed-6366f1?style=flat&logo=railway&logoColor=white)](https://vibe-chat-production-ba9b.up.railway.app)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat)](LICENSE)

<br/>

**🌐 Live Demo → [vibe-chat-production-ba9b.up.railway.app](https://vibe-chat-production-ba9b.up.railway.app)**  
**📦 GitHub → [github.com/Aktansensei/vibe-chat](https://github.com/Aktansensei/vibe-chat)**  
**🎥 YouTube Demo → _coming soon_**

---

## 📸 Screenshots

> Open the live demo and take a screenshot, then replace the images below:
> `docs/screenshot-login.png` and `docs/screenshot-chat.png`

| Login Screen | Chat Screen |
|:---:|:---:|
| ![Login](docs/screenshot-login.png) | ![Chat](docs/screenshot-chat.png) |

<!-- Temporary placeholders until screenshots are added:
![Login](https://via.placeholder.com/520x320/0f1117/5865f2?text=Login+Screen)
![Chat](https://via.placeholder.com/520x320/0f1117/5865f2?text=Chat+Screen)
-->

---

## ✨ Features

- ✅ **Real-time messaging** via WebSocket — no page refresh needed
- ✅ **Persistent history** — all messages stored in SQLite
- ✅ **Instant registration** — just type a username, no password required
- ✅ **Session restore** — stays logged in via localStorage
- ✅ **Online delivery** — messages delivered instantly if recipient is connected
- ✅ **Unread badges** — sidebar shows unread message count per contact
- ✅ **User search** — filter contacts by username in real time
- ✅ **Dark mode UI** — modern minimal design, no frameworks
- ✅ **Layered architecture** — clean separation of routers / services / repositories
- ✅ **Deployed on Railway** — live and accessible 24/7

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
| **Hosting** | [Railway](https://railway.app) |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+

### Run locally

```bash
# 1. Clone the repo
git clone https://github.com/Aktansensei/vibe-chat.git
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

> 💡 To test real-time messaging, open the same URL in two browser tabs and register as two different users.

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
└── static/                  # Frontend (served at /)
    ├── index.html
    ├── style.css
    └── script.js
```

### Architecture contract

```
routers → services → repositories → models
```

- **Routers** — HTTP/WebSocket only, no business logic
- **Services** — all business rules, no SQL
- **Repositories** — all SQL, no business logic

---

## 📡 API Reference

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/users/register` | Register a new user |
| `GET` | `/users/` | List all users (`?search=` optional) |
| `GET` | `/users/{id}` | Get user by ID |
| `GET` | `/users/by-username/{username}` | Get user by username |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/messages/?sender_id={id}` | Send a message |
| `GET` | `/messages/{other_id}?user_id={id}` | Get chat history |

### WebSocket

```
WS /ws/{user_id}
```

**Send:**
```json
{ "content": "Hello!", "receiver_id": 2 }
```

**Receive:**
```json
{ "type": "sent" | "received" | "error", "id": 1, "content": "Hello!", "sender_id": 1, "receiver_id": 2, "created_at": "..." }
```

> Full interactive docs available at [`/docs`](https://vibe-chat-production-ba9b.up.railway.app/docs)

---

## 📄 License

MIT © 2026 — [Aktansensei](https://github.com/Aktansensei)

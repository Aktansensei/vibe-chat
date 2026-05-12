# CLAUDE.md - Architecture Contract & Rules

## Проект: Vibe Chat
Полноценное чат-приложение на FastAPI + WebSocket

## Архитектура (обязательно соблюдать)
- **Layered Architecture**: 
  - `routers/` → только HTTP + WebSocket endpoints
  - `services/` → вся бизнес-логика
  - `repositories/` → только работа с базой данных
- Никогда не делай SQL или прямой доступ к БД в routers и services.

## Структура проекта
├── main.py
├── database.py
├── models/
├── schemas/
├── repositories/
├── services/
├── routers/
├── static/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── CLAUDE.md
├── requirements.txt
└── chat.db
text## Технические требования
- FastAPI + SQLAlchemy + SQLite
- WebSocket для реального времени
- Простая аутентификация (user_id в localStorage)
- Один чат между двумя пользователями
- Чистый, современный минималистичный дизайн

## Workflow (всегда используй)
1. Сначала проанализируй текущую архитектуру
2. Составь план изменений
3. Реализуй по плану
4. Проверь соответствие архитектуре

Ты — senior full-stack разработчик, специализирующийся на чистой архитектуре.

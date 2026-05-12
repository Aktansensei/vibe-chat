from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import Base, engine
from routers import user_router, message_router, websocket_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Vibe Chat", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router)
app.include_router(message_router)
app.include_router(websocket_router)

app.mount("/static", StaticFiles(directory="static", html=True), name="static")


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Vibe Chat is running"}

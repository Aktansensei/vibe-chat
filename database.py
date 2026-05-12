from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = "sqlite:///./chat.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


def run_migrations() -> None:
    """Add new columns to existing tables without dropping data."""
    migrations = [
        "ALTER TABLE messages ADD COLUMN message_type VARCHAR(10) NOT NULL DEFAULT 'text'",
        "ALTER TABLE messages ADD COLUMN media_data TEXT",
        "ALTER TABLE users ADD COLUMN last_seen DATETIME",
        "ALTER TABLE messages ADD COLUMN reactions TEXT NOT NULL DEFAULT '{}'",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass  # column already exists


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

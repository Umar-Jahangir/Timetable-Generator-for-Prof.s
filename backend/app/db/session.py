from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,   # avoids "MySQL server has gone away" on idle connections
    pool_recycle=3600,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Shared declarative base for every SQLAlchemy model in the app."""
    pass


def get_db():
    """
    FastAPI dependency that yields a request-scoped DB session and
    guarantees it's closed afterwards, even if the request raises.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

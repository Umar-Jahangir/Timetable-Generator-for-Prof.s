from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, String, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Notification(Base):
    """Maps to the `notifications` table."""

    __tablename__ = "notifications"

    notification_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    detail: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False)

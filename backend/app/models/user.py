import enum

from sqlalchemy import Boolean, DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    faculty = "faculty"


class User(Base):
    """Maps to the `users` table created in Phase 2 (database/schema/001_create_tables.sql)."""

    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped["DateTime"] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped["DateTime"] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # passive_deletes=True: without this, SQLAlchemy's default behavior on
    # deleting a User is to try to NULL out faculty.user_id first (its own
    # in-memory cascade), which fails because that column is NOT NULL in
    # the DB schema. This tells SQLAlchemy to leave cascade handling to
    # MySQL's own ON DELETE CASCADE (defined in the Phase 2 schema) —
    # confirmed by testing DELETE /admin/faculty/{id} against the live DB.
    faculty_profile = relationship(
        "Faculty",
        back_populates="user",
        uselist=False,
        passive_deletes=True,
    )

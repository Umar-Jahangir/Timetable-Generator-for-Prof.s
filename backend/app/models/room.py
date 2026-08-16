import enum

from sqlalchemy import Boolean, Enum, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class RoomType(str, enum.Enum):
    classroom = "classroom"
    laboratory = "laboratory"
    tutorial = "tutorial"


class Room(Base):
    """Maps to the `rooms` table — classrooms, labs, and tutorial rooms share one table,
    discriminated by `room_type` (see database/docs/er-diagram.md for why)."""

    __tablename__ = "rooms"

    room_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    building: Mapped[str | None] = mapped_column(String(50), nullable=True)
    capacity: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    room_type: Mapped[RoomType] = mapped_column(Enum(RoomType), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

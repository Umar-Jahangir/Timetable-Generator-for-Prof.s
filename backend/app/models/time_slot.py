import enum

from sqlalchemy import Boolean, Enum, SmallInteger, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class DayOfWeek(str, enum.Enum):
    Monday = "Monday"
    Tuesday = "Tuesday"
    Wednesday = "Wednesday"
    Thursday = "Thursday"
    Friday = "Friday"
    Saturday = "Saturday"


class TimeSlot(Base):
    """Maps to the `time_slots` table — the master weekly grid (day x period)
    every timetable entry is placed into."""

    __tablename__ = "time_slots"

    time_slot_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    day_of_week: Mapped[DayOfWeek] = mapped_column(Enum(DayOfWeek), nullable=False)
    start_time: Mapped[object] = mapped_column(Time, nullable=False)
    end_time: Mapped[object] = mapped_column(Time, nullable=False)
    slot_order: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    is_break: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

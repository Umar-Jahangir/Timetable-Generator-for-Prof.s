import enum
from datetime import date, datetime

from sqlalchemy import DATE, TIMESTAMP, Boolean, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class EntryType(str, enum.Enum):
    lecture = "lecture"
    lab = "lab"
    tutorial = "tutorial"
    break_ = "break"


class TimetableEntry(Base):
    """Maps to the `timetable_entries` table — the generated/live timetable.

    Populated by the optimization engine in Phase 6. Until then, every
    query against this table legitimately returns an empty list — the
    Faculty schedule/timetable endpoints built in Phase 5 are wired to
    the real table now so nothing has to change again once Phase 6
    starts writing real rows into it.
    """

    __tablename__ = "timetable_entries"

    entry_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    time_slot_id: Mapped[int] = mapped_column(ForeignKey("time_slots.time_slot_id"), nullable=False)
    division_id: Mapped[int] = mapped_column(ForeignKey("divisions.division_id"), nullable=False)
    batch_id: Mapped[int | None] = mapped_column(ForeignKey("batches.batch_id"), nullable=True)
    subject_id: Mapped[int | None] = mapped_column(ForeignKey("subjects.subject_id"), nullable=True)
    faculty_id: Mapped[int | None] = mapped_column(ForeignKey("faculty.faculty_id"), nullable=True)
    room_id: Mapped[int | None] = mapped_column(ForeignKey("rooms.room_id"), nullable=True)
    entry_type: Mapped[EntryType] = mapped_column(Enum(EntryType), nullable=False, default=EntryType.lecture)
    is_extra: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    academic_term: Mapped[str] = mapped_column(String(20), nullable=False)
    scheduled_date: Mapped[date | None] = mapped_column(DATE, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)

    time_slot = relationship("TimeSlot")
    subject = relationship("Subject")
    room = relationship("Room")
    division = relationship("Division")
    batch = relationship("Batch")
    faculty = relationship("Faculty")

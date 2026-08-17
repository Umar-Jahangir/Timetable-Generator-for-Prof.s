import enum
from datetime import date, datetime

from sqlalchemy import DATE, DECIMAL, TIMESTAMP, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class RequestType(str, enum.Enum):
    extra = "extra"
    replacement = "replacement"


class RequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"


class LectureRequest(Base):
    """Maps to the `lecture_requests` table -- the core object the Smart
    Scheduling Assistant (Phase 7) will create and resolve. Phase 5 uses
    only the plain submission fields (faculty/subject/division/type);
    `recommended_*` and `recommendation_score` stay NULL until Phase 7
    wires up the rule engine that fills them in."""

    __tablename__ = "lecture_requests"

    request_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    faculty_id: Mapped[int] = mapped_column(ForeignKey("faculty.faculty_id"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.subject_id"), nullable=False)
    division_id: Mapped[int] = mapped_column(ForeignKey("divisions.division_id"), nullable=False)
    request_type: Mapped[RequestType] = mapped_column(Enum(RequestType), nullable=False)
    original_entry_id: Mapped[int | None] = mapped_column(
        ForeignKey("timetable_entries.entry_id"), nullable=True
    )
    recommended_time_slot_id: Mapped[int | None] = mapped_column(
        ForeignKey("time_slots.time_slot_id"), nullable=True
    )
    recommended_room_id: Mapped[int | None] = mapped_column(ForeignKey("rooms.room_id"), nullable=True)
    recommendation_score: Mapped[float | None] = mapped_column(DECIMAL(5, 2), nullable=True)
    status: Mapped[RequestStatus] = mapped_column(Enum(RequestStatus), nullable=False, default=RequestStatus.pending)
    requested_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False)
    scheduled_date: Mapped[date | None] = mapped_column(DATE, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)

    faculty = relationship("Faculty")
    subject = relationship("Subject")
    division = relationship("Division")
    recommended_time_slot = relationship("TimeSlot", foreign_keys=[recommended_time_slot_id])
    recommended_room = relationship("Room", foreign_keys=[recommended_room_id])

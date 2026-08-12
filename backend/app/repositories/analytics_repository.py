from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.assistant_query_log import AssistantQueryLog
from app.models.faculty import Faculty
from app.models.lecture_request import LectureRequest, RequestStatus
from app.models.room import Room, RoomType
from app.models.time_slot import TimeSlot
from app.models.timetable_entry import TimetableEntry


class AnalyticsRepository:
    def __init__(self, db: Session):
        self.db = db

    def active_entries(self) -> list[TimetableEntry]:
        """All active entries, with the joins every metric below needs.
        Loaded once and reused rather than re-querying per metric."""
        return (
            self.db.query(TimetableEntry)
            .options(
                joinedload(TimetableEntry.time_slot),
                joinedload(TimetableEntry.room),
            )
            .filter(TimetableEntry.is_active.is_(True))
            .all()
        )

    def teaching_slot_count(self) -> int:
        """Total non-break time slots in the week — the denominator for
        room utilization (e.g. 6 days x 6 teaching periods = 36)."""
        return self.db.query(TimeSlot).filter(TimeSlot.is_break.is_(False)).count()

    def room_count(self, room_type: RoomType) -> int:
        return self.db.query(Room).filter(Room.room_type == room_type, Room.is_active.is_(True)).count()

    def faculty_count(self) -> list[Faculty]:
        """All faculty with a nonzero weekly-hour cap — in practice,
        every faculty row, since that field defaults to 18. Named
        plainly rather than "faculty_with_assignments" (a name this
        query doesn't actually match) — see AnalyticsService for how
        this is used."""
        return self.db.query(Faculty).filter(Faculty.max_weekly_hours > 0).all()

    def pending_requests_count(self) -> int:
        return self.db.query(LectureRequest).filter(LectureRequest.status == RequestStatus.pending).count()

    def assistant_query_stats(self) -> list[AssistantQueryLog]:
        return self.db.query(AssistantQueryLog).all()

    def last_generated_at(self):
        return self.db.query(func.max(TimetableEntry.created_at)).filter(TimetableEntry.is_active.is_(True)).scalar()

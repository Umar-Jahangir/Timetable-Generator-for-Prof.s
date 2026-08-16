from sqlalchemy.orm import Session, joinedload

from app.models.time_slot import DayOfWeek, TimeSlot
from app.models.timetable_entry import TimetableEntry


class TimetableEntryRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_for_faculty(self, faculty_id: int, day: DayOfWeek | None = None) -> list[TimetableEntry]:
        query = (
            self.db.query(TimetableEntry)
            .join(TimeSlot, TimetableEntry.time_slot_id == TimeSlot.time_slot_id)
            .options(
                joinedload(TimetableEntry.time_slot),
                joinedload(TimetableEntry.subject),
                joinedload(TimetableEntry.division),
                joinedload(TimetableEntry.batch),
                joinedload(TimetableEntry.room),
            )
            .filter(TimetableEntry.faculty_id == faculty_id, TimetableEntry.is_active.is_(True))
        )
        if day is not None:
            query = query.filter(TimeSlot.day_of_week == day)
        return query.order_by(TimeSlot.day_of_week, TimeSlot.slot_order).all()

    def count_weekly_hours_for_faculty(self, faculty_id: int) -> tuple[int, int]:
        """Returns (entries_count, scheduled_hours). Each entry is
        assumed to occupy one time_slot's worth of an hour for this
        simple v1 calculation — Phase 6's optimizer will produce entries
        with consistent slot durations, so this holds in practice."""
        entries = (
            self.db.query(TimetableEntry)
            .filter(TimetableEntry.faculty_id == faculty_id, TimetableEntry.is_active.is_(True))
            .all()
        )
        return len(entries), len(entries)

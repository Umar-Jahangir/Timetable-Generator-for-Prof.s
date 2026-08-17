from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.division import Division
from app.models.time_slot import DayOfWeek
from app.models.timetable_entry import TimetableEntry
from app.repositories.faculty_repository import FacultyRepository
from app.repositories.timetable_entry_repository import TimetableEntryRepository
from app.schemas.schedule import TimetableEntryOut
from app.schemas.workload import WorkloadOut


def _division_label(division: Division | None) -> str | None:
    if division is None:
        return None
    year = division.academic_year.name if division.academic_year else "Year"
    return f"{year}-{division.name}"


def _to_out(entry: TimetableEntry) -> TimetableEntryOut:
    label = _division_label(entry.division)
    return TimetableEntryOut(
        entry_id=entry.entry_id,
        day_of_week=entry.time_slot.day_of_week,
        start_time=entry.time_slot.start_time,
        end_time=entry.time_slot.end_time,
        entry_type=entry.entry_type,
        is_extra=bool(entry.is_extra),
        subject_code=entry.subject.code if entry.subject else None,
        subject_name=entry.subject.name if entry.subject else None,
        # Faculty UIs display division_name; always send year-prefixed label
        # (e.g. SY-B) so short codes like "B" are never shown alone.
        division_name=label,
        division_label=label,
        batch_name=entry.batch.name if entry.batch else None,
        room_name=entry.room.name if entry.room else None,
    )


class ScheduleService:
    def __init__(self, db: Session):
        self.db = db
        self.entries = TimetableEntryRepository(db)
        self.faculty_repo = FacultyRepository(db)

    def _faculty_id_for_user(self, user_id: int) -> int:
        faculty = self.faculty_repo.get_by_user_id(user_id)
        if not faculty:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty profile not found.")
        return faculty.faculty_id

    def get_today_schedule(self, user_id: int) -> list[TimetableEntryOut]:
        faculty_id = self._faculty_id_for_user(user_id)
        today_name = datetime.now().strftime("%A")  # e.g. "Monday"
        try:
            today = DayOfWeek(today_name)
        except ValueError:
            # Sunday isn't a modeled teaching day in this schema (see
            # Phase 2's time_slots enum) — no classes, not an error.
            return []
        entries = self.entries.list_for_faculty(faculty_id, day=today)
        return [_to_out(e) for e in entries]

    def get_weekly_timetable(self, user_id: int) -> list[TimetableEntryOut]:
        faculty_id = self._faculty_id_for_user(user_id)
        entries = self.entries.list_for_faculty(faculty_id)
        return [_to_out(e) for e in entries]

    def get_workload(self, user_id: int) -> WorkloadOut:
        faculty_id = self._faculty_id_for_user(user_id)
        faculty = self.faculty_repo.get_by_id(faculty_id)
        entries_count, scheduled_hours = self.entries.count_weekly_hours_for_faculty(faculty_id)
        utilization = (scheduled_hours / faculty.max_weekly_hours * 100) if faculty.max_weekly_hours else 0.0
        return WorkloadOut(
            max_weekly_hours=faculty.max_weekly_hours,
            scheduled_hours=scheduled_hours,
            utilization_percent=round(utilization, 1),
            entries_count=entries_count,
        )

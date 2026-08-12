from sqlalchemy.orm import Session

from app.models.room import Room
from app.models.time_slot import TimeSlot
from app.models.timetable_entry import EntryType, TimetableEntry
from app.repositories.assignment_repository import AssignmentRepository
from app.repositories.division_repository import DivisionRepository
from app.repositories.room_repository import RoomRepository
from app.scheduling.optimizer import (
    DivisionInfo,
    GenerationResult,
    RoomInfo,
    SessionRequirement,
    TimeSlotInfo,
    generate_timetable,
)
from app.scheduling.constraints import get_blocked_slot_ids
from app.scheduling.time_slot_seeder import ensure_full_week_time_slots

ACADEMIC_TERM = "2026-ODD"


class TimetableService:
    def __init__(self, db: Session):
        self.db = db
        self.assignments = AssignmentRepository(db)
        self.rooms = RoomRepository(db)
        self.divisions = DivisionRepository(db)

    def _blocked_slot_ids(self) -> set[int]:
        return get_blocked_slot_ids(self.db)

    def _build_sessions(self) -> list[SessionRequirement]:
        sessions: list[SessionRequirement] = []
        for a in self.assignments.list_all():
            subject = a.subject
            for i in range(subject.lectures_per_week):
                sessions.append(
                    SessionRequirement(a.assignment_id, a.subject_id, a.faculty_id, a.division_id, "lecture", i)
                )
            for i in range(subject.tutorials_per_week):
                sessions.append(
                    SessionRequirement(a.assignment_id, a.subject_id, a.faculty_id, a.division_id, "tutorial", i)
                )
            # lab_hours_per_week is hours; each lab session occupies a
            # 2-consecutive-slot (2-hour) block, so N lab hours -> N//2
            # lab sessions. An odd leftover hour is dropped (documented
            # simplification — real lab blocks are always 2 hours).
            for i in range(subject.lab_hours_per_week // 2):
                sessions.append(
                    SessionRequirement(a.assignment_id, a.subject_id, a.faculty_id, a.division_id, "lab", i)
                )
        return sessions

    def generate(self, time_limit_seconds: float = 15.0) -> dict:
        ensure_full_week_time_slots(self.db)

        sessions = self._build_sessions()

        time_slots = [
            TimeSlotInfo(ts.time_slot_id, ts.day_of_week.value, ts.slot_order)
            for ts in self.db.query(TimeSlot).filter(TimeSlot.is_break.is_(False)).all()
        ]
        rooms = [
            RoomInfo(r.room_id, r.room_type.value, r.capacity)
            for r in self.db.query(Room).filter(Room.is_active.is_(True)).all()
        ]
        divisions = {
            d.division_id: DivisionInfo(d.division_id, d.strength, d.is_online) for d in self.divisions.list_all()
        }
        blocked = self._blocked_slot_ids()

        if not sessions:
            return {
                "sessions_requested": 0,
                "sessions_scheduled": 0,
                "entries_created": 0,
                "solver_status": "NO_ASSIGNMENTS",
                "duration_seconds": 0.0,
                "message": "No subject-faculty assignments exist yet — nothing to schedule. "
                "Add assignments in Admin > Assignments first.",
            }

        result: GenerationResult = generate_timetable(
            sessions, time_slots, rooms, divisions, blocked, time_limit_seconds
        )

        entries_created = self._persist(result)

        return {
            "sessions_requested": result.sessions_requested,
            "sessions_scheduled": result.sessions_scheduled,
            "entries_created": entries_created,
            "solver_status": result.solver_status,
            "duration_seconds": result.duration_seconds,
            "message": None,
        }

    def _persist(self, result: GenerationResult) -> int:
        """Soft-deletes the previous timetable (is_active=False, kept for
        audit history per the Phase 2 schema's design) and inserts fresh
        entries for the new one, all in a single transaction."""
        self.db.query(TimetableEntry).filter(
            TimetableEntry.academic_term == ACADEMIC_TERM, TimetableEntry.is_active.is_(True)
        ).update({TimetableEntry.is_active: False})

        entry_type_map = {"lecture": EntryType.lecture, "tutorial": EntryType.tutorial, "lab": EntryType.lab}
        count = 0
        for e in result.entries:
            entry_type = entry_type_map[e.session_type]
            slot_ids = [e.time_slot_id] + ([e.second_time_slot_id] if e.second_time_slot_id else [])
            for slot_id in slot_ids:
                self.db.add(
                    TimetableEntry(
                        time_slot_id=slot_id,
                        division_id=e.division_id,
                        subject_id=e.subject_id,
                        faculty_id=e.faculty_id,
                        room_id=e.room_id,
                        entry_type=entry_type,
                        academic_term=ACADEMIC_TERM,
                        is_active=True,
                    )
                )
                count += 1
        self.db.commit()
        return count

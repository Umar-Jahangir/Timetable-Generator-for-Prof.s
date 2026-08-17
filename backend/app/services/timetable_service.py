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
from app.scheduling.constraints import (
    get_blocked_slot_ids,
    get_division_blocked_slot_ids,
    get_max_daily_break_config,
)
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

    def _division_blocked_slot_ids(self) -> dict[int, set[int]]:
        return get_division_blocked_slot_ids(self.db)

    def _build_sessions(self) -> list[SessionRequirement]:
        sessions: list[SessionRequirement] = []
        for a in self.assignments.list_all():
            subject = a.subject
            delivery_type = a.delivery_type.value
            if delivery_type == "theory":
                session_type, count = "lecture", subject.lectures_per_week
            elif delivery_type == "tutorial":
                session_type, count = "tutorial", subject.tutorials_per_week
            else:
                # Labs run in two-consecutive-slot blocks.
                session_type, count = "lab", subject.lab_hours_per_week // 2

            for i in range(count):
                sessions.append(
                    SessionRequirement(
                        a.assignment_id,
                        a.subject_id,
                        a.faculty_id,
                        a.division_id,
                        a.batch_id,
                        a.batch.strength if a.batch else None,
                        session_type,
                        subject.is_industrial_elective,
                        a.is_online or subject.is_online,
                        i,
                    )
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
        division_blocked = self._division_blocked_slot_ids()
        max_daily_break = get_max_daily_break_config(self.db)

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
            sessions,
            time_slots,
            rooms,
            divisions,
            blocked,
            time_limit_seconds,
            division_blocked,
            max_daily_break,
        )

        entries_created = self._persist(result)

        # Reset per-division admin reviews to pending for every division
        # that received at least one entry in this generation.
        division_ids = sorted({e.division_id for e in result.entries})
        from app.services.timetable_review_service import TimetableReviewService

        TimetableReviewService(self.db).reset_pending_for_generated_divisions(division_ids)

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
                        batch_id=e.batch_id,
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

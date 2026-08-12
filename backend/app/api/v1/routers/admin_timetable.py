from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.api.v1.deps import require_role
from app.db.session import get_db
from app.models.faculty import Faculty
from app.models.timetable_entry import TimetableEntry
from app.models.user import User, UserRole
from app.schemas.timetable import AdminTimetableEntryOut, GenerationResultOut
from app.services.timetable_service import ACADEMIC_TERM, TimetableService

router = APIRouter(prefix="/admin/timetable", tags=["Admin - Timetable"])


def _to_out(entry: TimetableEntry) -> AdminTimetableEntryOut:
    return AdminTimetableEntryOut(
        entry_id=entry.entry_id,
        day_of_week=entry.time_slot.day_of_week,
        start_time=entry.time_slot.start_time,
        end_time=entry.time_slot.end_time,
        entry_type=entry.entry_type,
        subject_name=entry.subject.name if entry.subject else None,
        faculty_name=entry.faculty.user.name if entry.faculty and entry.faculty.user else None,
        division_name=entry.division.name if entry.division else None,
        room_name=entry.room.name if entry.room else None,
    )


@router.post("/generate", response_model=GenerationResultOut)
def generate_timetable(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    """
    Runs the CP-SAT optimizer against every current subject-faculty
    assignment and persists the result, replacing (soft-deleting) any
    previous timetable for the same academic term. See
    app/scheduling/optimizer.py for the full, honestly-stated scope of
    what this v1 engine does and doesn't enforce.
    """
    result = TimetableService(db).generate()
    return GenerationResultOut(**result)


@router.get("", response_model=list[AdminTimetableEntryOut])
def get_timetable(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    entries = (
        db.query(TimetableEntry)
        .options(
            joinedload(TimetableEntry.time_slot),
            joinedload(TimetableEntry.subject),
            joinedload(TimetableEntry.division),
            joinedload(TimetableEntry.room),
            joinedload(TimetableEntry.faculty).joinedload(Faculty.user),
        )
        .filter(TimetableEntry.academic_term == ACADEMIC_TERM, TimetableEntry.is_active.is_(True))
        .all()
    )
    return [_to_out(e) for e in entries]

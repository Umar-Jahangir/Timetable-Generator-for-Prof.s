from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.api.v1.deps import require_role
from app.db.session import get_db
from app.models.division import Division
from app.models.faculty import Faculty
from app.models.timetable_entry import TimetableEntry
from app.models.user import User, UserRole
from app.schemas.timetable import AdminTimetableEntryOut, GenerationResultOut
from app.schemas.timetable_review import (
    DivisionReviewOut,
    DivisionReviewReject,
    DivisionReviewRejectResult,
)
from app.services.timetable_review_service import TimetableReviewService
from app.services.timetable_service import ACADEMIC_TERM, TimetableService

router = APIRouter(prefix="/admin/timetable", tags=["Admin - Timetable"])


def _division_label(division: Division | None) -> str | None:
    if division is None:
        return None
    year = division.academic_year.name if division.academic_year else "Year"
    return f"{year}-{division.name}"


def _to_out(entry: TimetableEntry) -> AdminTimetableEntryOut:
    return AdminTimetableEntryOut(
        entry_id=entry.entry_id,
        day_of_week=entry.time_slot.day_of_week,
        start_time=entry.time_slot.start_time,
        end_time=entry.time_slot.end_time,
        entry_type=entry.entry_type,
        is_extra=bool(entry.is_extra),
        division_id=entry.division_id,
        subject_code=entry.subject.code if entry.subject else None,
        subject_name=entry.subject.name if entry.subject else None,
        faculty_name=entry.faculty.user.name if entry.faculty and entry.faculty.user else None,
        division_name=entry.division.name if entry.division else None,
        division_label=_division_label(entry.division),
        batch_name=entry.batch.name if entry.batch else None,
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
            joinedload(TimetableEntry.division).joinedload(Division.academic_year),
            joinedload(TimetableEntry.batch),
            joinedload(TimetableEntry.room),
            joinedload(TimetableEntry.faculty).joinedload(Faculty.user),
        )
        .filter(TimetableEntry.academic_term == ACADEMIC_TERM, TimetableEntry.is_active.is_(True))
        .all()
    )
    return [_to_out(e) for e in entries]


@router.get("/reviews", response_model=list[DivisionReviewOut])
def list_division_reviews(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    """Per-division approve/reject queue for the current generated timetable."""
    return TimetableReviewService(db).list_reviews()


@router.post("/reviews/{division_id}/approve", response_model=DivisionReviewOut)
def approve_division_timetable(
    division_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return TimetableReviewService(db).approve(division_id)


@router.post("/reviews/{division_id}/reject", response_model=DivisionReviewRejectResult)
def reject_division_timetable(
    division_id: int,
    payload: DivisionReviewReject,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    """
    Reject a division's timetable. Requires a reason. follow_up options:
    - none: record reason + suggest a constraint draft
    - suggest_constraint: same, emphasized for Constraints page
    - regenerate: apply an enforceable inferred constraint when possible, then regenerate all
    """
    return TimetableReviewService(db).reject(division_id, payload)

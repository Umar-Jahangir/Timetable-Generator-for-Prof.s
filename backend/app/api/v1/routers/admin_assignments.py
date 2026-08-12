from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.v1.deps import require_role
from app.db.session import get_db
from app.models.subject_faculty_assignment import SubjectFacultyAssignment
from app.models.user import User, UserRole
from app.schemas.assignment import AssignmentCreate, AssignmentOut
from app.services.assignment_service import AssignmentService

router = APIRouter(prefix="/admin/assignments", tags=["Admin - Assignments"])


def _to_out(a: SubjectFacultyAssignment) -> AssignmentOut:
    return AssignmentOut(
        assignment_id=a.assignment_id,
        subject_id=a.subject_id,
        faculty_id=a.faculty_id,
        division_id=a.division_id,
        academic_term=a.academic_term,
        subject_name=a.subject.name if a.subject else None,
        faculty_name=a.faculty.user.name if a.faculty and a.faculty.user else None,
        division_name=a.division.name if a.division else None,
    )


@router.get("", response_model=list[AssignmentOut])
def list_assignments(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return [_to_out(a) for a in AssignmentService(db).list_assignments()]


@router.post("", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
def create_assignment(
    payload: AssignmentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    """
    Assigns a faculty member to teach a subject to a division. This is
    the essential input the Phase 6 optimizer reads — without at least
    one assignment, there's nothing to generate a timetable from.
    """
    assignment = AssignmentService(db).create_assignment(payload)
    return _to_out(assignment)


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    AssignmentService(db).delete_assignment(assignment_id)

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.v1.deps import require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.faculty import FacultyCreate, FacultyCreateResponse, FacultyOut, FacultyUpdate
from app.services.faculty_service import FacultyService

router = APIRouter(prefix="/admin/faculty", tags=["Admin - Faculty"])


@router.get("", response_model=list[FacultyOut])
def list_faculty(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return FacultyService(db).list_faculty()


@router.post("", response_model=FacultyCreateResponse, status_code=status.HTTP_201_CREATED)
def create_faculty(
    payload: FacultyCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    """
    Creates a new login (`users`) + faculty profile (`faculty`) in one
    transaction. A random temporary password is generated and returned
    exactly once in the response — there is no email/notification
    service yet (that's a natural fit for a later phase), so the admin
    must relay it to the new faculty member manually for now.
    """
    faculty, temp_password = FacultyService(db).create_faculty(payload)
    return FacultyCreateResponse(faculty=faculty, temporary_password=temp_password)


@router.get("/{faculty_id}", response_model=FacultyOut)
def get_faculty(
    faculty_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return FacultyService(db).get_faculty(faculty_id)


@router.put("/{faculty_id}", response_model=FacultyOut)
def update_faculty(
    faculty_id: int,
    payload: FacultyUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return FacultyService(db).update_faculty(faculty_id, payload)


@router.delete("/{faculty_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_faculty(
    faculty_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    FacultyService(db).delete_faculty(faculty_id)

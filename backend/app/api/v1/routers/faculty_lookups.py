from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.repositories.division_repository import DivisionRepository
from app.repositories.subject_repository import SubjectRepository
from app.schemas.division import DivisionOut
from app.schemas.subject import SubjectOut

router = APIRouter(prefix="/faculty/lookups", tags=["Faculty - Lookups"])

# NOTE: unlike admin_subjects.py / admin_divisions.py, these use plain
# get_current_user (no role restriction) rather than
# require_role(UserRole.admin) — subject/division names aren't
# sensitive, and faculty need to read them to populate the "Request
# Extra/Replacement Lecture" form's dropdowns. Only the admin_* routers
# allow *mutating* this data.


@router.get("/subjects", response_model=list[SubjectOut])
def list_subjects_for_faculty(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return SubjectRepository(db).list_all()


@router.get("/divisions", response_model=list[DivisionOut])
def list_divisions_for_faculty(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return DivisionRepository(db).list_all()

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.v1.deps import require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.subject import SubjectCreate, SubjectOut, SubjectUpdate
from app.services.subject_service import SubjectService

router = APIRouter(prefix="/admin/subjects", tags=["Admin - Subjects"])


@router.get("", response_model=list[SubjectOut])
def list_subjects(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return SubjectService(db).list_subjects()


@router.post("", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
def create_subject(
    payload: SubjectCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return SubjectService(db).create_subject(payload)


@router.get("/{subject_id}", response_model=SubjectOut)
def get_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return SubjectService(db).get_subject(subject_id)


@router.put("/{subject_id}", response_model=SubjectOut)
def update_subject(
    subject_id: int,
    payload: SubjectUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return SubjectService(db).update_subject(subject_id, payload)


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    SubjectService(db).delete_subject(subject_id)

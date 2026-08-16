from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.v1.deps import require_role
from app.db.session import get_db
from app.models.batch import Batch
from app.models.user import User, UserRole
from app.schemas.batch import BatchOut
from app.schemas.division import DivisionCreate, DivisionOut, DivisionUpdate
from app.services.division_service import DivisionService

router = APIRouter(prefix="/admin/divisions", tags=["Admin - Divisions"])


@router.get("", response_model=list[DivisionOut])
def list_divisions(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return DivisionService(db).list_divisions()


@router.get("/{division_id}/batches", response_model=list[BatchOut])
def list_division_batches(
    division_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    DivisionService(db).get_division(division_id)
    return (
        db.query(Batch)
        .filter(Batch.division_id == division_id)
        .order_by(Batch.name)
        .all()
    )


@router.post("", response_model=DivisionOut, status_code=status.HTTP_201_CREATED)
def create_division(
    payload: DivisionCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return DivisionService(db).create_division(payload)


@router.get("/{division_id}", response_model=DivisionOut)
def get_division(
    division_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return DivisionService(db).get_division(division_id)


@router.put("/{division_id}", response_model=DivisionOut)
def update_division(
    division_id: int,
    payload: DivisionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return DivisionService(db).update_division(division_id, payload)


@router.delete("/{division_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_division(
    division_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    DivisionService(db).delete_division(division_id)

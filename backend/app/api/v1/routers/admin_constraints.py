from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.v1.deps import require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.constraint import ConstraintCreate, ConstraintOut, ConstraintUpdate
from app.services.constraint_service import ConstraintService

router = APIRouter(prefix="/admin/constraints", tags=["Admin - Constraints"])


@router.get("", response_model=list[ConstraintOut])
def list_constraints(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return ConstraintService(db).list_constraints()


@router.post("", response_model=ConstraintOut, status_code=status.HTTP_201_CREATED)
def create_constraint(
    payload: ConstraintCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return ConstraintService(db).create_constraint(payload)


@router.get("/{constraint_id}", response_model=ConstraintOut)
def get_constraint(
    constraint_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return ConstraintService(db).get_constraint(constraint_id)


@router.put("/{constraint_id}", response_model=ConstraintOut)
def update_constraint(
    constraint_id: int,
    payload: ConstraintUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return ConstraintService(db).update_constraint(constraint_id, payload)


@router.delete("/{constraint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_constraint(
    constraint_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    ConstraintService(db).delete_constraint(constraint_id)

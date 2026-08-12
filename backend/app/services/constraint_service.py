from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.constraint import SchedulingConstraint
from app.repositories.constraint_repository import ConstraintRepository
from app.schemas.constraint import ConstraintCreate, ConstraintUpdate


class ConstraintService:
    def __init__(self, db: Session):
        self.db = db
        self.constraints = ConstraintRepository(db)

    def list_constraints(self) -> list[SchedulingConstraint]:
        return self.constraints.list_all()

    def get_constraint(self, constraint_id: int) -> SchedulingConstraint:
        constraint = self.constraints.get_by_id(constraint_id)
        if not constraint:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Constraint not found.")
        return constraint

    def create_constraint(self, payload: ConstraintCreate) -> SchedulingConstraint:
        return self.constraints.create(**payload.model_dump())

    def update_constraint(self, constraint_id: int, payload: ConstraintUpdate) -> SchedulingConstraint:
        constraint = self.get_constraint(constraint_id)
        return self.constraints.update(constraint, **payload.model_dump(exclude_unset=True))

    def delete_constraint(self, constraint_id: int) -> None:
        constraint = self.get_constraint(constraint_id)
        self.constraints.delete(constraint)

from typing import Optional

from sqlalchemy.orm import Session

from app.models.constraint import SchedulingConstraint


class ConstraintRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_all(self) -> list[SchedulingConstraint]:
        return self.db.query(SchedulingConstraint).order_by(SchedulingConstraint.constraint_id).all()

    def get_by_id(self, constraint_id: int) -> Optional[SchedulingConstraint]:
        return (
            self.db.query(SchedulingConstraint)
            .filter(SchedulingConstraint.constraint_id == constraint_id)
            .first()
        )

    def create(self, **fields) -> SchedulingConstraint:
        constraint = SchedulingConstraint(**fields)
        self.db.add(constraint)
        self.db.commit()
        self.db.refresh(constraint)
        return constraint

    def update(self, constraint: SchedulingConstraint, **fields) -> SchedulingConstraint:
        for key, value in fields.items():
            if value is not None:
                setattr(constraint, key, value)
        self.db.commit()
        self.db.refresh(constraint)
        return constraint

    def delete(self, constraint: SchedulingConstraint) -> None:
        self.db.delete(constraint)
        self.db.commit()

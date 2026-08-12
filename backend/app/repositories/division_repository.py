from typing import Optional

from sqlalchemy.orm import Session

from app.models.division import Division


class DivisionRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_all(self) -> list[Division]:
        return self.db.query(Division).order_by(Division.division_id).all()

    def get_by_id(self, division_id: int) -> Optional[Division]:
        return self.db.query(Division).filter(Division.division_id == division_id).first()

    def find_duplicate(
        self, academic_year_id: int, department_id: int, name: str, exclude_id: Optional[int] = None
    ) -> Optional[Division]:
        query = self.db.query(Division).filter(
            Division.academic_year_id == academic_year_id,
            Division.department_id == department_id,
            Division.name == name,
        )
        if exclude_id is not None:
            query = query.filter(Division.division_id != exclude_id)
        return query.first()

    def create(self, **fields) -> Division:
        division = Division(**fields)
        self.db.add(division)
        self.db.commit()
        self.db.refresh(division)
        return division

    def update(self, division: Division, **fields) -> Division:
        for key, value in fields.items():
            if value is not None:
                setattr(division, key, value)
        self.db.commit()
        self.db.refresh(division)
        return division

    def delete(self, division: Division) -> None:
        self.db.delete(division)
        self.db.commit()

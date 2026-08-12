from sqlalchemy.orm import Session

from app.models.academic_year import AcademicYear
from app.models.department import Department


class LookupRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_departments(self) -> list[Department]:
        return self.db.query(Department).order_by(Department.name).all()

    def list_academic_years(self) -> list[AcademicYear]:
        return self.db.query(AcademicYear).order_by(AcademicYear.year_order).all()

    def department_exists(self, department_id: int) -> bool:
        return self.db.query(Department).filter(Department.department_id == department_id).first() is not None

    def academic_year_exists(self, academic_year_id: int) -> bool:
        return (
            self.db.query(AcademicYear).filter(AcademicYear.academic_year_id == academic_year_id).first()
            is not None
        )

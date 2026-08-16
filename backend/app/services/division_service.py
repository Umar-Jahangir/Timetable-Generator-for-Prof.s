from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.batch import Batch
from app.models.division import Division
from app.repositories.division_repository import DivisionRepository
from app.repositories.lookup_repository import LookupRepository
from app.schemas.division import DivisionCreate, DivisionUpdate


class DivisionService:
    def __init__(self, db: Session):
        self.db = db
        self.divisions = DivisionRepository(db)
        self.lookups = LookupRepository(db)

    def list_divisions(self) -> list[Division]:
        return self.divisions.list_all()

    def get_division(self, division_id: int) -> Division:
        division = self.divisions.get_by_id(division_id)
        if not division:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Division not found.")
        return division

    def create_division(self, payload: DivisionCreate) -> Division:
        if not self.lookups.academic_year_exists(payload.academic_year_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown academic_year_id.")
        if not self.lookups.department_exists(payload.department_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown department_id.")
        if self.divisions.find_duplicate(payload.academic_year_id, payload.department_id, payload.name):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A division with this year, department, and name already exists.",
            )
        division = Division(**payload.model_dump())
        self.db.add(division)
        self.db.flush()

        # Lab and tutorial sessions are always batch-based. Split the
        # division as evenly as possible, assigning any remainder to B1/B2.
        strength = division.strength
        batch_strengths = [None, None, None] if strength is None else [
            (strength + 2) // 3,
            (strength + 1) // 3,
            strength // 3,
        ]
        self.db.add_all(
            [
                Batch(division_id=division.division_id, name=f"B{index}", strength=batch_strength)
                for index, batch_strength in enumerate(batch_strengths, start=1)
            ]
        )
        self.db.commit()
        self.db.refresh(division)
        return division

    def update_division(self, division_id: int, payload: DivisionUpdate) -> Division:
        division = self.get_division(division_id)

        academic_year_id = payload.academic_year_id or division.academic_year_id
        department_id = payload.department_id or division.department_id
        name = payload.name or division.name

        if payload.academic_year_id is not None and not self.lookups.academic_year_exists(payload.academic_year_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown academic_year_id.")
        if payload.department_id is not None and not self.lookups.department_exists(payload.department_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown department_id.")

        duplicate = self.divisions.find_duplicate(academic_year_id, department_id, name, exclude_id=division_id)
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A division with this year, department, and name already exists.",
            )

        return self.divisions.update(division, **payload.model_dump(exclude_unset=True))

    def delete_division(self, division_id: int) -> None:
        division = self.get_division(division_id)
        self.divisions.delete(division)

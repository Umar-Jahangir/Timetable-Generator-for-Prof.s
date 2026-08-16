from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.academic_year import AcademicYear
from app.models.subject import Subject
from app.repositories.lookup_repository import LookupRepository
from app.repositories.subject_repository import SubjectRepository
from app.schemas.subject import SubjectCreate, SubjectUpdate


class SubjectService:
    def __init__(self, db: Session):
        self.db = db
        self.subjects = SubjectRepository(db)
        self.lookups = LookupRepository(db)

    def list_subjects(self) -> list[Subject]:
        return self.subjects.list_all()

    def get_subject(self, subject_id: int) -> Subject:
        subject = self.subjects.get_by_id(subject_id)
        if not subject:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")
        return subject

    def _validate_lookups(self, academic_year_id: int | None, department_id: int | None) -> None:
        if academic_year_id is not None and not self.lookups.academic_year_exists(academic_year_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown academic_year_id.")
        if department_id is not None and not self.lookups.department_exists(department_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown department_id.")

    def _validate_industrial_elective(self, academic_year_id: int, is_industrial_elective: bool) -> None:
        if not is_industrial_elective:
            return
        academic_year = self.db.query(AcademicYear).filter(
            AcademicYear.academic_year_id == academic_year_id
        ).first()
        if not academic_year or academic_year.name != "TY":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Industrial electives can only be assigned to TY subjects.",
            )

    def create_subject(self, payload: SubjectCreate) -> Subject:
        if self.subjects.get_by_code(payload.code):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A subject with code '{payload.code}' already exists.",
            )
        self._validate_lookups(payload.academic_year_id, payload.department_id)
        self._validate_industrial_elective(payload.academic_year_id, payload.is_industrial_elective)
        return self.subjects.create(**payload.model_dump())

    def update_subject(self, subject_id: int, payload: SubjectUpdate) -> Subject:
        subject = self.get_subject(subject_id)
        self._validate_lookups(payload.academic_year_id, payload.department_id)
        self._validate_industrial_elective(
            payload.academic_year_id or subject.academic_year_id,
            payload.is_industrial_elective
            if payload.is_industrial_elective is not None
            else subject.is_industrial_elective,
        )

        if payload.code is not None and payload.code != subject.code:
            existing = self.subjects.get_by_code(payload.code)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A subject with code '{payload.code}' already exists.",
                )

        return self.subjects.update(subject, **payload.model_dump(exclude_unset=True))

    def delete_subject(self, subject_id: int) -> None:
        subject = self.get_subject(subject_id)
        self.subjects.delete(subject)

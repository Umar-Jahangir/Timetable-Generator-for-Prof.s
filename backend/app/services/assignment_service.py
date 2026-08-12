from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.subject_faculty_assignment import SubjectFacultyAssignment
from app.repositories.assignment_repository import AssignmentRepository
from app.repositories.faculty_repository import FacultyRepository
from app.repositories.lookup_repository import LookupRepository
from app.repositories.subject_repository import SubjectRepository
from app.schemas.assignment import AssignmentCreate


class AssignmentService:
    def __init__(self, db: Session):
        self.db = db
        self.assignments = AssignmentRepository(db)
        self.faculty_repo = FacultyRepository(db)
        self.subject_repo = SubjectRepository(db)

    def list_assignments(self) -> list[SubjectFacultyAssignment]:
        return self.assignments.list_all()

    def create_assignment(self, payload: AssignmentCreate) -> SubjectFacultyAssignment:
        if not self.subject_repo.get_by_id(payload.subject_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown subject_id.")
        if not self.faculty_repo.get_by_id(payload.faculty_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown faculty_id.")
        if self.assignments.find_duplicate(payload.subject_id, payload.division_id, payload.academic_term):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This subject is already assigned to this division for this term.",
            )
        return self.assignments.create(**payload.model_dump())

    def delete_assignment(self, assignment_id: int) -> None:
        assignment = self.assignments.get_by_id(assignment_id)
        if not assignment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
        self.assignments.delete(assignment)

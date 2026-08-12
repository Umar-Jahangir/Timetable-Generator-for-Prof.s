from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.faculty import Faculty
from app.models.subject_faculty_assignment import SubjectFacultyAssignment


class AssignmentRepository:
    def __init__(self, db: Session):
        self.db = db

    def _with_relations(self):
        return self.db.query(SubjectFacultyAssignment).options(
            joinedload(SubjectFacultyAssignment.subject),
            joinedload(SubjectFacultyAssignment.division),
            joinedload(SubjectFacultyAssignment.faculty).joinedload(Faculty.user),
        )

    def list_all(self) -> list[SubjectFacultyAssignment]:
        return self._with_relations().order_by(SubjectFacultyAssignment.assignment_id).all()

    def get_by_id(self, assignment_id: int) -> Optional[SubjectFacultyAssignment]:
        return self._with_relations().filter(SubjectFacultyAssignment.assignment_id == assignment_id).first()

    def find_duplicate(
        self, subject_id: int, division_id: int, academic_term: str
    ) -> Optional[SubjectFacultyAssignment]:
        return (
            self.db.query(SubjectFacultyAssignment)
            .filter(
                SubjectFacultyAssignment.subject_id == subject_id,
                SubjectFacultyAssignment.division_id == division_id,
                SubjectFacultyAssignment.academic_term == academic_term,
                SubjectFacultyAssignment.batch_id.is_(None),
            )
            .first()
        )

    def create(self, **fields) -> SubjectFacultyAssignment:
        assignment = SubjectFacultyAssignment(**fields)
        self.db.add(assignment)
        self.db.commit()
        self.db.refresh(assignment)
        return self.get_by_id(assignment.assignment_id)

    def delete(self, assignment: SubjectFacultyAssignment) -> None:
        self.db.delete(assignment)
        self.db.commit()

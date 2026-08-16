from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.division import Division
from app.models.faculty import Faculty
from app.models.subject_faculty_assignment import SubjectFacultyAssignment


class AssignmentRepository:
    def __init__(self, db: Session):
        self.db = db

    def _with_relations(self):
        return self.db.query(SubjectFacultyAssignment).options(
            joinedload(SubjectFacultyAssignment.subject),
            joinedload(SubjectFacultyAssignment.division).joinedload(Division.academic_year),
            joinedload(SubjectFacultyAssignment.faculty).joinedload(Faculty.user),
            joinedload(SubjectFacultyAssignment.batch),
        )

    def list_all(self) -> list[SubjectFacultyAssignment]:
        return (
            self._with_relations()
            .order_by(SubjectFacultyAssignment.display_order, SubjectFacultyAssignment.assignment_id)
            .all()
        )

    def next_display_order(self) -> int:
        current_max = self.db.query(SubjectFacultyAssignment.display_order).order_by(
            SubjectFacultyAssignment.display_order.desc()
        ).first()
        return (current_max[0] if current_max and current_max[0] is not None else 0) + 1

    def get_by_id(self, assignment_id: int) -> Optional[SubjectFacultyAssignment]:
        return self._with_relations().filter(SubjectFacultyAssignment.assignment_id == assignment_id).first()

    def find_duplicate(
        self,
        subject_id: int,
        division_id: int,
        batch_id: int | None,
        delivery_type: str,
        academic_term: str,
        exclude_id: int | None = None,
    ) -> Optional[SubjectFacultyAssignment]:
        query = (
            self.db.query(SubjectFacultyAssignment)
            .filter(
                SubjectFacultyAssignment.subject_id == subject_id,
                SubjectFacultyAssignment.division_id == division_id,
                SubjectFacultyAssignment.academic_term == academic_term,
                SubjectFacultyAssignment.delivery_type == delivery_type,
                (
                    SubjectFacultyAssignment.batch_id.is_(None)
                    if batch_id is None
                    else SubjectFacultyAssignment.batch_id == batch_id
                ),
            )
        )
        if exclude_id is not None:
            query = query.filter(SubjectFacultyAssignment.assignment_id != exclude_id)
        return query.first()

    def create(self, **fields) -> SubjectFacultyAssignment:
        assignment = SubjectFacultyAssignment(**fields)
        self.db.add(assignment)
        self.db.commit()
        self.db.refresh(assignment)
        return self.get_by_id(assignment.assignment_id)

    def delete(self, assignment: SubjectFacultyAssignment) -> None:
        self.db.delete(assignment)
        self.db.commit()

    def update(self, assignment: SubjectFacultyAssignment, **fields) -> SubjectFacultyAssignment:
        for key, value in fields.items():
            setattr(assignment, key, value)
        self.db.commit()
        self.db.refresh(assignment)
        return self.get_by_id(assignment.assignment_id)

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.batch import Batch
from app.models.subject_faculty_assignment import DeliveryType
from app.models.subject_faculty_assignment import SubjectFacultyAssignment
from app.repositories.assignment_repository import AssignmentRepository
from app.repositories.faculty_repository import FacultyRepository
from app.repositories.lookup_repository import LookupRepository
from app.repositories.subject_repository import SubjectRepository
from app.schemas.assignment import AssignmentCreate, AssignmentReorder, AssignmentUpdate


class AssignmentService:
    def __init__(self, db: Session):
        self.db = db
        self.assignments = AssignmentRepository(db)
        self.faculty_repo = FacultyRepository(db)
        self.subject_repo = SubjectRepository(db)

    def list_assignments(self) -> list[SubjectFacultyAssignment]:
        return self.assignments.list_all()

    def _validate_assignment(self, payload: AssignmentCreate, exclude_id: int | None = None) -> None:
        if not self.subject_repo.get_by_id(payload.subject_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown subject_id.")
        if not self.faculty_repo.get_by_id(payload.faculty_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown faculty_id.")
        if payload.delivery_type == DeliveryType.theory and payload.batch_id is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Theory assignments apply to the whole division and cannot have a batch_id.",
            )
        if payload.delivery_type in (DeliveryType.lab, DeliveryType.tutorial) and payload.batch_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lab and tutorial assignments require a batch_id.",
            )
        if payload.batch_id is not None:
            batch = self.db.query(Batch).filter(Batch.batch_id == payload.batch_id).first()
            if not batch:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown batch_id.")
            if batch.division_id != payload.division_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The selected batch does not belong to this division.",
                )
        if self.assignments.find_duplicate(
            payload.subject_id,
            payload.division_id,
            payload.batch_id,
            payload.delivery_type,
            payload.academic_term,
            exclude_id,
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This subject delivery type is already assigned to this division/batch for this term.",
            )

    def create_assignment(self, payload: AssignmentCreate) -> SubjectFacultyAssignment:
        self._validate_assignment(payload)
        fields = payload.model_dump()
        fields["display_order"] = self.assignments.next_display_order()
        return self.assignments.create(**fields)

    def update_assignment(self, assignment_id: int, payload: AssignmentUpdate) -> SubjectFacultyAssignment:
        assignment = self.assignments.get_by_id(assignment_id)
        if not assignment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
        self._validate_assignment(payload, exclude_id=assignment_id)
        return self.assignments.update(assignment, **payload.model_dump())

    def reorder_assignments(self, payload: AssignmentReorder) -> list[SubjectFacultyAssignment]:
        existing = {a.assignment_id: a for a in self.assignments.list_all()}
        if set(payload.assignment_ids) != set(existing.keys()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reorder list must include every assignment exactly once.",
            )
        for index, assignment_id in enumerate(payload.assignment_ids, start=1):
            existing[assignment_id].display_order = index
        self.db.commit()
        return self.assignments.list_all()

    def delete_assignment(self, assignment_id: int) -> None:
        assignment = self.assignments.get_by_id(assignment_id)
        if not assignment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
        self.assignments.delete(assignment)

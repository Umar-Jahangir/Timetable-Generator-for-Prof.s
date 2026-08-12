from typing import Optional

from pydantic import BaseModel


class AssignmentCreate(BaseModel):
    subject_id: int
    faculty_id: int
    division_id: int
    academic_term: str = "2026-ODD"


class AssignmentOut(BaseModel):
    assignment_id: int
    subject_id: int
    faculty_id: int
    division_id: int
    academic_term: str
    # Denormalized for display — avoids extra frontend lookups.
    subject_name: Optional[str] = None
    faculty_name: Optional[str] = None
    division_name: Optional[str] = None

    model_config = {"from_attributes": True}

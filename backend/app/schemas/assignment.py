from typing import Optional

from pydantic import BaseModel, Field
from app.models.subject_faculty_assignment import DeliveryType


class AssignmentCreate(BaseModel):
    subject_id: int
    faculty_id: int
    division_id: int
    batch_id: Optional[int] = None
    delivery_type: DeliveryType
    is_online: bool = False
    academic_term: str = "2026-ODD"


class AssignmentUpdate(AssignmentCreate):
    """Assignment edits replace the complete scheduling definition."""


class AssignmentReorder(BaseModel):
    assignment_ids: list[int] = Field(min_length=1)


class AssignmentOut(BaseModel):
    assignment_id: int
    subject_id: int
    faculty_id: int
    division_id: int
    batch_id: Optional[int]
    delivery_type: DeliveryType
    is_online: bool = False
    academic_term: str
    display_order: int = 0
    # Denormalized for display — avoids extra frontend lookups.
    subject_name: Optional[str] = None
    faculty_name: Optional[str] = None
    division_name: Optional[str] = None
    division_label: Optional[str] = None
    batch_name: Optional[str] = None

    model_config = {"from_attributes": True}

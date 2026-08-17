from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.models.division_timetable_review import ReviewFollowUp, ReviewStatus
from app.models.constraint import ConstraintType


class DivisionReviewOut(BaseModel):
    review_id: int
    division_id: int
    academic_term: str
    status: ReviewStatus
    rejection_reason: Optional[str] = None
    follow_up: ReviewFollowUp = ReviewFollowUp.none
    suggested_constraint: Optional[dict[str, Any]] = None
    reviewed_at: Optional[datetime] = None
    division_label: Optional[str] = None
    entry_count: int = 0

    model_config = {"from_attributes": True}


class DivisionReviewApprove(BaseModel):
    pass


class DivisionReviewReject(BaseModel):
    reason: str = Field(min_length=5, max_length=500)
    follow_up: ReviewFollowUp = Field(
        description="none = record reason only; regenerate = apply inferred constraint if possible and regenerate; suggest_constraint = return a draft for Constraints page"
    )


class SuggestedConstraintOut(BaseModel):
    name: str
    constraint_type: ConstraintType
    config: dict[str, Any]
    explanation: str
    auto_applied: bool = False


class DivisionReviewRejectResult(BaseModel):
    review: DivisionReviewOut
    suggestion: Optional[SuggestedConstraintOut] = None
    generation: Optional[dict[str, Any]] = None
    message: str

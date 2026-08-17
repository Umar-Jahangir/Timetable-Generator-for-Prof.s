from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel

from app.models.lecture_request import RequestStatus, RequestType


class LectureRequestCreate(BaseModel):
    subject_id: int
    division_id: int
    request_type: RequestType
    original_entry_id: Optional[int] = None  # set for "replacement" requests
    scheduled_date: Optional[date] = None


class LectureRequestOut(BaseModel):
    request_id: int
    faculty_id: int
    subject_id: int
    division_id: int
    request_type: RequestType
    status: RequestStatus
    requested_at: datetime
    scheduled_date: Optional[date] = None
    resolved_at: Optional[datetime]
    rejection_reason: Optional[str] = None
    recommended_time_slot_id: Optional[int] = None
    recommended_room_id: Optional[int] = None
    recommendation_score: Optional[float] = None
    recommended_day: Optional[str] = None
    recommended_start_time: Optional[str] = None
    recommended_end_time: Optional[str] = None
    recommended_room_name: Optional[str] = None
    # Denormalized display fields so the frontend doesn't need extra
    # lookups just to show "DBMS · TY-A · Prof. John Smith" in a list.
    subject_name: Optional[str] = None
    division_name: Optional[str] = None
    faculty_name: Optional[str] = None

    model_config = {"from_attributes": True}


class LectureRequestResolve(BaseModel):
    status: RequestStatus  # admin sets to "approved" or "rejected"
    rejection_reason: Optional[str] = None

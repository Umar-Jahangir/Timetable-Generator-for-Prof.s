from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class IntentBreakdown(BaseModel):
    intent: str
    count: int
    successful: int


class AnalyticsOut(BaseModel):
    # Utilization — real percentages computed from the current active timetable
    faculty_utilization_percent: float
    classroom_utilization_percent: float
    laboratory_utilization_percent: float
    student_idle_time_percent: float

    # Counts
    active_sessions_count: int
    pending_requests_count: int
    total_faculty_count: int

    # Assistant usage (Phase 7 data, only exists once queries have been made)
    assistant_queries_total: int
    assistant_queries_successful: int
    assistant_queries_by_intent: list[IntentBreakdown]

    # When the current active timetable was generated (None if never generated)
    last_generated_at: Optional[datetime]

from pydantic import BaseModel


class DashboardStatsOut(BaseModel):
    faculty_count: int
    subject_count: int
    classroom_count: int
    lab_count: int
    pending_requests: int

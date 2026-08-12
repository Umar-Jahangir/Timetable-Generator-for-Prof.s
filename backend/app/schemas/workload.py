from pydantic import BaseModel


class WorkloadOut(BaseModel):
    max_weekly_hours: int
    scheduled_hours: int
    utilization_percent: float
    entries_count: int

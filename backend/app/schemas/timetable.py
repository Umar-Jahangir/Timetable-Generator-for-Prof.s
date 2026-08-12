from datetime import time
from typing import Optional

from pydantic import BaseModel

from app.models.time_slot import DayOfWeek
from app.models.timetable_entry import EntryType


class GenerationResultOut(BaseModel):
    sessions_requested: int
    sessions_scheduled: int
    entries_created: int
    solver_status: str
    duration_seconds: float
    message: Optional[str] = None


class AdminTimetableEntryOut(BaseModel):
    entry_id: int
    day_of_week: DayOfWeek
    start_time: time
    end_time: time
    entry_type: EntryType
    subject_name: Optional[str] = None
    faculty_name: Optional[str] = None
    division_name: Optional[str] = None
    room_name: Optional[str] = None

    model_config = {"from_attributes": True}

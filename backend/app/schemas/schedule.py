from datetime import time
from typing import Optional

from pydantic import BaseModel

from app.models.time_slot import DayOfWeek
from app.models.timetable_entry import EntryType


class TimetableEntryOut(BaseModel):
    entry_id: int
    day_of_week: DayOfWeek
    start_time: time
    end_time: time
    entry_type: EntryType
    is_extra: bool = False
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    division_name: Optional[str] = None
    division_label: Optional[str] = None
    batch_name: Optional[str] = None
    room_name: Optional[str] = None

    model_config = {"from_attributes": True}

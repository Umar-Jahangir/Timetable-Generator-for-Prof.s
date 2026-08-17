from datetime import date, time

from pydantic import BaseModel, Field

from app.models.room import RoomType


class FreeRoomOut(BaseModel):
    room_id: int
    room_name: str
    room_type: RoomType
    capacity: int
    time_slot_id: int
    start_time: time
    end_time: time
    slot_order: int
    is_one_hour_lab: bool = False


class FreeRoomsOut(BaseModel):
    date: date
    day: str
    rooms_by_slot: list[FreeRoomOut]


class RoomReservationCreate(BaseModel):
    room_id: int
    time_slot_id: int
    scheduled_date: date
    subject_id: int
    division_id: int
    request_type: str = Field(default="extra", pattern="^(extra|replacement)$")

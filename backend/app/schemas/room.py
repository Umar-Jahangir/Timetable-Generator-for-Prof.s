from typing import Optional

from pydantic import BaseModel, Field

from app.models.room import RoomType


class RoomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=20)
    building: Optional[str] = Field(default=None, max_length=50)
    capacity: int = Field(ge=1, le=500)
    room_type: RoomType


class RoomUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=20)
    building: Optional[str] = Field(default=None, max_length=50)
    capacity: Optional[int] = Field(default=None, ge=1, le=500)
    room_type: Optional[RoomType] = None
    is_active: Optional[bool] = None


class RoomOut(BaseModel):
    room_id: int
    name: str
    building: Optional[str]
    capacity: int
    room_type: RoomType
    is_active: bool

    model_config = {"from_attributes": True}

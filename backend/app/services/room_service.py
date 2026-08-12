from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.room import Room, RoomType
from app.repositories.room_repository import RoomRepository
from app.schemas.room import RoomCreate, RoomUpdate


class RoomService:
    def __init__(self, db: Session):
        self.db = db
        self.rooms = RoomRepository(db)

    def list_rooms(self, room_type: Optional[RoomType] = None) -> list[Room]:
        return self.rooms.list_all(room_type)

    def get_room(self, room_id: int) -> Room:
        room = self.rooms.get_by_id(room_id)
        if not room:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")
        return room

    def create_room(self, payload: RoomCreate) -> Room:
        if self.rooms.get_by_name(payload.name):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A room named '{payload.name}' already exists.",
            )
        return self.rooms.create(**payload.model_dump())

    def update_room(self, room_id: int, payload: RoomUpdate) -> Room:
        room = self.get_room(room_id)
        if payload.name is not None and payload.name != room.name:
            existing = self.rooms.get_by_name(payload.name)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A room named '{payload.name}' already exists.",
                )
        return self.rooms.update(room, **payload.model_dump(exclude_unset=True))

    def delete_room(self, room_id: int) -> None:
        room = self.get_room(room_id)
        self.rooms.delete(room)

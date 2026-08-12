from typing import Optional

from sqlalchemy.orm import Session

from app.models.room import Room, RoomType


class RoomRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_all(self, room_type: Optional[RoomType] = None) -> list[Room]:
        query = self.db.query(Room)
        if room_type is not None:
            query = query.filter(Room.room_type == room_type)
        return query.order_by(Room.room_id).all()

    def get_by_id(self, room_id: int) -> Optional[Room]:
        return self.db.query(Room).filter(Room.room_id == room_id).first()

    def get_by_name(self, name: str) -> Optional[Room]:
        return self.db.query(Room).filter(Room.name == name).first()

    def count(self, room_type: Optional[RoomType] = None) -> int:
        query = self.db.query(Room)
        if room_type is not None:
            query = query.filter(Room.room_type == room_type)
        return query.count()

    def create(self, **fields) -> Room:
        room = Room(**fields)
        self.db.add(room)
        self.db.commit()
        self.db.refresh(room)
        return room

    def update(self, room: Room, **fields) -> Room:
        for key, value in fields.items():
            if value is not None:
                setattr(room, key, value)
        self.db.commit()
        self.db.refresh(room)
        return room

    def delete(self, room: Room) -> None:
        self.db.delete(room)
        self.db.commit()

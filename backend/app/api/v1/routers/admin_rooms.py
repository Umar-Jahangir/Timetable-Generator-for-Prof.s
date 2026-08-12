from typing import Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.v1.deps import require_role
from app.db.session import get_db
from app.models.room import RoomType
from app.models.user import User, UserRole
from app.schemas.room import RoomCreate, RoomOut, RoomUpdate
from app.services.room_service import RoomService

router = APIRouter(prefix="/admin/rooms", tags=["Admin - Rooms"])

# NOTE: this single router backs both the "Classroom Management" and
# "Laboratory Management" admin screens — they're the same underlying
# `rooms` table (see database/docs/er-diagram.md for why), just filtered
# by `room_type` via the query param below. The frontend's classrooms
# page calls GET /admin/rooms?room_type=classroom, and the laboratories
# page calls GET /admin/rooms?room_type=laboratory.


@router.get("", response_model=list[RoomOut])
def list_rooms(
    room_type: Optional[RoomType] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return RoomService(db).list_rooms(room_type)


@router.post("", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
def create_room(
    payload: RoomCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return RoomService(db).create_room(payload)


@router.get("/{room_id}", response_model=RoomOut)
def get_room(
    room_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return RoomService(db).get_room(room_id)


@router.put("/{room_id}", response_model=RoomOut)
def update_room(
    room_id: int,
    payload: RoomUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return RoomService(db).update_room(room_id, payload)


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(
    room_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    RoomService(db).delete_room(room_id)

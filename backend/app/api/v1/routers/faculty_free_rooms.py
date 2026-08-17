from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.v1.deps import require_role
from app.db.session import get_db
from app.models.lecture_request import LectureRequest, RequestType
from app.models.user import User, UserRole
from app.api.v1.routers.faculty_lecture_requests import _to_out
from app.schemas.free_rooms import FreeRoomsOut, RoomReservationCreate
from app.schemas.lecture_request import LectureRequestOut
from app.repositories.faculty_repository import FacultyRepository
from app.services.room_availability_service import RoomAvailabilityService

router = APIRouter(prefix="/faculty/free-rooms", tags=["Faculty - Free Rooms"])


@router.get("", response_model=FreeRoomsOut)
def list_free_rooms(
    scheduled_date: date,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.faculty)),
):
    return RoomAvailabilityService(db).free_rooms(scheduled_date)


@router.post("/reserve", response_model=LectureRequestOut, status_code=status.HTTP_201_CREATED)
def reserve_room(
    payload: RoomReservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.faculty)),
):
    faculty = FacultyRepository(db).get_by_user_id(current_user.user_id)
    if not faculty:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Faculty profile not found.")
    service = RoomAvailabilityService(db)
    room, slot = service.validate_reservation(faculty.faculty_id, payload)
    request = LectureRequest(
        faculty_id=faculty.faculty_id,
        subject_id=payload.subject_id,
        division_id=payload.division_id,
        request_type=RequestType(payload.request_type),
        recommended_time_slot_id=slot.time_slot_id,
        recommended_room_id=room.room_id,
        scheduled_date=payload.scheduled_date,
        requested_at=datetime.now(timezone.utc),
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return _to_out(request)

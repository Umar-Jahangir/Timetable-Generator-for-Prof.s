from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.v1.deps import require_role
from app.db.session import get_db
from app.models.lecture_request import LectureRequest
from app.models.user import User, UserRole
from app.schemas.lecture_request import LectureRequestCreate, LectureRequestOut
from app.services.lecture_request_service import LectureRequestService

router = APIRouter(prefix="/faculty/lecture-requests", tags=["Faculty - Lecture Requests"])


def _to_out(request: LectureRequest) -> LectureRequestOut:
    return LectureRequestOut(
        request_id=request.request_id,
        faculty_id=request.faculty_id,
        subject_id=request.subject_id,
        division_id=request.division_id,
        request_type=request.request_type,
        status=request.status,
        requested_at=request.requested_at,
        resolved_at=request.resolved_at,
        rejection_reason=request.rejection_reason,
        recommended_time_slot_id=request.recommended_time_slot_id,
        recommended_room_id=request.recommended_room_id,
        recommendation_score=float(request.recommendation_score) if request.recommendation_score is not None else None,
        recommended_day=request.recommended_time_slot.day_of_week.value if request.recommended_time_slot else None,
        recommended_start_time=(
            request.recommended_time_slot.start_time.strftime("%H:%M") if request.recommended_time_slot else None
        ),
        recommended_end_time=(
            request.recommended_time_slot.end_time.strftime("%H:%M") if request.recommended_time_slot else None
        ),
        recommended_room_name=request.recommended_room.name if request.recommended_room else None,
        subject_name=request.subject.name if request.subject else None,
        division_name=request.division.name if request.division else None,
        faculty_name=request.faculty.user.name if request.faculty and request.faculty.user else None,
    )


@router.get("", response_model=list[LectureRequestOut])
def list_my_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.faculty)),
):
    requests = LectureRequestService(db).list_own_requests(current_user.user_id)
    return [_to_out(r) for r in requests]


@router.post("", response_model=LectureRequestOut, status_code=status.HTTP_201_CREATED)
def create_lecture_request(
    payload: LectureRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.faculty)),
):
    """
    Submits an extra or replacement lecture request as 'pending'.
    Phase 5 scope is the plain submission + admin approve/reject flow
    (see admin_lecture_requests.py); the AI-recommended slot
    (`recommended_time_slot_id`, `recommended_room_id`,
    `recommendation_score`) is filled in by the Rule-Based Scheduling
    Assistant built in Phase 7 — this endpoint intentionally leaves
    those NULL for now.
    """
    request = LectureRequestService(db).create_request(current_user.user_id, payload)
    return _to_out(request)

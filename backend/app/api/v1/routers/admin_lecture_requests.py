from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.deps import require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.lecture_request import LectureRequestOut, LectureRequestResolve
from app.services.lecture_request_service import LectureRequestService
# Reuse the same denormalizing converter as the faculty-facing router so
# the two never drift out of sync.
from app.api.v1.routers.faculty_lecture_requests import _to_out

router = APIRouter(prefix="/admin/lecture-requests", tags=["Admin - Lecture Requests"])


@router.get("", response_model=list[LectureRequestOut])
def list_pending_requests(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    """Backs the Admin dashboard's "Pending Requests" count and the
    Extra/Replacement Lecture Approval screen."""
    requests = LectureRequestService(db).list_pending()
    return [_to_out(r) for r in requests]


@router.put("/{request_id}", response_model=LectureRequestOut)
def resolve_request(
    request_id: int,
    payload: LectureRequestResolve,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    request = LectureRequestService(db).resolve_request(request_id, payload.status)
    return _to_out(request)

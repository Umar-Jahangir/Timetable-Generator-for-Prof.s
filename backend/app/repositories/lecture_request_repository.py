from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.faculty import Faculty
from app.models.lecture_request import LectureRequest, RequestStatus


class LectureRequestRepository:
    def __init__(self, db: Session):
        self.db = db

    def _with_relations(self):
        return self.db.query(LectureRequest).options(
            joinedload(LectureRequest.subject),
            joinedload(LectureRequest.division),
            joinedload(LectureRequest.faculty).joinedload(Faculty.user),
            joinedload(LectureRequest.recommended_time_slot),
            joinedload(LectureRequest.recommended_room),
        )

    def list_for_faculty(self, faculty_id: int) -> list[LectureRequest]:
        return (
            self._with_relations()
            .filter(LectureRequest.faculty_id == faculty_id)
            .order_by(LectureRequest.requested_at.desc())
            .all()
        )

    def list_pending(self) -> list[LectureRequest]:
        return (
            self._with_relations()
            .filter(LectureRequest.status == RequestStatus.pending)
            .order_by(LectureRequest.requested_at.desc())
            .all()
        )

    def get_by_id(self, request_id: int) -> Optional[LectureRequest]:
        return self._with_relations().filter(LectureRequest.request_id == request_id).first()

    def create(self, **fields) -> LectureRequest:
        request = LectureRequest(
            status=RequestStatus.pending,
            requested_at=datetime.now(timezone.utc),
            **fields,
        )
        self.db.add(request)
        self.db.commit()
        self.db.refresh(request)
        return self.get_by_id(request.request_id)

    def resolve(self, request: LectureRequest, status: RequestStatus) -> LectureRequest:
        request.status = status
        request.resolved_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(request)
        return self.get_by_id(request.request_id)

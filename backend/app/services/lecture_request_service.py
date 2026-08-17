from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from datetime import datetime, timezone

from app.models.lecture_request import LectureRequest, RequestStatus
from app.models.timetable_entry import EntryType, TimetableEntry
from app.repositories.faculty_repository import FacultyRepository
from app.repositories.lecture_request_repository import LectureRequestRepository
from app.repositories.lookup_repository import LookupRepository
from app.repositories.subject_repository import SubjectRepository
from app.schemas.lecture_request import LectureRequestCreate


class LectureRequestService:
    def __init__(self, db: Session):
        self.db = db
        self.requests = LectureRequestRepository(db)
        self.faculty_repo = FacultyRepository(db)
        self.subject_repo = SubjectRepository(db)

    def create_request(self, user_id: int, payload: LectureRequestCreate) -> LectureRequest:
        faculty = self.faculty_repo.get_by_user_id(user_id)
        if not faculty:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty profile not found.")
        if not self.subject_repo.get_by_id(payload.subject_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown subject_id.")

        return self.requests.create(
            faculty_id=faculty.faculty_id,
            subject_id=payload.subject_id,
            division_id=payload.division_id,
            request_type=payload.request_type,
            original_entry_id=payload.original_entry_id,
        )

    def list_own_requests(self, user_id: int) -> list[LectureRequest]:
        faculty = self.faculty_repo.get_by_user_id(user_id)
        if not faculty:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty profile not found.")
        return self.requests.list_for_faculty(faculty.faculty_id)

    def list_pending(self) -> list[LectureRequest]:
        return self.requests.list_pending()

    def resolve_request(self, request_id: int, new_status: RequestStatus) -> LectureRequest:
        request = self.requests.get_by_id(request_id)
        if not request:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")
        if request.status != RequestStatus.pending:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Request has already been {request.status.value}.",
            )
        if new_status not in (RequestStatus.approved, RequestStatus.rejected):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Status must be 'approved' or 'rejected'.",
            )
        if new_status == RequestStatus.rejected:
            return self.requests.resolve(request, new_status)

        # Requests from Today's Schedule do not choose a room/time yet.
        # Keep their existing status-only approval flow; assistant-created
        # requests include a recommendation and are booked below.
        if request.recommended_time_slot_id is None or request.recommended_room_id is None:
            return self.requests.resolve(request, new_status)

        # The recommendation may have become unavailable while pending.
        # Check all clashes immediately before the approval creates its
        # timetable entry.
        conflict = (
            self.db.query(TimetableEntry.entry_id)
            .filter(
                TimetableEntry.is_active.is_(True),
                TimetableEntry.time_slot_id == request.recommended_time_slot_id,
                (
                    (TimetableEntry.faculty_id == request.faculty_id)
                    | (TimetableEntry.division_id == request.division_id)
                    | (TimetableEntry.room_id == request.recommended_room_id)
                ),
            )
            .first()
        )
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The recommended slot was taken while this request was pending. Reject it or ask the faculty to submit a new request.",
            )

        entry = TimetableEntry(
            time_slot_id=request.recommended_time_slot_id,
            division_id=request.division_id,
            subject_id=request.subject_id,
            faculty_id=request.faculty_id,
            room_id=request.recommended_room_id,
            entry_type=EntryType.lecture,
            academic_term="2026-ODD",
            is_active=True,
        )
        request.status = RequestStatus.approved
        request.resolved_at = datetime.now(timezone.utc)
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(request)
        return self.requests.get_by_id(request.request_id)

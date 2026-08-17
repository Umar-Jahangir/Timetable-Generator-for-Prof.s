from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from datetime import datetime, timezone

from app.models.lecture_request import LectureRequest, RequestStatus
from app.models.room import RoomType
from app.models.time_slot import TimeSlot
from app.models.timetable_entry import EntryType, TimetableEntry
from app.repositories.faculty_repository import FacultyRepository
from app.repositories.lecture_request_repository import LectureRequestRepository
from app.repositories.lookup_repository import LookupRepository
from app.repositories.subject_repository import SubjectRepository
from app.schemas.lecture_request import LectureRequestCreate
from app.services.notification_service import NotificationService


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
            scheduled_date=payload.scheduled_date,
        )

    def list_own_requests(self, user_id: int) -> list[LectureRequest]:
        faculty = self.faculty_repo.get_by_user_id(user_id)
        if not faculty:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty profile not found.")
        return self.requests.list_for_faculty(faculty.faculty_id)

    def list_pending(self) -> list[LectureRequest]:
        return self.requests.list_pending()

    def resolve_request(
        self,
        request_id: int,
        new_status: RequestStatus,
        rejection_reason: str | None = None,
    ) -> LectureRequest:
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
            reason = (rejection_reason or "").strip()
            if not reason:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="A rejection reason is required.",
                )
            request.status = RequestStatus.rejected
            request.rejection_reason = reason
            request.resolved_at = datetime.now(timezone.utc)
            self.db.commit()
            self.db.refresh(request)
            self._notify_resolution(request)
            return self.requests.get_by_id(request.request_id)

        # Requests from Today's Schedule do not choose a room/time yet.
        # Keep their existing status-only approval flow; assistant-created
        # requests include a recommendation and are booked below.
        if request.recommended_time_slot_id is None or request.recommended_room_id is None:
            resolved = self.requests.resolve(request, new_status)
            self._notify_resolution(resolved)
            return resolved

        # The recommendation may have become unavailable while pending.
        # Check all clashes immediately before the approval creates its
        # timetable entry.
        date_conflict_filter = (
            or_(
                TimetableEntry.scheduled_date.is_(None),
                TimetableEntry.scheduled_date == request.scheduled_date,
            )
            if request.scheduled_date is not None
            else TimetableEntry.scheduled_date.is_(None)
        )
        def has_conflict(time_slot_id: int) -> bool:
            return bool(
                self.db.query(TimetableEntry.entry_id)
                .filter(
                    TimetableEntry.is_active.is_(True),
                    TimetableEntry.time_slot_id == time_slot_id,
                    date_conflict_filter,
                    (
                        (TimetableEntry.faculty_id == request.faculty_id)
                        | (TimetableEntry.division_id == request.division_id)
                        | (TimetableEntry.room_id == request.recommended_room_id)
                    ),
                )
                .first()
            )

        conflict = has_conflict(request.recommended_time_slot_id)
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The recommended slot was taken while this request was pending. Reject it or ask the faculty to submit a new request.",
            )

        entries = [TimetableEntry(
            time_slot_id=request.recommended_time_slot_id,
            division_id=request.division_id,
            subject_id=request.subject_id,
            faculty_id=request.faculty_id,
            room_id=request.recommended_room_id,
            entry_type=(
                EntryType.lab
                if request.recommended_room and request.recommended_room.room_type == RoomType.laboratory
                else EntryType.lecture
            ),
            is_extra=True,
            academic_term="2026-ODD",
            scheduled_date=request.scheduled_date,
            is_active=True,
        )]
        if request.recommended_room and request.recommended_room.room_type == RoomType.laboratory:
            first_slot = request.recommended_time_slot
            second_slot = (
                self.db.query(TimeSlot)
                .filter(
                    TimeSlot.day_of_week == first_slot.day_of_week,
                    TimeSlot.slot_order == first_slot.slot_order + 1,
                    TimeSlot.is_break.is_(False),
                )
                .first()
            )
            if not second_slot or has_conflict(second_slot.time_slot_id):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="The laboratory does not have two consecutive free hours for this request.",
                )
            entries.append(
                TimetableEntry(
                    time_slot_id=second_slot.time_slot_id,
                    division_id=request.division_id,
                    subject_id=request.subject_id,
                    faculty_id=request.faculty_id,
                    room_id=request.recommended_room_id,
                    entry_type=EntryType.lab,
                    is_extra=True,
                    academic_term="2026-ODD",
                    scheduled_date=request.scheduled_date,
                    is_active=True,
                )
            )
        request.status = RequestStatus.approved
        request.resolved_at = datetime.now(timezone.utc)
        self.db.add_all(entries)
        self.db.commit()
        self.db.refresh(request)
        resolved = self.requests.get_by_id(request.request_id)
        self._notify_resolution(resolved)
        return resolved

    def _notify_resolution(self, request: LectureRequest) -> None:
        """Create an unread notification for the requesting faculty member."""
        faculty = self.faculty_repo.get_by_id(request.faculty_id)
        if not faculty:
            return
        subject_name = request.subject.name if request.subject else f"Subject #{request.subject_id}"
        division_name = request.division.name if request.division else f"Division #{request.division_id}"
        if request.status == RequestStatus.approved:
            title = "Lecture request approved"
            detail = f"Your {request.request_type.value} lecture request for {subject_name} · {division_name} was approved."
        else:
            title = "Lecture request rejected"
            detail = (
                f"Your {request.request_type.value} lecture request for {subject_name} · {division_name} "
                f"was rejected. Reason: {request.rejection_reason}"
            )
        NotificationService(self.db).notifications.create(faculty.user_id, title, detail)

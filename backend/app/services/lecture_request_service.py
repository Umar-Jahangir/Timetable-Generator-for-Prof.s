from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.lecture_request import LectureRequest, RequestStatus
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
        return self.requests.resolve(request, new_status)

from sqlalchemy.orm import Session

from app.models.faculty import Faculty
from app.models.lecture_request import LectureRequest, RequestStatus
from app.models.room import Room, RoomType
from app.models.subject import Subject


class DashboardRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_stats(self) -> dict:
        return {
            "faculty_count": self.db.query(Faculty).count(),
            "subject_count": self.db.query(Subject).count(),
            "classroom_count": self.db.query(Room).filter(Room.room_type == RoomType.classroom).count(),
            "lab_count": self.db.query(Room).filter(Room.room_type == RoomType.laboratory).count(),
            "pending_requests": self.db.query(LectureRequest)
            .filter(LectureRequest.status == RequestStatus.pending)
            .count(),
        }

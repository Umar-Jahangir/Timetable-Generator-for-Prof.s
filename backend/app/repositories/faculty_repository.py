from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.faculty import Faculty
from app.models.user import User


class FacultyRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_all(self) -> list[Faculty]:
        return self.db.query(Faculty).options(joinedload(Faculty.user)).order_by(Faculty.faculty_id).all()

    def get_by_id(self, faculty_id: int) -> Optional[Faculty]:
        return (
            self.db.query(Faculty)
            .options(joinedload(Faculty.user))
            .filter(Faculty.faculty_id == faculty_id)
            .first()
        )

    def get_by_user_id(self, user_id: int) -> Optional[Faculty]:
        return (
            self.db.query(Faculty)
            .options(joinedload(Faculty.user))
            .filter(Faculty.user_id == user_id)
            .first()
        )

    def count(self) -> int:
        return self.db.query(Faculty).count()

    def create(self, user: User, department_id: int, designation: Optional[str], max_weekly_hours: int) -> Faculty:
        faculty = Faculty(
            user_id=user.user_id,
            department_id=department_id,
            designation=designation,
            max_weekly_hours=max_weekly_hours,
        )
        self.db.add(faculty)
        self.db.commit()
        self.db.refresh(faculty)
        return faculty

    def update(self, faculty: Faculty, **fields) -> Faculty:
        for key, value in fields.items():
            if value is not None:
                setattr(faculty, key, value)
        self.db.commit()
        self.db.refresh(faculty)
        return faculty

    def delete(self, faculty: Faculty) -> None:
        # Deleting the User cascades to the Faculty row (users.user_id ->
        # faculty.user_id is ON DELETE CASCADE — see Phase 2 schema), so
        # this removes both the login and the faculty profile in one go.
        user = faculty.user
        self.db.delete(user)
        self.db.commit()

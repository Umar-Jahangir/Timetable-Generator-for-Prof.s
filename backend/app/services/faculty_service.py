import secrets
import string

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.faculty import Faculty
from app.models.user import User, UserRole
from app.repositories.faculty_repository import FacultyRepository
from app.repositories.lookup_repository import LookupRepository
from app.repositories.user_repository import UserRepository
from app.schemas.faculty import FacultyCreate, FacultyUpdate


def _generate_temp_password(length: int = 12) -> str:
    """Generates a random password meeting basic complexity (letters +
    digits) using the `secrets` module — cryptographically secure, unlike
    `random`."""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


class FacultyService:
    def __init__(self, db: Session):
        self.db = db
        self.faculty_repo = FacultyRepository(db)
        self.user_repo = UserRepository(db)
        self.lookup_repo = LookupRepository(db)

    def list_faculty(self) -> list[Faculty]:
        return self.faculty_repo.list_all()

    def get_faculty(self, faculty_id: int) -> Faculty:
        faculty = self.faculty_repo.get_by_id(faculty_id)
        if not faculty:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty member not found.")
        return faculty

    def create_faculty(self, payload: FacultyCreate) -> tuple[Faculty, str]:
        if self.user_repo.get_by_email(payload.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists.",
            )
        if not self.lookup_repo.department_exists(payload.department_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown department_id.")

        temp_password = _generate_temp_password()

        # Faculty spans two tables (users + faculty). If the Faculty
        # insert failed after the User insert committed, we'd have a
        # login with no profile — so both writes happen before any
        # commit, in one transaction.
        user = User(
            name=payload.name,
            email=payload.email,
            password_hash=hash_password(temp_password),
            role=UserRole.faculty,
            is_active=True,
        )
        self.db.add(user)
        self.db.flush()  # assigns user.user_id without committing yet

        faculty = Faculty(
            user_id=user.user_id,
            department_id=payload.department_id,
            designation=payload.designation,
            max_weekly_hours=payload.max_weekly_hours,
        )
        self.db.add(faculty)
        self.db.commit()
        self.db.refresh(faculty)
        self.db.refresh(user)

        return faculty, temp_password

    def update_faculty(self, faculty_id: int, payload: FacultyUpdate) -> Faculty:
        faculty = self.get_faculty(faculty_id)

        if payload.department_id is not None and not self.lookup_repo.department_exists(payload.department_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown department_id.")

        # name / is_active live on the User row, not Faculty.
        if payload.name is not None:
            faculty.user.name = payload.name
        if payload.is_active is not None:
            faculty.user.is_active = payload.is_active

        return self.faculty_repo.update(
            faculty,
            department_id=payload.department_id,
            designation=payload.designation,
            max_weekly_hours=payload.max_weekly_hours,
        )

    def delete_faculty(self, faculty_id: int) -> None:
        faculty = self.get_faculty(faculty_id)
        self.faculty_repo.delete(faculty)

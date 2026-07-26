from sqlalchemy import ForeignKey, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Faculty(Base):
    """Maps to the `faculty` table — 1-1 extension of `users` for faculty-only fields."""

    __tablename__ = "faculty"

    faculty_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False, unique=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.department_id"), nullable=False)
    designation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    max_weekly_hours: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=18)

    user = relationship("User", back_populates="faculty_profile")

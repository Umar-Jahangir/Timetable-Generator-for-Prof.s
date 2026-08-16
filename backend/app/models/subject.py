from sqlalchemy import Boolean, ForeignKey, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Subject(Base):
    """Maps to the `subjects` table."""

    __tablename__ = "subjects"

    subject_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    academic_year_id: Mapped[int] = mapped_column(ForeignKey("academic_years.academic_year_id"), nullable=False)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.department_id"), nullable=False)
    credits: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    lectures_per_week: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    tutorials_per_week: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    lab_hours_per_week: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    is_industrial_elective: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_online: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    academic_year = relationship("AcademicYear")
    department = relationship("Department")

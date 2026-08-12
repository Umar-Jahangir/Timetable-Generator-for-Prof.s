from sqlalchemy import Boolean, ForeignKey, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Division(Base):
    """Maps to the `divisions` table (e.g. TY-A, TY-B, SY-C)."""

    __tablename__ = "divisions"

    division_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    academic_year_id: Mapped[int] = mapped_column(ForeignKey("academic_years.academic_year_id"), nullable=False)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.department_id"), nullable=False)
    name: Mapped[str] = mapped_column(String(10), nullable=False)
    strength: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    is_online: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    academic_year = relationship("AcademicYear")
    department = relationship("Department")

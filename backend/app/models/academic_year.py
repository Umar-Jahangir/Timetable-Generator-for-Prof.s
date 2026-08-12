from sqlalchemy import SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class AcademicYear(Base):
    """Maps to the `academic_years` table (FY / SY / TY / Final Year)."""

    __tablename__ = "academic_years"

    academic_year_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    year_order: Mapped[int] = mapped_column(SmallInteger, nullable=False, unique=True)

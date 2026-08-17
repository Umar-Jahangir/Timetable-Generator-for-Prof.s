import enum

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class DeliveryType(str, enum.Enum):
    theory = "theory"
    lab = "lab"
    tutorial = "tutorial"


class SubjectFacultyAssignment(Base):
    """Maps to `subject_faculty_assignment` — who teaches what, to which
    division or one of its batches, for a specific delivery type and term.
    """

    __tablename__ = "subject_faculty_assignment"

    assignment_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.subject_id"), nullable=False)
    faculty_id: Mapped[int] = mapped_column(ForeignKey("faculty.faculty_id"), nullable=False)
    division_id: Mapped[int] = mapped_column(ForeignKey("divisions.division_id"), nullable=False)
    batch_id: Mapped[int | None] = mapped_column(ForeignKey("batches.batch_id"), nullable=True)
    delivery_type: Mapped[DeliveryType] = mapped_column(Enum(DeliveryType), nullable=False)
    is_online: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    academic_term: Mapped[str] = mapped_column(String(20), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    subject = relationship("Subject")
    faculty = relationship("Faculty")
    division = relationship("Division")
    batch = relationship("Batch")

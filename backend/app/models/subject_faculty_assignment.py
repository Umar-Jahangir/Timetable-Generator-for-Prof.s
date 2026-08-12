from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class SubjectFacultyAssignment(Base):
    """Maps to `subject_faculty_assignment` — who teaches what, to which
    division, for which term. This is the essential input the Phase 6
    optimizer reads: without it, there's nothing to schedule. Batch-level
    assignments (lab sub-groups) are out of scope for v1 — `batch_id`
    stays NULL, meaning every assignment applies to the whole division.
    """

    __tablename__ = "subject_faculty_assignment"

    assignment_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.subject_id"), nullable=False)
    faculty_id: Mapped[int] = mapped_column(ForeignKey("faculty.faculty_id"), nullable=False)
    division_id: Mapped[int] = mapped_column(ForeignKey("divisions.division_id"), nullable=False)
    batch_id: Mapped[int | None] = mapped_column(ForeignKey("batches.batch_id"), nullable=True)
    academic_term: Mapped[str] = mapped_column(String(20), nullable=False)

    subject = relationship("Subject")
    faculty = relationship("Faculty")
    division = relationship("Division")

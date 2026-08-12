from sqlalchemy import ForeignKey, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Batch(Base):
    """Maps to the `batches` table — lab sub-groups within a division
    (e.g. TY-A -> B1, B2, B3). Not yet used by the Phase 6 scheduling
    engine (batch-level lab scheduling is a documented v2 scope item —
    see app/scheduling/optimizer.py's module docstring); this minimal
    mapping exists so SQLAlchemy can resolve the `timetable_entries.batch_id`
    and `subject_faculty_assignment.batch_id` foreign keys, both of
    which reference this table even while unused.
    """

    __tablename__ = "batches"

    batch_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    division_id: Mapped[int] = mapped_column(ForeignKey("divisions.division_id"), nullable=False)
    name: Mapped[str] = mapped_column(String(10), nullable=False)
    strength: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

import enum
from datetime import datetime

from sqlalchemy import TIMESTAMP, Enum, ForeignKey, String
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class ReviewStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class ReviewFollowUp(str, enum.Enum):
    none = "none"
    regenerate = "regenerate"
    suggest_constraint = "suggest_constraint"


class DivisionTimetableReview(Base):
    """Admin per-division verdict on the current generated timetable."""

    __tablename__ = "division_timetable_reviews"

    review_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    division_id: Mapped[int] = mapped_column(ForeignKey("divisions.division_id"), nullable=False)
    academic_term: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[ReviewStatus] = mapped_column(Enum(ReviewStatus), nullable=False, default=ReviewStatus.pending)
    rejection_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    follow_up: Mapped[ReviewFollowUp] = mapped_column(
        Enum(ReviewFollowUp), nullable=False, default=ReviewFollowUp.none
    )
    suggested_constraint: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)

    division = relationship("Division")

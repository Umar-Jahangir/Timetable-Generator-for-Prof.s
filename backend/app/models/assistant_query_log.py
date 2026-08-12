from datetime import datetime

from sqlalchemy import TIMESTAMP, Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class AssistantQueryLog(Base):
    """Maps to the `assistant_query_logs` table — every query sent to the
    rule-based assistant, for analytics (Phase 8's "conflicts prevented"
    style stats). Defined in the Phase 2 schema but unused until now."""

    __tablename__ = "assistant_query_logs"

    log_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    faculty_id: Mapped[int] = mapped_column(ForeignKey("faculty.faculty_id"), nullable=False)
    query_text: Mapped[str] = mapped_column(String(500), nullable=False)
    detected_intent: Mapped[str | None] = mapped_column(String(100), nullable=True)
    related_request_id: Mapped[int | None] = mapped_column(
        ForeignKey("lecture_requests.request_id"), nullable=True
    )
    was_successful: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False)

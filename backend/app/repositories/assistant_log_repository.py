from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.assistant_query_log import AssistantQueryLog


class AssistantLogRepository:
    def __init__(self, db: Session):
        self.db = db

    def log(
        self,
        faculty_id: int,
        query_text: str,
        detected_intent: str,
        was_successful: bool,
        related_request_id: Optional[int] = None,
    ) -> AssistantQueryLog:
        entry = AssistantQueryLog(
            faculty_id=faculty_id,
            query_text=query_text[:500],
            detected_intent=detected_intent,
            related_request_id=related_request_id,
            was_successful=was_successful,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(entry)
        self.db.commit()
        return entry

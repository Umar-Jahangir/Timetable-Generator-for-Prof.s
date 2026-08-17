from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.notification import Notification


class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_for_user(self, user_id: int) -> list[Notification]:
        return (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .all()
        )

    def get_by_id(self, notification_id: int) -> Optional[Notification]:
        return self.db.query(Notification).filter(Notification.notification_id == notification_id).first()

    def create(self, user_id: int, title: str, detail: str | None = None, *, commit: bool = True) -> Notification:
        notification = Notification(
            user_id=user_id,
            title=title[:200],
            detail=(detail[:500] if detail else None),
            is_read=False,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(notification)
        if commit:
            self.db.commit()
            self.db.refresh(notification)
        return notification

    def create_many(self, user_ids: list[int], title: str, detail: str | None = None) -> int:
        unique_ids = sorted(set(user_ids))
        for user_id in unique_ids:
            self.create(user_id, title, detail, commit=False)
        self.db.commit()
        return len(unique_ids)

    def mark_read(self, notification: Notification) -> Notification:
        notification.is_read = True
        self.db.commit()
        self.db.refresh(notification)
        return notification

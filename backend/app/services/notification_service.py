from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.repositories.notification_repository import NotificationRepository


class NotificationService:
    def __init__(self, db: Session):
        self.db = db
        self.notifications = NotificationRepository(db)

    def list_for_user(self, user_id: int) -> list[Notification]:
        return self.notifications.list_for_user(user_id)

    def mark_read(self, notification_id: int, user_id: int) -> Notification:
        notification = self.notifications.get_by_id(notification_id)
        if not notification:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
        if notification.user_id != user_id:
            # A faculty member can only mark their own notifications —
            # 404 instead of 403 so this doesn't confirm the ID's existence
            # to someone probing other users' notification IDs.
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
        return self.notifications.mark_read(notification)

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.deps import require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.notification import NotificationOut
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/faculty/notifications", tags=["Faculty - Notifications"])


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.faculty)),
):
    return NotificationService(db).list_for_user(current_user.user_id)


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.faculty)),
):
    return NotificationService(db).mark_read(notification_id, current_user.user_id)

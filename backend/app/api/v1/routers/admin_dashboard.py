from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.deps import require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.dashboard import DashboardStatsOut

router = APIRouter(prefix="/admin/dashboard", tags=["Admin - Dashboard"])


@router.get("", response_model=DashboardStatsOut)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    """Real counts from the database — replaces the mock stats the
    frontend's Admin Dashboard page has been showing since Phase 1."""
    return DashboardRepository(db).get_stats()

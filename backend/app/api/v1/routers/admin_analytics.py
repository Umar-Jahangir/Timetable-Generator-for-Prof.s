from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.deps import require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.analytics import AnalyticsOut
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/admin/analytics", tags=["Admin - Analytics"])


@router.get("", response_model=AnalyticsOut)
def get_analytics(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    """Every field is computed from real rows — no mocked numbers. See
    AnalyticsService's docstring for exactly what each metric means and
    the one deliberate omission (a standalone "conflicts prevented"
    counter, which would have to be fabricated since Phase 6 enforces
    zero clashes by construction rather than tracking near-misses)."""
    return AnalyticsService(db).get_analytics()

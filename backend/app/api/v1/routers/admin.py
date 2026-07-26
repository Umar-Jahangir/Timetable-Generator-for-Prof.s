from fastapi import APIRouter, Depends

from app.api.v1.deps import require_role
from app.models.user import User, UserRole

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/ping")
def admin_ping(current_user: User = Depends(require_role(UserRole.admin))):
    """
    Admin-only smoke-test endpoint proving role-based access control works.
    Real admin endpoints (Faculty/Subject/Classroom/Lab/Division management)
    are built out in Phase 4.
    """
    return {"message": f"Hello Admin {current_user.name}, you're authenticated."}

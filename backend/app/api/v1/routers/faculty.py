from fastapi import APIRouter, Depends

from app.api.v1.deps import require_role
from app.models.user import User, UserRole

router = APIRouter(prefix="/faculty", tags=["Faculty"])


@router.get("/ping")
def faculty_ping(current_user: User = Depends(require_role(UserRole.faculty))):
    """
    Faculty-only smoke-test endpoint proving role-based access control works.
    Real faculty endpoints (dashboard, timetable, workload, assistant) are
    built out in Phase 5.
    """
    return {"message": f"Hello {current_user.name}, you're authenticated as faculty."}

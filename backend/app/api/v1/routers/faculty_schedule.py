from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.deps import require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.schedule import TimetableEntryOut
from app.schemas.workload import WorkloadOut
from app.services.schedule_service import ScheduleService

router = APIRouter(prefix="/faculty/me", tags=["Faculty - Schedule"])


@router.get("/schedule/today", response_model=list[TimetableEntryOut])
def get_today_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.faculty)),
):
    """
    Real query against `timetable_entries`, filtered to today's day of
    week. Legitimately returns an empty list until Phase 6's
    optimization engine actually generates and stores a timetable —
    this isn't a placeholder, it's an honest "no data yet" response.
    """
    return ScheduleService(db).get_today_schedule(current_user.user_id)


@router.get("/timetable", response_model=list[TimetableEntryOut])
def get_weekly_timetable(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.faculty)),
):
    return ScheduleService(db).get_weekly_timetable(current_user.user_id)


@router.get("/workload", response_model=WorkloadOut)
def get_workload(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.faculty)),
):
    return ScheduleService(db).get_workload(current_user.user_id)

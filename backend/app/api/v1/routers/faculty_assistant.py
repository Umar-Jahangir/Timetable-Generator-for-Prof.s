from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.deps import require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.assistant import (
    AssistantConfirmRequest,
    AssistantConfirmResponse,
    AssistantQueryRequest,
    AssistantQueryResponse,
)
from app.services.assistant_service import AssistantService

router = APIRouter(prefix="/faculty/assistant", tags=["Faculty - Scheduling Assistant"])


@router.post("/query", response_model=AssistantQueryResponse)
def query_assistant(
    payload: AssistantQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.faculty)),
):
    """
    The Rule-Based Scheduling Assistant's single entry point. Detects
    intent from free text (app/scheduling/assistant/intent_engine.py —
    deterministic keyword matching, not an LLM call, per the project's
    own spec), extracts entities, and dispatches to the matching
    handler in AssistantService. Every query is logged to
    `assistant_query_logs` regardless of outcome, for Phase 8's
    analytics.
    """
    return AssistantService(db).handle_query(current_user.user_id, payload)


@router.post("/confirm", response_model=AssistantConfirmResponse)
def confirm_booking(
    payload: AssistantConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.faculty)),
):
    """
    Turns a previously-returned recommendation into a real
    `timetable_entries` row. Re-validates the slot is still free before
    committing — a recommendation can go stale if someone else books
    the same slot between when it was shown and when this is called.
    """
    return AssistantService(db).confirm_booking(current_user.user_id, payload)

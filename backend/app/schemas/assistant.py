from typing import Any, Optional

from pydantic import BaseModel


class AssistantQueryRequest(BaseModel):
    query: str
    # Optional structured hints — populated by the frontend's dropdowns
    # when the free-text entity extraction can't confidently identify a
    # subject/division (e.g. the user typed a colloquial name that
    # doesn't substring-match anything in the database). Purely
    # rule-based entity extraction has real limits; asking for a
    # concrete selection when it fails is the honest fallback, not a
    # hidden LLM call filling the gap.
    subject_id: Optional[int] = None
    division_id: Optional[int] = None


class ReasonOut(BaseModel):
    label: str
    satisfied: bool


class RecommendationOut(BaseModel):
    division: str
    subject: str
    day: str
    start_time: str
    end_time: str
    room: str
    room_id: int
    time_slot_id: int
    subject_id: int
    division_id: int
    score: int
    reasons: list[ReasonOut]


class AssistantQueryResponse(BaseModel):
    intent: str
    message: str
    recommendation: Optional[RecommendationOut] = None
    alternates: list[RecommendationOut] = []
    data: Optional[list[dict[str, Any]]] = None


class AssistantConfirmRequest(BaseModel):
    subject_id: int
    division_id: int
    time_slot_id: int
    room_id: int
    request_type: str  # "extra" or "replacement"
    score: int


class AssistantConfirmResponse(BaseModel):
    message: str
    request_id: int
    entry_id: int

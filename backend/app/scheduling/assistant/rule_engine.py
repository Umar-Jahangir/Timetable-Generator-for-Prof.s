"""
Rule engine — checks whether ONE specific (time_slot, room) candidate is
actually usable for a specific (faculty, division) pairing.

This is the assistant's equivalent of Phase 6's optimizer constraints,
but evaluated one candidate at a time (fast, no solver needed) rather
than globally across the whole week — appropriate here since the
assistant is answering "what's the best slot for this one request?",
not generating an entire timetable from scratch.

Pure function, no DB access — every check takes plain data structures
(pre-fetched sets of occupied slot IDs, room info, etc.) so it can be
unit-tested without a database and reused by both the recommender and,
eventually, the confirm-booking endpoint's re-validation step.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class RuleCheckResult:
    label: str
    satisfied: bool


@dataclass
class CandidateCheck:
    passed: bool
    checks: list[RuleCheckResult]


def check_candidate(
    *,
    faculty_occupied_slot_ids: set[int],
    division_occupied_slot_ids: set[int],
    room_occupied_slot_ids: set[int],
    blocked_slot_ids: set[int],
    time_slot_id: int,
    room_capacity: Optional[int],
    division_strength: Optional[int],
    room_type_matches: bool,
) -> CandidateCheck:
    checks = [
        RuleCheckResult("You are available", time_slot_id not in faculty_occupied_slot_ids),
        RuleCheckResult("Students are available", time_slot_id not in division_occupied_slot_ids),
        RuleCheckResult("Classroom is free", time_slot_id not in room_occupied_slot_ids),
        RuleCheckResult("No institutional conflicts", time_slot_id not in blocked_slot_ids),
        RuleCheckResult("Room type matches", room_type_matches),
        RuleCheckResult(
            "Room capacity is sufficient",
            room_capacity is None or division_strength is None or room_capacity >= division_strength,
        ),
    ]
    return CandidateCheck(passed=all(c.satisfied for c in checks), checks=checks)

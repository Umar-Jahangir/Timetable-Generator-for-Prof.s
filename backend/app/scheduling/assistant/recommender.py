"""
Recommendation engine — scores every candidate (time_slot, room) pair
that passes the rule engine's hard checks, and ranks them.

Scoring is a deterministic, explainable point system (business rules
stated as comments next to each rule, not learned from data):

- Base score for any slot that passes every hard check: 70
- +15 if the room's capacity is a close fit for the division's
  strength (within 20%), rather than a much larger room than needed —
  "maximizing classroom utilization" from the project's own problem
  statement, applied at the level of a single recommendation.
- +10 if the slot is immediately adjacent (same day, consecutive
  slot_order) to a class the division already has — reduces idle time
  between classes, the same goal Phase 6's engine optimizes for at
  timetable-generation scale, applied here to a single ad-hoc booking.
- +5 if the slot isn't the first or last teaching slot of the day (a
  mild preference for "core" hours over edge-of-day slots).
- Capped at 100.

Ties are broken by earliest day, then earliest slot_order, so results
are reproducible given the same inputs.
"""

from dataclasses import dataclass

from app.scheduling.assistant.rule_engine import CandidateCheck, RuleCheckResult, check_candidate


@dataclass
class Candidate:
    time_slot_id: int
    day_of_week: str
    slot_order: int
    start_time: str
    end_time: str
    room_id: int
    room_name: str
    room_capacity: int


@dataclass
class ScoredCandidate:
    candidate: Candidate
    score: int
    checks: list[RuleCheckResult]


def score_candidate(
    candidate: Candidate,
    check: CandidateCheck,
    division_strength: int | None,
    division_day_slot_orders: set[int],
    min_slot_order: int,
    max_slot_order: int,
) -> int:
    score = 70

    if division_strength and candidate.room_capacity:
        oversize_ratio = candidate.room_capacity / division_strength
        if oversize_ratio <= 1.2:
            score += 15

    adjacent = (candidate.slot_order - 1) in division_day_slot_orders or (
        candidate.slot_order + 1
    ) in division_day_slot_orders
    if adjacent:
        score += 10

    if min_slot_order < candidate.slot_order < max_slot_order:
        score += 5

    return min(score, 100)


DAY_ORDER = {"Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3, "Friday": 4, "Saturday": 5}


def rank_candidates(
    candidates: list[Candidate],
    *,
    faculty_occupied_slot_ids: set[int],
    division_occupied_slot_ids: set[int],
    room_occupied_slot_ids: dict[int, set[int]],  # room_id -> occupied slot_ids
    blocked_slot_ids: set[int],
    division_strength: int | None,
    division_day_slot_orders: dict[str, set[int]],  # day -> set of occupied slot_order
    min_slot_order: int,
    max_slot_order: int,
) -> list[ScoredCandidate]:
    scored: list[ScoredCandidate] = []
    for c in candidates:
        check = check_candidate(
            faculty_occupied_slot_ids=faculty_occupied_slot_ids,
            division_occupied_slot_ids=division_occupied_slot_ids,
            room_occupied_slot_ids=room_occupied_slot_ids.get(c.room_id, set()),
            blocked_slot_ids=blocked_slot_ids,
            time_slot_id=c.time_slot_id,
            room_capacity=c.room_capacity,
            division_strength=division_strength,
            room_type_matches=True,  # candidates are pre-filtered by room type upstream
        )
        if not check.passed:
            continue
        score = score_candidate(
            c,
            check,
            division_strength,
            division_day_slot_orders.get(c.day_of_week, set()),
            min_slot_order,
            max_slot_order,
        )
        scored.append(ScoredCandidate(candidate=c, score=score, checks=check.checks))

    # Sort by day INDEX (Mon..Sat), not day name — alphabetical order
    # would incorrectly put "Friday" before "Monday".
    scored.sort(
        key=lambda sc: (-sc.score, DAY_ORDER.get(sc.candidate.day_of_week, 99), sc.candidate.slot_order)
    )
    return scored

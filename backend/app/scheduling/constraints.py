"""
Shared constraint-checking helpers, used by both the Phase 6 timetable
generator and the Phase 7 assistant so the two never enforce different
rules for the same admin-configured constraint.
"""

from sqlalchemy.orm import Session

from app.models.constraint import ConstraintType, SchedulingConstraint
from app.models.time_slot import TimeSlot


def get_blocked_slot_ids(db: Session) -> set[int]:
    """Slots blocked for every faculty member, from active
    `faculty_free_hour` constraints (e.g. "Friday 1-2 PM all faculty
    free"). Other constraint types defined in Phase 4's schema
    (max_continuous_hours, lab_continuous_hours, online_year) aren't
    enforced yet — see app/scheduling/optimizer.py's module docstring
    for the full, honest scope statement.
    """
    blocked: set[int] = set()
    constraints = (
        db.query(SchedulingConstraint)
        .filter(
            SchedulingConstraint.constraint_type == ConstraintType.faculty_free_hour,
            SchedulingConstraint.is_active.is_(True),
        )
        .all()
    )
    if not constraints:
        return blocked

    all_slots = db.query(TimeSlot).all()
    for c in constraints:
        day = c.config.get("day")
        start = c.config.get("start")
        for slot in all_slots:
            if str(slot.day_of_week.value) == day and slot.start_time.strftime("%H:%M") == start:
                blocked.add(slot.time_slot_id)
    return blocked


def get_division_blocked_slot_ids(db: Session) -> dict[int, set[int]]:
    """Returns slot IDs each division is forbidden from using.

    `division_day_off` config: `{"division_id": 1, "day": "Monday"}`
    `division_blackout` config: `{"division_ids": [13, 14, 15],
    "days": ["Monday", "Tuesday", "Wednesday"]}`
    """
    blocked: dict[int, set[int]] = {}
    constraints = (
        db.query(SchedulingConstraint)
        .filter(
            SchedulingConstraint.constraint_type.in_(
                [ConstraintType.division_day_off, ConstraintType.division_blackout]
            ),
            SchedulingConstraint.is_active.is_(True),
        )
        .all()
    )
    if not constraints:
        return blocked

    all_slots = db.query(TimeSlot).all()
    for constraint in constraints:
        if constraint.constraint_type == ConstraintType.division_day_off:
            division_ids = [constraint.config.get("division_id")]
            days = [constraint.config.get("day")]
        else:
            division_ids = constraint.config.get("division_ids", [])
            days = constraint.config.get("days", [])

        day_slot_ids = {
            slot.time_slot_id
            for slot in all_slots
            if slot.day_of_week.value in days and not slot.is_break
        }
        for division_id in division_ids:
            if isinstance(division_id, int):
                blocked.setdefault(division_id, set()).update(day_slot_ids)
    return blocked

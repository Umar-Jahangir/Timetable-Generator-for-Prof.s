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

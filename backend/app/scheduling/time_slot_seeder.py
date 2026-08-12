from datetime import time

from sqlalchemy.orm import Session

from app.models.time_slot import DayOfWeek, TimeSlot

# Matches the exact grid already seeded for Monday in Phase 2
# (database/seed/seed_data.sql) and shown in the product wireframes:
# 6 teaching periods + 1 lunch break, Monday through Saturday.
_DAILY_GRID = [
    (time(8, 0), time(9, 0), 1, False),
    (time(9, 0), time(10, 0), 2, False),
    (time(10, 0), time(11, 0), 3, False),
    (time(11, 0), time(12, 0), 4, False),
    (time(12, 0), time(13, 0), 5, True),  # lunch break
    (time(13, 0), time(14, 0), 6, False),
    (time(14, 0), time(15, 0), 7, False),
]

_WEEK_DAYS = [
    DayOfWeek.Monday,
    DayOfWeek.Tuesday,
    DayOfWeek.Wednesday,
    DayOfWeek.Thursday,
    DayOfWeek.Friday,
    DayOfWeek.Saturday,
]


def ensure_full_week_time_slots(db: Session) -> int:
    """
    Idempotently fills in any missing days in the `time_slots` grid.
    Phase 2's seed data only populated Monday (as a demonstration
    pattern for the DDL); the optimizer needs a full week to produce a
    realistic timetable. Returns the number of rows inserted (0 if the
    week was already complete).
    """
    existing_days = {row[0] for row in db.query(TimeSlot.day_of_week).distinct().all()}
    inserted = 0
    for day in _WEEK_DAYS:
        if day in existing_days:
            continue
        for start, end, order, is_break in _DAILY_GRID:
            db.add(
                TimeSlot(
                    day_of_week=day,
                    start_time=start,
                    end_time=end,
                    slot_order=order,
                    is_break=is_break,
                )
            )
            inserted += 1
    if inserted:
        db.commit()
    return inserted

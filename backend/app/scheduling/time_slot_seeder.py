from datetime import time

from sqlalchemy.orm import Session

from app.models.time_slot import DayOfWeek, TimeSlot

# College hours: 08:00–18:00 (Mon–Sat), with lunch 12:00–13:00.
_DAILY_GRID = [
    (time(8, 0), time(9, 0), 1, False),
    (time(9, 0), time(10, 0), 2, False),
    (time(10, 0), time(11, 0), 3, False),
    (time(11, 0), time(12, 0), 4, False),
    (time(12, 0), time(13, 0), 5, True),  # lunch break
    (time(13, 0), time(14, 0), 6, False),
    (time(14, 0), time(15, 0), 7, False),
    (time(15, 0), time(16, 0), 8, False),
    (time(16, 0), time(17, 0), 9, False),
    (time(17, 0), time(18, 0), 10, False),
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
    Idempotently fills any missing day × period rows in `time_slots`
    for the college grid (08:00–18:00, Mon–Sat). Returns the number of
    rows inserted (0 if already complete).
    """
    existing = {
        (row.day_of_week, row.start_time)
        for row in db.query(TimeSlot.day_of_week, TimeSlot.start_time).all()
    }
    inserted = 0
    for day in _WEEK_DAYS:
        for start, end, order, is_break in _DAILY_GRID:
            if (day, start) in existing:
                continue
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

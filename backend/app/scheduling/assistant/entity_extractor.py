"""
Rule-based entity extraction — pulls day-of-week, time, subject, and
division references out of free text. Same "no ML" philosophy as
intent_engine.py: day/time use regex against a fixed vocabulary;
subject/division use case-insensitive substring matching against the
actual names/codes already in the database (passed in, not queried
here — keeps this module DB-free and unit-testable).
"""

import re
from datetime import date, timedelta
from typing import NamedTuple, Optional

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


def extract_day(query: str, today: Optional[date] = None) -> Optional[str]:
    text = query.lower()
    today = today or date.today()

    for day in DAY_NAMES:
        if re.search(rf"\b{day.lower()}\b", text):
            return day

    if re.search(r"\btoday\b", text):
        weekday_name = today.strftime("%A")
        return weekday_name if weekday_name in DAY_NAMES else None  # Sunday has no teaching slots

    if re.search(r"\btomorrow\b", text):
        tomorrow = today + timedelta(days=1)
        weekday_name = tomorrow.strftime("%A")
        return weekday_name if weekday_name in DAY_NAMES else None

    return None


class TimeRange(NamedTuple):
    start: str  # "HH:MM"
    end: str


_TIME_RANGE_RE = re.compile(
    r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?"
)


def _to_24h(hour: int, meridiem: Optional[str]) -> int:
    if meridiem == "pm" and hour != 12:
        return hour + 12
    if meridiem == "am" and hour == 12:
        return 0
    return hour


def extract_time_range(query: str) -> Optional[TimeRange]:
    """Parses patterns like "2-3", "2pm-3pm", "2:00 PM - 3:00 PM"."""
    match = _TIME_RANGE_RE.search(query.lower())
    if not match:
        return None
    h1, m1, mer1, h2, m2, mer2 = match.groups()
    # If only one side specifies am/pm, assume the other matches it
    # (common in casual phrasing: "2-3 pm" means both are PM).
    mer1 = mer1 or mer2
    mer2 = mer2 or mer1
    start_h = _to_24h(int(h1), mer1)
    end_h = _to_24h(int(h2), mer2)
    return TimeRange(f"{start_h:02d}:{m1 or '00'}", f"{end_h:02d}:{m2 or '00'}")


def extract_subject(query: str, subjects: list[dict]) -> Optional[int]:
    """`subjects` is a list of {"subject_id", "name", "code"} dicts.
    Matches the query against each subject's code and name via
    case-insensitive substring search; the longest matching string wins
    (so "Database Management Systems" beats a shorter coincidental
    match). Returns the subject_id, or None if nothing matched."""
    text = query.lower()
    best_id, best_len = None, 0
    for s in subjects:
        for candidate in (s["code"], s["name"]):
            if candidate and candidate.lower() in text and len(candidate) > best_len:
                best_id, best_len = s["subject_id"], len(candidate)
    return best_id


def extract_division(query: str, divisions: list[dict]) -> Optional[int]:
    """`divisions` is a list of {"division_id", "label"} dicts, where
    `label` is a display form like "TY-A". Matches case-insensitively,
    allowing "TY-A", "TY A", "TYA", or spaced forms like "SY A"."""
    text = query.lower()
    # Prefer longer / more specific labels first (TY-D1 before TY-A, SY-A before A).
    ordered = sorted(divisions, key=lambda d: len(d["label"]), reverse=True)
    for d in ordered:
        label = d["label"].lower()
        compact = label.replace("-", "").replace(" ", "")
        spaced = label.replace("-", " ")
        if label in text or spaced in text or compact in text:
            return d["division_id"]
        # Year + letter with flexible separators: "sy a", "sy-a", "sy/a"
        parts = re.split(r"[-_\s/]+", label)
        if len(parts) == 2:
            year, div = parts
            if re.search(rf"\b{re.escape(year)}\b\s*[-_/]?\s*\b{re.escape(div)}\b", text):
                return d["division_id"]
    return None

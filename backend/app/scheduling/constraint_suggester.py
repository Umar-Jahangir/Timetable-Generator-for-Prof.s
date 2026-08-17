"""
Rule-based mapping from free-text admin rejection reasons to enforceable
scheduling constraints. Intentionally deterministic (no LLM): only emits
types that app/scheduling/constraints.py actually enforces.
"""

from __future__ import annotations

import re
from typing import Any

from app.models.constraint import ConstraintType

_DAYS = {
    "monday": "Monday",
    "tuesday": "Tuesday",
    "wednesday": "Wednesday",
    "thursday": "Thursday",
    "friday": "Friday",
    "saturday": "Saturday",
}

_DAY_ALIASES = {
    "mon": "Monday",
    "tue": "Tuesday",
    "tues": "Tuesday",
    "wed": "Wednesday",
    "thu": "Thursday",
    "thur": "Thursday",
    "thurs": "Thursday",
    "fri": "Friday",
    "sat": "Saturday",
}


def _extract_days(text: str) -> list[str]:
    lowered = text.lower()
    found: list[str] = []
    for key, day in {**_DAYS, **_DAY_ALIASES}.items():
        if re.search(rf"\b{re.escape(key)}\b", lowered) and day not in found:
            found.append(day)
    return found


def _extract_time_start(text: str) -> str | None:
    """Return HH:MM start if the reason mentions a 1-hour style slot."""
    lowered = text.lower()
    # 1-2 / 1 to 2 / 13:00-14:00 / 1pm-2pm
    m = re.search(
        r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|to|–|—)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b",
        lowered,
    )
    if not m:
        return None
    start_h = int(m.group(1))
    start_m = int(m.group(2) or 0)
    start_ampm = m.group(3)
    if start_ampm == "pm" and start_h < 12:
        start_h += 12
    if start_ampm == "am" and start_h == 12:
        start_h = 0
    if start_ampm is None and 1 <= start_h <= 6:
        # College grid: bare "1-2" means 13:00-14:00
        start_h += 12
    return f"{start_h:02d}:{start_m:02d}"


def suggest_constraint_from_reason(
    *,
    reason: str,
    division_id: int,
    division_label: str,
) -> dict[str, Any]:
    """
    Returns a draft constraint dict:
    {name, constraint_type, config, explanation, confidence}
    """
    days = _extract_days(reason)
    time_start = _extract_time_start(reason)
    lowered = reason.lower()

    day_off_words = any(
        w in lowered
        for w in ("day off", "no class", "not feasible", "infeasible", "avoid", "block", "can't", "cannot", "busy")
    )

    if time_start and days:
        day = days[0]
        end_h = int(time_start[:2]) + 1
        end = f"{end_h:02d}:{time_start[3:]}"
        return {
            "name": f"{division_label} free hour {day} {time_start}",
            "constraint_type": ConstraintType.faculty_free_hour.value,
            "config": {"day": day, "start": time_start, "end": end},
            "explanation": (
                f"Detected a blocked hour on {day} at {time_start}. "
                "Suggested a faculty_free_hour constraint (blocks that slot campus-wide). "
                "If you only need it for this division, prefer division_day_off for a full day "
                "or add a custom note and adjust manually."
            ),
            "confidence": "medium",
        }

    if days and (day_off_words or len(days) == 1):
        if len(days) == 1:
            day = days[0]
            return {
                "name": f"{division_label} weekly day off ({day})",
                "constraint_type": ConstraintType.division_day_off.value,
                "config": {"division_id": division_id, "day": day},
                "explanation": (
                    f"Detected that {division_label} should not have classes on {day}. "
                    "Suggested a division_day_off constraint, which the optimizer enforces."
                ),
                "confidence": "high",
            }
        return {
            "name": f"{division_label} blackout ({', '.join(days)})",
            "constraint_type": ConstraintType.division_blackout.value,
            "config": {"division_ids": [division_id], "days": days},
            "explanation": (
                f"Detected multiple blocked days for {division_label}: {', '.join(days)}. "
                "Suggested a division_blackout constraint."
            ),
            "confidence": "high",
        }

    return {
        "name": f"{division_label} review note",
        "constraint_type": ConstraintType.custom.value,
        "config": {
            "division_id": division_id,
            "division_label": division_label,
            "admin_reason": reason,
            "notes": "Not auto-enforced. Convert into division_day_off / division_blackout / faculty_free_hour.",
        },
        "explanation": (
            "Could not confidently map the reason to an enforceable rule. "
            "Suggested storing it as a custom constraint note. Prefer adding "
            "division_day_off (one day), division_blackout (several days), or "
            "faculty_free_hour (specific hour) on the Constraints page."
        ),
        "confidence": "low",
    }

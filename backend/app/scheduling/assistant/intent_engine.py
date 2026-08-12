"""
Rule-based intent detection.

This is deliberately NOT an LLM call, per the project's own spec: "This
is NOT an LLM chatbot. This is a Rule-Based Scheduling Assistant." Every
intent below is detected via deterministic keyword matching — same
input always produces the same intent, no model inference, no API call,
fully explainable and testable in isolation (no DB, no network).

Order matters: more specific phrasings are checked before more general
ones (e.g. "replacement lecture" is checked before the generic "extra
lecture" pattern, since a replacement query might still contain the
word "lecture" that would otherwise trigger a false match).
"""

import enum
import re


class Intent(str, enum.Enum):
    schedule_extra_lecture = "schedule_extra_lecture"
    schedule_replacement_lecture = "schedule_replacement_lecture"
    find_empty_classroom = "find_empty_classroom"
    find_empty_laboratory = "find_empty_laboratory"
    find_faculty_availability = "find_faculty_availability"
    find_common_free_slot = "find_common_free_slot"
    check_workload = "check_workload"
    view_timetable = "view_timetable"
    unknown = "unknown"


def _contains_any(text: str, words: list[str]) -> bool:
    return any(re.search(rf"\b{re.escape(w)}\b", text) for w in words)


def detect_intent(query: str) -> Intent:
    text = query.lower().strip()

    # 1. Replacement — checked before "extra" since a replacement query
    #    ("I missed Monday's lecture, need a replacement") often also
    #    contains the word "lecture", which alone isn't distinguishing.
    if _contains_any(text, ["replacement", "missed", "makeup", "make-up", "reschedule"]):
        return Intent.schedule_replacement_lecture

    # 2. Extra lecture.
    if _contains_any(text, ["extra"]) and _contains_any(text, ["lecture", "class", "session"]):
        return Intent.schedule_extra_lecture

    # 3. Workload — checked before the room-finding rules since
    #    "workload" alone is unambiguous and shouldn't fall through.
    if _contains_any(text, ["workload", "hours", "how many hours"]):
        return Intent.check_workload

    # 4. Common free slot — checked before generic classroom/lab
    #    finding, since "common free slot for TY-A" would otherwise also
    #    match the "free" + generic-room rule.
    if _contains_any(text, ["common free", "common slot", "mutual", "both free"]):
        return Intent.find_common_free_slot

    # 5. Laboratory — checked before classroom, since "lab" and "room"
    #    can co-occur ("free lab room") and lab is the more specific term.
    if _contains_any(text, ["empty", "free", "available", "vacant"]) and _contains_any(
        text, ["lab", "laboratory", "labs"]
    ):
        return Intent.find_empty_laboratory

    # 6. Classroom.
    if _contains_any(text, ["empty", "free", "available", "vacant"]) and _contains_any(
        text, ["classroom", "room", "class room"]
    ):
        return Intent.find_empty_classroom

    # 7. Faculty's own availability ("am I free", "my availability").
    if _contains_any(text, ["am i free", "my availability", "when am i free", "i free"]):
        return Intent.find_faculty_availability

    # 8. View timetable.
    if _contains_any(text, ["timetable", "schedule"]) and _contains_any(
        text, ["show", "view", "my", "see", "what"]
    ):
        return Intent.view_timetable

    return Intent.unknown

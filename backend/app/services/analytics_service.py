from collections import defaultdict

from sqlalchemy.orm import Session

from app.models.room import RoomType
from app.repositories.analytics_repository import AnalyticsRepository
from app.repositories.timetable_entry_repository import TimetableEntryRepository
from app.schemas.analytics import AnalyticsOut, IntentBreakdown


class AnalyticsService:
    """
    Every number here is computed from real rows in the database —
    nothing is mocked or hardcoded. Two metrics deserve an explicit
    note on what they mean, since their names could imply more than
    what's actually computed:

    - "Conflicts prevented" from the original wireframe isn't included
      as a standalone metric: the Phase 6 optimizer enforces zero
      clashes as a hard constraint (verified in that phase's testing),
      so there's no natural counter of "clashes that would have
      happened" to report without fabricating one. What IS real and
      reported instead: active_sessions_count (how much got scheduled)
      and the utilization/idle-time metrics below.
    - "Student idle time" IS a real computed metric here, even though
      Phase 6's optimizer doesn't yet *minimize* it as an objective
      (documented as v2 scope in app/scheduling/optimizer.py). Measuring
      it is still useful — it tells the admin how much idle time exists
      in the current generated timetable, independent of whether the
      solver optimizes for it yet.
    """

    def __init__(self, db: Session):
        self.db = db
        self.repo = AnalyticsRepository(db)
        self.entry_repo = TimetableEntryRepository(db)

    def _faculty_utilization(self) -> float:
        """Average utilization across ALL faculty, not just those with
        current assignments — a faculty member with zero scheduled
        hours correctly pulls this average down, since "how utilized is
        the faculty pool overall" is the useful institution-wide
        question, not "how utilized is faculty that's already busy"."""
        faculty = self.repo.faculty_count()
        if not faculty:
            return 0.0
        percentages = []
        for f in faculty:
            _, scheduled_hours = self.entry_repo.count_weekly_hours_for_faculty(f.faculty_id)
            percentages.append(min(scheduled_hours / f.max_weekly_hours * 100, 100))
        return round(sum(percentages) / len(percentages), 1)

    def _room_utilization(self, entries, room_type: RoomType) -> float:
        room_count = self.repo.room_count(room_type)
        teaching_slots = self.repo.teaching_slot_count()
        total_capacity = room_count * teaching_slots
        if total_capacity == 0:
            return 0.0
        occupied = sum(1 for e in entries if e.room and e.room.room_type == room_type)
        return round(min(occupied / total_capacity * 100, 100), 1)

    def _student_idle_time(self, entries) -> float:
        """
        For each division-day with at least one class, idle time is the
        gap between the first and last occupied teaching slot minus the
        slots actually occupied. A division with back-to-back classes
        (no gaps) contributes 0 idle slots; one with a hole in the
        middle of the day contributes exactly the size of that hole.
        Divisions/days with no classes at all aren't counted — there's
        no "day" to have idle time in if nothing is scheduled on it.
        """
        by_division_day = defaultdict(set)
        for e in entries:
            if e.time_slot and not e.time_slot.is_break:
                key = (e.division_id, e.time_slot.day_of_week)
                by_division_day[key].add(e.time_slot.slot_order)

        total_span = 0
        total_occupied = 0
        for slot_orders in by_division_day.values():
            span = max(slot_orders) - min(slot_orders) + 1
            total_span += span
            total_occupied += len(slot_orders)

        if total_span == 0:
            return 0.0
        idle = total_span - total_occupied
        return round(idle / total_span * 100, 1)

    def _assistant_stats(self):
        logs = self.repo.assistant_query_stats()
        total = len(logs)
        successful = sum(1 for log in logs if log.was_successful)

        by_intent = defaultdict(lambda: {"count": 0, "successful": 0})
        for log in logs:
            by_intent[log.detected_intent]["count"] += 1
            if log.was_successful:
                by_intent[log.detected_intent]["successful"] += 1

        breakdown = [
            IntentBreakdown(intent=intent, count=v["count"], successful=v["successful"])
            for intent, v in sorted(by_intent.items(), key=lambda kv: -kv[1]["count"])
        ]
        return total, successful, breakdown

    def get_analytics(self) -> AnalyticsOut:
        entries = self.repo.active_entries()
        total_queries, successful_queries, breakdown = self._assistant_stats()

        return AnalyticsOut(
            faculty_utilization_percent=self._faculty_utilization(),
            classroom_utilization_percent=self._room_utilization(entries, RoomType.classroom),
            laboratory_utilization_percent=self._room_utilization(entries, RoomType.laboratory),
            student_idle_time_percent=self._student_idle_time(entries),
            active_sessions_count=len(entries),
            pending_requests_count=self.repo.pending_requests_count(),
            total_faculty_count=len(self.repo.faculty_count()),
            assistant_queries_total=total_queries,
            assistant_queries_successful=successful_queries,
            assistant_queries_by_intent=breakdown,
            last_generated_at=self.repo.last_generated_at(),
        )

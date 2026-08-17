from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from sqlalchemy.orm import joinedload

from app.models.division import Division
from app.models.lecture_request import LectureRequest, RequestStatus, RequestType
from app.models.room import Room, RoomType
from app.models.subject import Subject
from app.models.subject_faculty_assignment import SubjectFacultyAssignment
from app.models.time_slot import TimeSlot
from app.models.timetable_entry import TimetableEntry
from app.repositories.assistant_log_repository import AssistantLogRepository
from app.repositories.faculty_repository import FacultyRepository
from app.scheduling.assistant.entity_extractor import extract_day, extract_division, extract_subject, extract_time_range
from app.scheduling.assistant.intent_engine import Intent, detect_intent
from app.scheduling.assistant.recommender import Candidate, ScoredCandidate, rank_candidates
from app.scheduling.constraints import get_blocked_slot_ids
from app.schemas.assistant import (
    AssistantConfirmRequest,
    AssistantConfirmResponse,
    AssistantQueryRequest,
    AssistantQueryResponse,
    ReasonOut,
    RecommendationOut,
)
from app.services.schedule_service import ScheduleService

ACADEMIC_TERM = "2026-ODD"


class AssistantService:
    def __init__(self, db: Session):
        self.db = db
        self.faculty_repo = FacultyRepository(db)
        self.logs = AssistantLogRepository(db)

    # ---------- shared data-gathering helpers ----------

    def _all_subjects_for_extraction(self) -> list[dict]:
        return [
            {"subject_id": s.subject_id, "code": s.code, "name": s.name} for s in self.db.query(Subject).all()
        ]

    def _all_divisions_for_extraction(self) -> list[dict]:
        divisions = (
            self.db.query(Division)
            .options(joinedload(Division.academic_year))
            .all()
        )
        out = []
        for d in divisions:
            label = f"{d.academic_year.name}-{d.name}"
            out.append({"division_id": d.division_id, "label": label})
        return out

    def _division_label(self, division: Division) -> str:
        return f"{division.academic_year.name}-{division.name}"

    def _faculty_assignments(self, faculty_id: int) -> list[SubjectFacultyAssignment]:
        return (
            self.db.query(SubjectFacultyAssignment)
            .options(
                joinedload(SubjectFacultyAssignment.subject),
                joinedload(SubjectFacultyAssignment.division).joinedload(Division.academic_year),
            )
            .filter(SubjectFacultyAssignment.faculty_id == faculty_id)
            .all()
        )

    def _occupied_slot_ids(self, **filters) -> set[int]:
        query = self.db.query(TimetableEntry.time_slot_id).filter(TimetableEntry.is_active.is_(True))
        for key, value in filters.items():
            query = query.filter(getattr(TimetableEntry, key) == value)
        return {row[0] for row in query.all()}

    def _room_occupied_map(self, room_type: RoomType) -> dict[int, set[int]]:
        rooms = self.db.query(Room).filter(Room.room_type == room_type, Room.is_active.is_(True)).all()
        occupied: dict[int, set[int]] = {}
        for r in rooms:
            occupied[r.room_id] = self._occupied_slot_ids(room_id=r.room_id)
        return occupied

    def _division_day_slot_orders(self, division_id: int) -> dict[str, set[int]]:
        rows = (
            self.db.query(TimeSlot.day_of_week, TimeSlot.slot_order)
            .join(TimetableEntry, TimetableEntry.time_slot_id == TimeSlot.time_slot_id)
            .filter(TimetableEntry.division_id == division_id, TimetableEntry.is_active.is_(True))
            .all()
        )
        result: dict[str, set[int]] = {}
        for day, slot_order in rows:
            result.setdefault(day.value, set()).add(slot_order)
        return result

    def _teaching_slot_bounds(self) -> tuple[int, int]:
        orders = [row[0] for row in self.db.query(TimeSlot.slot_order).filter(TimeSlot.is_break.is_(False)).all()]
        return (min(orders), max(orders)) if orders else (0, 0)

    def _to_recommendation_out(self, sc: ScoredCandidate, subject_name: str, division_label: str) -> RecommendationOut:
        return RecommendationOut(
            division=division_label,
            subject=subject_name,
            day=sc.candidate.day_of_week,
            start_time=sc.candidate.start_time,
            end_time=sc.candidate.end_time,
            room=sc.candidate.room_name,
            room_id=sc.candidate.room_id,
            time_slot_id=sc.candidate.time_slot_id,
            subject_id=0,  # filled by caller (kept out of Candidate to keep the recommender subject-agnostic)
            division_id=0,
            score=sc.score,
            reasons=[ReasonOut(label=c.label, satisfied=c.satisfied) for c in sc.checks],
        )

    def _build_candidates(
        self, room_type: RoomType, day_filter: Optional[str], time_filter: Optional[str]
    ) -> list[Candidate]:
        slot_query = self.db.query(TimeSlot).filter(TimeSlot.is_break.is_(False))
        if day_filter:
            slot_query = slot_query.filter(TimeSlot.day_of_week == day_filter)
        slots = slot_query.all()
        if time_filter:
            slots = [s for s in slots if s.start_time.strftime("%H:%M") == time_filter]

        rooms = self.db.query(Room).filter(Room.room_type == room_type, Room.is_active.is_(True)).all()

        candidates = []
        for slot in slots:
            for room in rooms:
                candidates.append(
                    Candidate(
                        time_slot_id=slot.time_slot_id,
                        day_of_week=slot.day_of_week.value,
                        slot_order=slot.slot_order,
                        start_time=slot.start_time.strftime("%H:%M"),
                        end_time=slot.end_time.strftime("%H:%M"),
                        room_id=room.room_id,
                        room_name=room.name,
                        room_capacity=room.capacity,
                    )
                )
        return candidates

    # ---------- main entry point ----------

    def handle_query(self, faculty_user_id: int, request: AssistantQueryRequest) -> AssistantQueryResponse:
        faculty = self.faculty_repo.get_by_user_id(faculty_user_id)
        if not faculty:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty profile not found.")

        intent = detect_intent(request.query)
        response = self._dispatch(intent, faculty, request)

        self.logs.log(
            faculty_id=faculty.faculty_id,
            query_text=request.query,
            detected_intent=intent.value,
            was_successful=response.recommendation is not None or bool(response.data),
        )
        return response

    def _dispatch(self, intent: Intent, faculty, request: AssistantQueryRequest) -> AssistantQueryResponse:
        if intent in (Intent.schedule_extra_lecture, Intent.schedule_replacement_lecture):
            return self._handle_schedule_request(intent, faculty, request)
        if intent == Intent.find_empty_classroom:
            return self._handle_find_room(faculty, request, RoomType.classroom)
        if intent == Intent.find_empty_laboratory:
            return self._handle_find_room(faculty, request, RoomType.laboratory)
        if intent == Intent.check_workload:
            return self._handle_check_workload(faculty)
        if intent == Intent.view_timetable:
            return self._handle_view_timetable(faculty)
        if intent == Intent.find_faculty_availability:
            return self._handle_faculty_availability(faculty, request)
        if intent == Intent.find_common_free_slot:
            return self._handle_common_free_slot(faculty, request)
        return AssistantQueryResponse(
            intent=intent.value,
            message=(
                "I didn't understand that. Try things like: \"Schedule an extra DBMS lecture\", "
                "\"Find an empty classroom tomorrow\", \"What's my workload?\", or \"Show my timetable\"."
            ),
        )

    # ---------- intent handlers ----------

    def _handle_schedule_request(
        self, intent: Intent, faculty, request: AssistantQueryRequest
    ) -> AssistantQueryResponse:
        subject_id = request.subject_id or extract_subject(request.query, self._all_subjects_for_extraction())
        division_id = request.division_id or extract_division(request.query, self._all_divisions_for_extraction())

        assignments = self._faculty_assignments(faculty.faculty_id)
        if not subject_id or not division_id:
            taught = ", ".join(f"{a.subject.code} to {self._division_label(a.division)}" for a in assignments)
            return AssistantQueryResponse(
                intent=intent.value,
                message=(
                    f"I couldn't tell which subject and division you mean. You teach: {taught or 'nothing yet'}. "
                    "Please specify, e.g. \"Schedule an extra CS301 lecture for TY-A\"."
                ),
            )

        assignment = next(
            (a for a in assignments if a.subject_id == subject_id and a.division_id == division_id), None
        )
        if not assignment:
            return AssistantQueryResponse(
                intent=intent.value,
                message="You don't currently have an assignment to teach that subject to that division.",
            )

        day_filter = extract_day(request.query)
        time_range = extract_time_range(request.query)
        time_filter = time_range.start if time_range else None

        candidates = self._build_candidates(RoomType.classroom, day_filter, time_filter)
        if not candidates:
            return AssistantQueryResponse(
                intent=intent.value,
                message="No classroom slots match that day/time — try a different day.",
            )

        faculty_occupied = self._occupied_slot_ids(faculty_id=faculty.faculty_id)
        division_occupied = self._occupied_slot_ids(division_id=division_id)
        room_occupied = self._room_occupied_map(RoomType.classroom)
        blocked = get_blocked_slot_ids(self.db)
        division = self.db.query(Division).filter(Division.division_id == division_id).first()
        min_order, max_order = self._teaching_slot_bounds()

        ranked = rank_candidates(
            candidates,
            faculty_occupied_slot_ids=faculty_occupied,
            division_occupied_slot_ids=division_occupied,
            room_occupied_slot_ids=room_occupied,
            blocked_slot_ids=blocked,
            division_strength=division.strength if division else None,
            division_day_slot_orders=self._division_day_slot_orders(division_id),
            min_slot_order=min_order,
            max_slot_order=max_order,
        )

        if not ranked:
            return AssistantQueryResponse(
                intent=intent.value,
                message="No available slot found — every classroom is either booked or the faculty/division is busy at the times I checked.",
            )

        subject = assignment.subject
        division_label = self._division_label(division)
        best = self._to_recommendation_out(ranked[0], subject.name, division_label)
        best.subject_id, best.division_id = subject_id, division_id
        alternates = []
        for sc in ranked[1:4]:
            alt = self._to_recommendation_out(sc, subject.name, division_label)
            alt.subject_id, alt.division_id = subject_id, division_id
            alternates.append(alt)

        return AssistantQueryResponse(
            intent=intent.value,
            message=f"Here's the best slot I found for {subject.code} — {division_label}.",
            recommendation=best,
            alternates=alternates,
        )

    def _handle_find_room(self, faculty, request: AssistantQueryRequest, room_type: RoomType) -> AssistantQueryResponse:
        day = extract_day(request.query) or datetime.now(timezone.utc).strftime("%A")
        if day not in ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"):
            day = "Monday"
        time_range = extract_time_range(request.query)
        time_filter = time_range.start if time_range else None

        candidates = self._build_candidates(room_type, day, time_filter)
        room_occupied = self._room_occupied_map(room_type)

        free = []
        for c in candidates:
            if c.time_slot_id not in room_occupied.get(c.room_id, set()):
                free.append(c)
        free.sort(key=lambda c: (c.slot_order, c.room_name))

        data = [
            {
                "room": c.room_name,
                "capacity": c.room_capacity,
                "day": c.day_of_week,
                "start_time": c.start_time,
                "end_time": c.end_time,
            }
            for c in free[:10]
        ]
        room_word = "laboratory" if room_type == RoomType.laboratory else "classroom"
        message = (
            f"Found {len(free)} free {room_word} slot(s) on {day}."
            if free
            else f"No free {room_word}s found on {day} — try another day."
        )
        return AssistantQueryResponse(intent=(Intent.find_empty_laboratory if room_type == RoomType.laboratory else Intent.find_empty_classroom).value, message=message, data=data)

    def _handle_check_workload(self, faculty) -> AssistantQueryResponse:
        workload = ScheduleService(self.db).get_workload(faculty.user_id)
        message = (
            f"You have {workload.scheduled_hours}/{workload.max_weekly_hours} hours scheduled this week "
            f"({workload.utilization_percent}% utilization)."
        )
        return AssistantQueryResponse(intent=Intent.check_workload.value, message=message, data=[workload.model_dump()])

    def _handle_view_timetable(self, faculty) -> AssistantQueryResponse:
        entries = ScheduleService(self.db).get_weekly_timetable(faculty.user_id)
        message = (
            f"You have {len(entries)} class(es) scheduled this week."
            if entries
            else "Your timetable is empty — nothing generated yet, or you have no classes this week."
        )
        return AssistantQueryResponse(
            intent=Intent.view_timetable.value,
            message=message,
            data=[e.model_dump(mode="json") for e in entries],
        )

    def _handle_faculty_availability(self, faculty, request: AssistantQueryRequest) -> AssistantQueryResponse:
        day = extract_day(request.query) or datetime.now(timezone.utc).strftime("%A")
        if day not in ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"):
            day = "Monday"
        slots = self.db.query(TimeSlot).filter(TimeSlot.day_of_week == day, TimeSlot.is_break.is_(False)).all()
        occupied = self._occupied_slot_ids(faculty_id=faculty.faculty_id)
        free_slots = [s for s in slots if s.time_slot_id not in occupied]
        data = [
            {"day": day, "start_time": s.start_time.strftime("%H:%M"), "end_time": s.end_time.strftime("%H:%M")}
            for s in sorted(free_slots, key=lambda s: s.slot_order)
        ]
        message = (
            f"You're free for {len(free_slots)} slot(s) on {day}."
            if free_slots
            else f"You're fully booked on {day}."
        )
        return AssistantQueryResponse(intent=Intent.find_faculty_availability.value, message=message, data=data)

    def _handle_common_free_slot(self, faculty, request: AssistantQueryRequest) -> AssistantQueryResponse:
        division_id = request.division_id or extract_division(request.query, self._all_divisions_for_extraction())
        if not division_id:
            return AssistantQueryResponse(
                intent=Intent.find_common_free_slot.value,
                message="Which division? e.g. \"Find a common free slot for TY-A\".",
            )

        day = extract_day(request.query)
        slot_query = self.db.query(TimeSlot).filter(TimeSlot.is_break.is_(False))
        if day:
            slot_query = slot_query.filter(TimeSlot.day_of_week == day)
        slots = slot_query.all()

        faculty_occupied = self._occupied_slot_ids(faculty_id=faculty.faculty_id)
        division_occupied = self._occupied_slot_ids(division_id=division_id)
        blocked = get_blocked_slot_ids(self.db)

        free = [
            s
            for s in slots
            if s.time_slot_id not in faculty_occupied
            and s.time_slot_id not in division_occupied
            and s.time_slot_id not in blocked
        ]
        free.sort(key=lambda s: (s.day_of_week.value, s.slot_order))
        data = [
            {"day": s.day_of_week.value, "start_time": s.start_time.strftime("%H:%M"), "end_time": s.end_time.strftime("%H:%M")}
            for s in free[:10]
        ]
        message = (
            f"Found {len(free)} common free slot(s) for you and this division."
            if free
            else "No common free slots found — try a specific day."
        )
        return AssistantQueryResponse(intent=Intent.find_common_free_slot.value, message=message, data=data)

    # ---------- submit recommendation for approval ----------

    def confirm_booking(self, faculty_user_id: int, request: AssistantConfirmRequest) -> AssistantConfirmResponse:
        faculty = self.faculty_repo.get_by_user_id(faculty_user_id)
        if not faculty:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty profile not found.")

        # Re-validate before creating the pending request. Admin approval
        # repeats this check, because the recommendation can become stale
        # while it waits in the approval queue.
        faculty_occupied = self._occupied_slot_ids(faculty_id=faculty.faculty_id)
        division_occupied = self._occupied_slot_ids(division_id=request.division_id)
        room_occupied = self._occupied_slot_ids(room_id=request.room_id)
        blocked = get_blocked_slot_ids(self.db)

        if request.time_slot_id in (faculty_occupied | division_occupied | room_occupied | blocked):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="That slot is no longer available — please ask the assistant again for a fresh recommendation.",
            )

        lecture_request = LectureRequest(
            faculty_id=faculty.faculty_id,
            subject_id=request.subject_id,
            division_id=request.division_id,
            request_type=RequestType(request.request_type),
            recommended_time_slot_id=request.time_slot_id,
            recommended_room_id=request.room_id,
            recommendation_score=request.score,
            requested_at=datetime.now(timezone.utc),
        )
        self.db.add(lecture_request)
        self.db.commit()
        self.db.refresh(lecture_request)

        self.logs.log(
            faculty_id=faculty.faculty_id,
            query_text="(confirmed booking via assistant)",
            detected_intent="confirm_booking",
            was_successful=True,
            related_request_id=lecture_request.request_id,
        )

        return AssistantConfirmResponse(
            message="Lecture request submitted for admin approval.",
            request_id=lecture_request.request_id,
        )

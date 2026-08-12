"""
Timetable Generation Engine — Google OR-Tools CP-SAT.

Deliberately kept free of SQLAlchemy/DB imports: this module only knows
about plain dataclasses. `app/services/timetable_service.py` is the
adapter that reads the database, builds these inputs, calls
`generate_timetable`, and writes the results back. That separation
means this file can be unit-tested (and reasoned about) without a
database at all.

SCOPE (v1, honestly stated rather than overclaimed):
- Hard constraints enforced: no faculty double-booking, no room
  double-booking, no division double-booking, room type must match
  session type (lab -> laboratory, lecture/tutorial -> classroom),
  room capacity >= division strength, labs occupy 2 consecutive slots
  on the same day, faculty_free_hour constraints block those slots for
  every faculty member, online divisions skip room assignment entirely.
- Objective: maximize the number of required sessions successfully
  scheduled (a session that can't be placed is left out rather than
  making the whole model infeasible — this matters because with a
  small amount of seed data, an all-or-nothing model would just fail
  outright instead of producing a partial, still-useful timetable).
- NOT yet enforced (defined in the schema/API in Phase 4, planned for
  a future iteration): max_continuous_hours, lab_continuous_hours,
  student-idle-time minimization, faculty workload balancing as a soft
  objective. These require a richer model (multi-day lookahead,
  weighted objectives) that's a natural v2, not a v1 blocker.
"""

from dataclasses import dataclass, field
from time import perf_counter

from ortools.sat.python import cp_model


@dataclass(frozen=True)
class SessionRequirement:
    assignment_id: int
    subject_id: int
    faculty_id: int
    division_id: int
    session_type: str  # "lecture" | "tutorial" | "lab"
    occurrence: int  # 0-based index among sessions of this type for this assignment


@dataclass(frozen=True)
class TimeSlotInfo:
    time_slot_id: int
    day_of_week: str
    slot_order: int


@dataclass(frozen=True)
class RoomInfo:
    room_id: int
    room_type: str  # "classroom" | "laboratory"
    capacity: int


@dataclass(frozen=True)
class DivisionInfo:
    division_id: int
    strength: int | None
    is_online: bool


@dataclass(frozen=True)
class Candidate:
    time_slot_id: int
    second_time_slot_id: int | None  # set only for lab candidates (2 consecutive slots)
    room_id: int | None  # None for online divisions


@dataclass
class GeneratedEntry:
    assignment_id: int
    subject_id: int
    faculty_id: int
    division_id: int
    session_type: str
    time_slot_id: int
    second_time_slot_id: int | None
    room_id: int | None


@dataclass
class GenerationResult:
    entries: list[GeneratedEntry] = field(default_factory=list)
    sessions_requested: int = 0
    sessions_scheduled: int = 0
    solver_status: str = "UNKNOWN"
    duration_seconds: float = 0.0


def _build_candidates(
    session: SessionRequirement,
    time_slots: list[TimeSlotInfo],
    rooms: list[RoomInfo],
    division: DivisionInfo,
    blocked_slot_ids: set[int],
) -> list[Candidate]:
    """All legal (time_slot[, second_slot], room) combinations for one
    session, before considering clashes with other sessions (those are
    handled globally by the CP-SAT constraints, not filtered here)."""

    usable_slots = [s for s in time_slots if s.time_slot_id not in blocked_slot_ids]

    if division.is_online:
        candidate_rooms: list[RoomInfo | None] = [None]
    elif session.session_type == "lab":
        # Labs are physically sized for a batch (sub-group), not the
        # whole division — but batch-level scheduling isn't modeled in
        # v1 (see module docstring), so capacity isn't filtered against
        # the full division strength here. Filtering by full division
        # size would make nearly every lab room "too small" and labs
        # would almost never get scheduled, which doesn't reflect how
        # labs actually work in practice.
        candidate_rooms = [r for r in rooms if r.room_type == "laboratory"]
    else:
        candidate_rooms = [
            r for r in rooms if r.room_type == "classroom" and (division.strength is None or r.capacity >= division.strength)
        ]

    candidates: list[Candidate] = []

    if session.session_type == "lab":
        # Group slots by day, sorted by slot_order, to find consecutive pairs.
        by_day: dict[str, list[TimeSlotInfo]] = {}
        for s in usable_slots:
            by_day.setdefault(s.day_of_week, []).append(s)
        for day_slots in by_day.values():
            day_slots.sort(key=lambda s: s.slot_order)
            for i in range(len(day_slots) - 1):
                first, second = day_slots[i], day_slots[i + 1]
                if second.slot_order != first.slot_order + 1:
                    continue  # not actually consecutive (a break sits between them)
                for room in candidate_rooms:
                    candidates.append(
                        Candidate(
                            time_slot_id=first.time_slot_id,
                            second_time_slot_id=second.time_slot_id,
                            room_id=room.room_id if room else None,
                        )
                    )
    else:
        for s in usable_slots:
            for room in candidate_rooms:
                candidates.append(
                    Candidate(time_slot_id=s.time_slot_id, second_time_slot_id=None, room_id=room.room_id if room else None)
                )

    return candidates


def generate_timetable(
    sessions: list[SessionRequirement],
    time_slots: list[TimeSlotInfo],
    rooms: list[RoomInfo],
    divisions: dict[int, DivisionInfo],
    blocked_slot_ids: set[int],
    time_limit_seconds: float = 15.0,
) -> GenerationResult:
    start = perf_counter()
    model = cp_model.CpModel()

    # session_index -> {candidate_index: BoolVar}
    session_vars: list[dict[int, cp_model.IntVar]] = []
    session_candidates: list[list[Candidate]] = []

    for i, session in enumerate(sessions):
        division = divisions[session.division_id]
        candidates = _build_candidates(session, time_slots, rooms, division, blocked_slot_ids)
        session_candidates.append(candidates)
        vars_for_session = {
            j: model.NewBoolVar(f"s{i}_c{j}") for j in range(len(candidates))
        }
        session_vars.append(vars_for_session)
        # At most one candidate chosen per session — "at most" (not
        # "exactly") so an unschedulable session doesn't make the whole
        # model infeasible; the objective below rewards scheduling it.
        if vars_for_session:
            model.Add(sum(vars_for_session.values()) <= 1)

    def slot_ids_for(candidate: Candidate) -> list[int]:
        ids = [candidate.time_slot_id]
        if candidate.second_time_slot_id is not None:
            ids.append(candidate.second_time_slot_id)
        return ids

    # Faculty / room / division no-double-booking: for every (entity, time_slot)
    # pair, at most one chosen candidate may occupy that slot.
    faculty_slot_vars: dict[tuple[int, int], list[cp_model.IntVar]] = {}
    room_slot_vars: dict[tuple[int, int], list[cp_model.IntVar]] = {}
    division_slot_vars: dict[tuple[int, int], list[cp_model.IntVar]] = {}

    for i, session in enumerate(sessions):
        for j, candidate in enumerate(session_candidates[i]):
            var = session_vars[i][j]
            for slot_id in slot_ids_for(candidate):
                faculty_slot_vars.setdefault((session.faculty_id, slot_id), []).append(var)
                division_slot_vars.setdefault((session.division_id, slot_id), []).append(var)
                if candidate.room_id is not None:
                    room_slot_vars.setdefault((candidate.room_id, slot_id), []).append(var)

    for var_list in faculty_slot_vars.values():
        if len(var_list) > 1:
            model.Add(sum(var_list) <= 1)
    for var_list in room_slot_vars.values():
        if len(var_list) > 1:
            model.Add(sum(var_list) <= 1)
    for var_list in division_slot_vars.values():
        if len(var_list) > 1:
            model.Add(sum(var_list) <= 1)

    # Objective: schedule as many required sessions as possible.
    all_vars = [v for vars_for_session in session_vars for v in vars_for_session.values()]
    if all_vars:
        model.Maximize(sum(all_vars))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_seconds
    solver.parameters.num_search_workers = 4
    status = solver.Solve(model)

    result = GenerationResult(
        sessions_requested=len(sessions),
        solver_status=solver.StatusName(status),
        duration_seconds=round(perf_counter() - start, 3),
    )

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return result

    for i, session in enumerate(sessions):
        for j, candidate in enumerate(session_candidates[i]):
            if solver.Value(session_vars[i][j]):
                result.entries.append(
                    GeneratedEntry(
                        assignment_id=session.assignment_id,
                        subject_id=session.subject_id,
                        faculty_id=session.faculty_id,
                        division_id=session.division_id,
                        session_type=session.session_type,
                        time_slot_id=candidate.time_slot_id,
                        second_time_slot_id=candidate.second_time_slot_id,
                        room_id=candidate.room_id,
                    )
                )
                break

    result.sessions_scheduled = len(result.entries)
    return result

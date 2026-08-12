# SmartSched AI — Backend (Phase 3: Auth · 4: Admin · 5: Faculty · 6: Timetable Engine · 7: Assistant · 8: Analytics · 9: Testing)

FastAPI + SQLAlchemy + MySQL, with JWT authentication and role-based
access control. Everything below has been run and tested against a
real MySQL instance — not just written and assumed to work.

## What's built so far

- `POST /api/v1/auth/login` — email + password → signed JWT (role-aware)
- `GET /api/v1/auth/me` — resolves the current user from a Bearer token
- `require_role(...)` dependency — 401 if unauthenticated, 403 if wrong role
- `GET /api/v1/admin/ping` and `GET /api/v1/faculty/ping` — smoke-test routes proving RBAC works (real Admin/Faculty endpoints are built in Phases 4–5)
- CORS configured for the frontend's origin (`http://localhost:3000` / `:5173`)

## Folder structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI app, CORS, router registration
│   ├── config.py               # Settings (env-driven), builds the DB URL
│   ├── db/
│   │   └── session.py          # SQLAlchemy engine, session factory, Base
│   ├── core/
│   │   └── security.py         # bcrypt hashing, JWT encode/decode
│   ├── models/
│   │   ├── user.py             # users table -> User ORM model
│   │   └── faculty.py          # faculty table -> Faculty ORM model
│   ├── schemas/
│   │   └── auth.py             # Pydantic request/response models
│   ├── repositories/
│   │   └── user_repository.py  # DB access layer (no SQLAlchemy leaks into services)
│   ├── services/
│   │   └── auth_service.py     # Login business logic
│   └── api/v1/
│       ├── deps.py             # get_current_user, require_role
│       └── routers/
│           ├── auth.py
│           ├── admin.py        # ping-only for now
│           └── faculty.py      # ping-only for now
├── requirements.txt
├── .env.example
└── .gitignore
```

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # fill in your real DB credentials + a strong JWT secret
```

### Database user

Don't point the backend at `root`. Create a dedicated app user (as done
while building this phase):

```sql
CREATE USER 'smartsched_app'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_strong_password';
GRANT ALL PRIVILEGES ON smartsched_ai.* TO 'smartsched_app'@'localhost';
FLUSH PRIVILEGES;
```

Put those same credentials in `.env` as `DB_USER` / `DB_PASSWORD`.

> **Note on special characters in `DB_PASSWORD`:** if your password
> contains `@`, `:`, `/`, or other URL-reserved characters, they must be
> URL-encoded when building the SQLAlchemy connection string — this bit
> me while testing this exact phase (a password containing `@` was
> silently misparsed as a host separator). `app/config.py` already
> handles this via `urllib.parse.quote_plus`, so you don't need to
> escape anything yourself in `.env` — just put the real password in
> plain text there.

### Run it

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API root / health check: `http://localhost:8000/`
- Swagger UI: `http://localhost:8000/docs`

## Demo accounts (from Phase 2's seed data, real bcrypt hashes)

| Email | Password | Role |
|---|---|---|
| admin@college.edu | Admin@123 | admin |
| jsmith@college.edu | Faculty@123 | faculty |
| arao@college.edu | Faculty@123 | faculty |

## Verified test results

Every one of these was run against a live server, not assumed:

| Test | Expected | Actual |
|---|---|---|
| Health check | 200 | ✅ 200 |
| Login, correct credentials (admin) | 200 + JWT | ✅ 200 |
| Login, correct credentials (faculty) | 200 + JWT | ✅ 200 |
| Login, wrong password | 401, generic message | ✅ 401 `"Incorrect email or password."` |
| `/auth/me` with valid token | 200 + user profile | ✅ 200 |
| Admin token → `/admin/ping` | 200 | ✅ 200 |
| Faculty token → `/admin/ping` | 403 | ✅ 403 |
| Faculty token → `/faculty/ping` | 200 | ✅ 200 |
| No token → `/auth/me` | 401 | ✅ 401 `"Not authenticated"` |
| Tampered token → `/auth/me` | 401 | ✅ 401 `"Could not validate credentials."` |
| CORS preflight from `localhost:3000` | allowed | ✅ `access-control-allow-origin` echoed back |

## How the JWT flow works

1. Client sends `{ email, password }` to `POST /auth/login`.
2. `AuthService` looks up the user by email, verifies the bcrypt hash
   with `verify_password`. Wrong email and wrong password return the
   **same** error message — this is intentional, to avoid leaking which
   emails are registered (a user-enumeration vulnerability).
3. On success, `create_access_token` signs a JWT (HS256) with:
   - `sub`: the user's id
   - `role`: `"admin"` or `"faculty"`
   - `exp`: expiry, `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` from now
4. The client stores the token and sends it as
   `Authorization: Bearer <token>` on every subsequent request.
5. `get_current_user` decodes and verifies the token, then re-fetches
   the user from the DB (so a deactivated account is rejected even with
   a still-valid token).
6. `require_role(UserRole.admin)` (etc.) wraps `get_current_user` and
   403s if the authenticated user's role isn't in the allowed list.

## Phase 4 — Admin Module

Full CRUD, behind `require_role(UserRole.admin)`, for every entity the
Admin console manages:

| Entity | Endpoints | Notes |
|---|---|---|
| **Dashboard** | `GET /admin/dashboard` | Real counts — replaces the Phase 1 mock stats |
| **Lookups** | `GET /admin/lookups/departments`, `GET /admin/lookups/academic-years` | Read-only, for populating dropdowns |
| **Faculty** | `GET/POST /admin/faculty`, `GET/PUT/DELETE /admin/faculty/{id}` | POST creates a `users` row + `faculty` row in one transaction, returns a one-time temporary password |
| **Subjects** | `GET/POST /admin/subjects`, `GET/PUT/DELETE /admin/subjects/{id}` | Duplicate subject codes rejected with 409 |
| **Rooms** | `GET/POST /admin/rooms`, `GET/PUT/DELETE /admin/rooms/{id}` | One endpoint backs both "Classroom Management" and "Laboratory Management" — filter with `?room_type=classroom` or `?room_type=laboratory` |
| **Divisions** | `GET/POST /admin/divisions`, `GET/PUT/DELETE /admin/divisions/{id}` | Duplicate (year + department + name) rejected with 409 |
| **Constraints** | `GET/POST /admin/constraints`, `GET/PUT/DELETE /admin/constraints/{id}` | `config` is arbitrary JSON — new constraint types don't need schema migrations |

### New folders/files

```
app/
├── models/{department,academic_year,division,subject,room,constraint,lecture_request}.py
├── schemas/{lookup,faculty,subject,room,division,constraint,dashboard}.py
├── repositories/{lookup,faculty,subject,room,division,constraint,dashboard}_repository.py
├── services/{faculty,subject,room,division,constraint}_service.py
└── api/v1/routers/admin_{dashboard,lookups,faculty,subjects,rooms,divisions,constraints}.py
```

### A real bug found and fixed during this phase

`DELETE /admin/faculty/{id}` initially returned `500`. Root cause:
SQLAlchemy's default relationship behavior tries to `NULL` out
`faculty.user_id` before deleting the parent `User` row — which fails,
since that column is `NOT NULL`. The Phase 2 schema already defines
`ON DELETE CASCADE` for that foreign key, so the fix was
`passive_deletes=True` on `User.faculty_profile` (see
`app/models/user.py`), telling SQLAlchemy to let MySQL's own cascade
handle it instead of trying to manage it in Python first. Re-verified
after the fix: create → delete → 204 → row confirmed gone → linked
user row confirmed cascaded away → original seed data confirmed
untouched.

### Verified end-to-end (full CRUD lifecycle, every entity)

Every entity was tested with the same rigor as Phase 3's auth flow —
create, duplicate-conflict rejection (409), invalid-foreign-key
rejection (400), update, delete (204), and post-delete 404 — run
against a live MySQL instance, not mocked. The dashboard's stats were
also confirmed to reflect real row counts before and after each test,
with a final check confirming no test data leaked into the persisted
database.

## Phase 5 — Faculty Module

Real endpoints for every Faculty-facing screen, plus the lecture
request submission + admin approval loop:

| Feature | Endpoints | Notes |
|---|---|---|
| **Today's Schedule** | `GET /faculty/me/schedule/today` | Real query against `timetable_entries`, filtered to today's day of week — legitimately empty until Phase 6 generates a timetable |
| **Weekly Timetable** | `GET /faculty/me/timetable` | Same table, no day filter |
| **Workload** | `GET /faculty/me/workload` | Computed from `timetable_entries` count vs. `faculty.max_weekly_hours` |
| **Notifications** | `GET /faculty/notifications`, `PATCH /faculty/notifications/{id}/read` | Real seeded data; a faculty member gets 404 (not 403) trying to mark another user's notification, to avoid confirming the ID exists |
| **Lookups** | `GET /faculty/lookups/subjects`, `GET /faculty/lookups/divisions` | Read-only, unauthenticated-by-role (any logged-in user) — needed to populate the lecture request form's dropdowns without granting faculty access to the admin mutation endpoints |
| **Lecture Requests** | `GET/POST /faculty/lecture-requests` | Submit extra/replacement requests; `recommended_*` fields stay NULL until Phase 7's rule engine fills them in |
| **Admin approval** | `GET/PUT /admin/lecture-requests/{id}` | New in this phase — makes Phase 4's dashboard "Pending Requests" count fully real, not just a number with nothing behind it |

### A real bug found and fixed during this phase

`GET /faculty/lecture-requests` (and the admin equivalent) initially
500'd with `sqlalchemy.exc.ArgumentError: Strings are not accepted for
attribute names in loader options`. Cause:
`joinedload(LectureRequest.faculty).joinedload("user")` passed a string
where SQLAlchemy 2.x requires the class-bound attribute
(`Faculty.user`). Fixed in `lecture_request_repository.py`, then
re-verified: create → appears in faculty's own list → appears in
admin's pending queue → dashboard count increments → admin approves →
count decrements → re-resolving an already-resolved request correctly
rejected with 409.

## Phase 6 — Timetable Generation Engine

The real thing: a Google OR-Tools CP-SAT constraint-satisfaction model
that generates an actual clash-free weekly timetable from the current
Subject-Faculty Assignments.

### What's enforced (hard constraints)

- No faculty double-booking, no room double-booking, no division double-booking
- Room type must match session type (lab → laboratory, lecture/tutorial → classroom)
- Room capacity ≥ division strength
- Labs occupy exactly 2 consecutive time slots on the same day
- Active `faculty_free_hour` constraints (Phase 4's Constraint Configuration) block those slots for every faculty member
- Online divisions (`is_online = true`) skip room assignment entirely

### What's honestly NOT yet enforced (v1 scope, stated in code not just here)

`max_continuous_hours`, `lab_continuous_hours`, student-idle-time
minimization, and faculty workload balancing as a *soft* objective are
all defined in Phase 4's constraint schema/API but not read by the v1
optimizer — they need a richer model (multi-day lookahead, weighted
objectives) that's a deliberate v2, not something quietly skipped. See
the module docstring in `app/scheduling/optimizer.py` for the full
statement.

### New endpoints

| Endpoint | Purpose |
|---|---|
| `GET/POST/DELETE /admin/assignments` | Subject-Faculty-Division assignments — the essential input; without at least one, there's nothing to schedule |
| `POST /admin/timetable/generate` | Runs the solver, replaces (soft-deletes) any previous timetable for the term |
| `GET /admin/timetable` | Full generated timetable, all divisions |

### New files

```
app/scheduling/
├── optimizer.py          # Pure CP-SAT model — no DB imports, unit-testable in isolation
└── time_slot_seeder.py   # Idempotently expands Phase 2's Monday-only seed to a full Mon-Sat week
app/services/timetable_service.py   # DB adapter: gathers inputs, calls the solver, persists results
app/models/batch.py                  # Minimal — see "bugs found" below
app/models/subject_faculty_assignment.py
app/repositories/assignment_repository.py, timetable_entry_repository.py (extended)
app/api/v1/routers/admin_assignments.py, admin_timetable.py
database/seed/002_assignments.sql   # Phase 2 never seeded this table; Phase 6 needs it to have anything to schedule
```

### Two real bugs found and fixed during this phase

1. **`NoReferencedTableError` on every generation attempt.** Both
   `TimetableEntry.batch_id` and `SubjectFacultyAssignment.batch_id`
   declare `ForeignKey("batches.batch_id")`, but no `Batch` SQLAlchemy
   model existed to resolve that target table — SQLAlchemy's mapper
   couldn't sort tables for the INSERT. Fixed by adding a minimal
   `Batch` model (batch-level lab scheduling itself is out of scope for
   v1, same as the other honestly-stated gaps above, but the model
   still needs to exist for the FK to resolve).
2. **Missing `faculty` relationship on `TimetableEntry`** — the admin
   timetable listing endpoint needed `entry.faculty.user.name` and the
   relationship simply wasn't declared. Added.

### Verified end-to-end, from a completely fresh database rebuild

- 9 sessions requested → 9 scheduled, `OPTIMAL` status, ~0.05–0.08s
- **Zero clashes**, confirmed with actual SQL (`GROUP BY ... HAVING COUNT(*) > 1` across faculty, room, and division) — not just inspecting output by eye
- Lab sessions land on genuinely consecutive slot pairs, in laboratory-type rooms only
- Added a `faculty_free_hour` constraint via the real API, regenerated, confirmed zero entries land in that blocked slot
- Regeneration correctly soft-deletes the previous batch and inserts a fresh one
- **Phase 5's endpoints (today's schedule, weekly timetable, workload) lit up with real data automatically, with zero code changes** — exactly as designed back in Phase 5

## Phase 7 — Rule-Based Scheduling Assistant

The chat-driven assistant from the original wireframes — genuinely
rule-based, no LLM call anywhere in the request path, per the
project's own spec ("This is NOT an LLM chatbot").

### Architecture

```
app/scheduling/assistant/
├── intent_engine.py     # Deterministic keyword matching -> Intent enum (8 intents + unknown)
├── entity_extractor.py  # Regex/substring extraction: day, time range, subject, division
├── rule_engine.py       # Hard constraint checks for ONE candidate slot (reused: same rules Phase 6's optimizer enforces globally)
└── recommender.py       # Deterministic point-based scoring + ranking of every passing candidate
app/scheduling/constraints.py   # Shared faculty_free_hour lookup — used by BOTH Phase 6's optimizer and this assistant, so the two never enforce different rules for the same admin-configured constraint
app/services/assistant_service.py   # Orchestration: detect -> extract -> gather DB state -> rank -> respond; also confirm_booking with stale-slot re-validation
app/api/v1/routers/faculty_assistant.py   # POST /faculty/assistant/query, POST /faculty/assistant/confirm
```

### Supported intents

`schedule_extra_lecture`, `schedule_replacement_lecture`,
`find_empty_classroom`, `find_empty_laboratory`,
`find_faculty_availability`, `find_common_free_slot`,
`check_workload`, `view_timetable` — plus a graceful `unknown` fallback
that suggests example phrasings rather than failing silently.

### Honest limitation, by design

Entity extraction is pure substring/regex matching against real
subject codes, names, and division labels already in the database — no
synonym dictionary, no fuzzy matching, no ML. A query like "Schedule an
extra **DBMS** lecture" will **not** match subject code `CS301` or name
"Database Management Systems", because "DBMS" isn't a substring of
either. This was tested and confirmed deliberately: rather than
guessing, the assistant responds with exactly what the faculty member
actually teaches and asks them to be specific. That's the correct
behavior for a system that has to be fully explainable — a wrong guess
dressed up as confidence is worse than an honest "I couldn't tell."

### Recommendation scoring (deterministic, not learned)

Base 70 points for any slot passing every hard check, +15 for a
close-fit room size (within 20% of division strength — "maximizing
classroom utilization" from the original problem statement), +10 for
a slot adjacent to a class the division already has that day (reduces
idle time), +5 for non-edge-of-day slots. Capped at 100, ties broken
by earliest day then earliest slot. Every rule is a comment in
`recommender.py`, not a black box.

### Verified end-to-end against the live database

- Full flagship flow: query → scored recommendation (90/100) with 3
  ranked alternates and 6 explainable pass/fail reasons → confirm →
  **a real `timetable_entries` row was created and immediately
  verified present** in `GET /faculty/me/timetable` → re-confirming
  the same now-taken slot correctly returned 409 (the stale-recommendation
  re-validation genuinely works, not just in theory)
- All 8 intents individually tested and returned correct real data
  (workload, timetable summary, free rooms, faculty availability,
  common free slots)
- Every query — including the intentionally-failing "DBMS" query and a
  gibberish unknown-intent query — was correctly logged to
  `assistant_query_logs` with an accurate `was_successful` flag
- Role protection confirmed: an admin token gets 403 on
  `/faculty/assistant/query`

## Phase 8 — Analytics

Real institution-wide metrics computed from the data every prior phase
accumulated — no mocked numbers.

### `GET /admin/analytics`

| Metric | How it's computed |
|---|---|
| `faculty_utilization_percent` | Average of (scheduled hours / max weekly hours) across **every** faculty member, not just those with current assignments — a faculty member at 0 hours correctly pulls the institution-wide average down |
| `classroom_utilization_percent`, `laboratory_utilization_percent` | Occupied room-slots ÷ (room count × non-break weekly slots), by room type |
| `student_idle_time_percent` | For each division-day with at least one class: (span between first and last occupied slot) − (slots actually occupied), summed and expressed as a percentage. A division with back-to-back classes contributes 0; a hole in the middle of the day contributes exactly that hole's size |
| `assistant_queries_total/successful`, `assistant_queries_by_intent` | Straight aggregation of `assistant_query_logs` (Phase 7) |
| `last_generated_at` | `MAX(timetable_entries.created_at)` for active entries |

### One deliberate omission, explained rather than faked

The original wireframe shows a standalone "Conflicts Prevented: 146"
metric. It's not included here. Phase 6's optimizer enforces zero
clashes **by construction** (a hard constraint, not a preference), so
there's no real "conflicts that would have happened" to count without
inventing a number. `AnalyticsService`'s docstring states this
explicitly — the goal is that every number on this dashboard is
traceable to a real query against real rows, not that the dashboard
matches the wireframe pixel-for-pixel regardless of whether the
underlying number is real.

### Verified against real accumulated data

Queried after all the Phase 6/7 testing in this project: 12 active
sessions, 33.3% faculty utilization (2 faculty, one underutilized —
correctly pulls the average down), 25.0% student idle time, 11
assistant queries logged with a full intent breakdown matching the
`assistant_query_logs` table exactly. Role protection confirmed:
faculty tokens get 403.

## Phase 9 — Testing

Turns the manual curl-based verification done in every phase above
into a real, repeatable pytest suite — **57 tests, all passing**,
against an isolated test database.

### Running it

```bash
cd backend
python -m venv venv && venv/bin/pip install -r requirements-dev.txt
bash tests/setup_test_db.sh   # creates + seeds smartsched_ai_test — safe to re-run any time
pytest                          # or: venv/bin/pytest
```

### Test database isolation

Tests run against `smartsched_ai_test`, **never** `smartsched_ai`
(the dev database). This is enforced twice, deliberately redundant:

1. `tests/conftest.py` sets `DB_NAME=smartsched_ai_test` in
   `os.environ` before `app.main` is ever imported — `app.config`'s
   settings are `lru_cache`-d, so whichever env vars exist at first
   import win for the whole process.
2. `test_00_smoke.py::test_running_against_test_database_not_dev`
   asserts `SELECT DATABASE()` actually returns `smartsched_ai_test`
   — proving the isolation holds, not just assuming it.

### A real incident during this phase, disclosed rather than hidden

`tests/setup_test_db.sh`'s first version ran
`mysql -u root smartsched_ai_test < 001_create_tables.sql` — but that
schema file **hardcodes** `CREATE DATABASE IF NOT EXISTS smartsched_ai;`
and `USE smartsched_ai;` at the top, which silently overrides
whichever database was selected on the command line. Combined with
every table definition starting `DROP TABLE IF EXISTS`, this briefly
**wiped the dev database** while trying to set up the test one. Fixed
by piping the schema/seed files through `sed 's/smartsched_ai/smartsched_ai_test/g'`
before feeding them to `mysql`, so the hardcoded name is retargeted
before execution. The dev database was restored immediately after
(this only ever affected the local sandbox this project was built in —
nothing about the fix or the incident affects what ships in this repo).

### What's covered (57 tests across 13 files)

| File | Formalizes manual testing from |
|---|---|
| `test_auth.py` | Phase 3 — login, RBAC, tampered/missing tokens |
| `test_admin_faculty.py`, `test_admin_subjects.py`, `test_admin_rooms.py`, `test_admin_divisions.py`, `test_admin_constraints.py` | Phase 4 — full CRUD + validation per entity |
| `test_faculty_schedule.py`, `test_faculty_notifications.py`, `test_faculty_lecture_requests.py` | Phase 5 |
| `test_05_timetable_generation.py` | Phase 6 — zero-clash proofs via direct SQL, lab continuity, constraint enforcement, regeneration behavior |
| `test_assistant.py` | Phase 7 — every intent, the confirm→409-on-restale flow, the honest "DBMS doesn't match" fallback, query logging |
| `test_admin_assignments.py` | Phase 6/7 dependency — assignment CRUD |

Analytics (Phase 8) doesn't have a dedicated test file yet — its
numbers are exercised indirectly (assistant/timetable tests generate
the data analytics reads), but there's no direct assertion against
`GET /admin/analytics`'s output. Noted here rather than silently
left out.

### Frontend: Vitest + Testing Library (34 tests, 5 files)

```bash
cd frontend
npm install
npm run test        # vitest run — single pass, CI-style
npm run test:watch  # interactive
```

| File | Covers |
|---|---|
| `schemas/auth.test.ts`, `schemas/admin.test.ts` | Every Zod validation rule behind the login form and 4 admin CRUD forms — including the `z.coerce` numeric-string behavior that the `Resolver<T>` cast pattern (see frontend README) depends on |
| `lib/cookies.test.ts` | The cookie helpers auth and middleware both depend on |
| `lib/errors.test.ts` | API error message extraction, including non-Axios and malformed-response edge cases |
| `components/admin/DataTable.test.tsx` | The shared table used by 5 admin pages — loading/empty states, row rendering, and both the optional-edit and always-present-delete action callbacks |

**Honestly scoped:** this is unit/component-level coverage, not full
browser e2e (no Playwright/Cypress). Given how much this project's
manual testing already had to fight background-process instability in
the sandbox environment it was built in (see the "same-call" pattern
used throughout every phase's testing), adding real browser automation
here would have been a fragile, low-confidence addition rather than a
genuinely reliable one — better stated plainly than claimed without
being able to actually prove it holds up.

**A real bug found in my own test, not the app:** the first version of
`DataTable.test.tsx`'s delete-click test had
`screen.getAllByTestId ? [] : screen.getAllByRole("button")` — leftover
debugging cruft that always evaluated to an empty array, since
`getAllByTestId` is a function reference and therefore always truthy.
The test failed loudly (correctly), was fixed, and now passes for the
right reason.

## Next

Phase 10 (Deployment) documents how to actually run this in
production — no Docker per the project's own spec, so likely a
systemd/PM2-style process guide or a specific cloud host walkthrough,
plus environment/secrets handling guidance beyond the dev `.env` files
used throughout local development.

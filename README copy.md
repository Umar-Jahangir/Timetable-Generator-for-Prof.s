# SmartSched AI

**An Intelligent Academic Timetable Generation and Dynamic Scheduling Assistant**

SmartSched AI is a full-stack, modular web platform that automatically generates optimized academic timetables while satisfying institutional constraints (faculty availability, classroom/lab allocation, workload balancing, student idle-time minimization), and provides a **Rule-Based Smart Scheduling Assistant** that lets faculty ask for things like *"Schedule an extra DBMS lecture"* and get a ranked, explainable recommendation.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Running the Project](#running-the-project)
- [Testing](#testing)
- [Folder Structure](#folder-structure)
- [API Documentation](#api-documentation)
- [Future Scope](#future-scope)
- [Contributors](#contributors)
- [License](#license)

---

## Project Overview

Manual timetable creation is slow, error-prone, and hard to optimize across faculty, classrooms, labs, and divisions. SmartSched AI solves this with two core modules:

### Build status

| Phase | Status | Notes |
|---|---|---|
| 1. Frontend | ✅ Done | **Migrated from CRA to Next.js 15** — see `frontend/README.md` for full migration notes |
| 2. Database Design | ✅ Done | 16 tables, 27 FKs, executed against real MySQL, seed data verified |
| 3. Authentication | ✅ Done | JWT + RBAC, tested end-to-end against the live DB; frontend now also uses Next.js middleware for edge-level redirects |
| 4. Admin Module | ✅ Done | Full CRUD (Faculty, Subjects, Rooms, Divisions, Constraints) + real dashboard stats — backend fully tested against live DB, frontend builds/lints/type-checks clean |
| 5. Faculty Module | ✅ Done | Today's Schedule, Weekly Timetable, Workload, Notifications all real; lecture request submission + admin approval loop fully wired end-to-end |
| 6. Timetable Generation Engine | ✅ Done | Real Google OR-Tools CP-SAT optimizer — zero clashes verified via SQL, not eyeballed; Phase 5's endpoints now show real data automatically |
| 7. Rule-Based Scheduling Assistant | ✅ Done | Genuinely rule-based (no LLM) intent detection + explainable scoring; full flagship flow verified end-to-end including stale-slot re-validation |
| 8. Analytics | ✅ Done | Real utilization/idle-time metrics from actual data; no fabricated "conflicts prevented" counter — see backend README for why |
| 9. Testing | ✅ Done | 57 backend pytest tests (isolated test DB) + 34 frontend Vitest tests, all passing; honestly scoped as unit/component-level, not full browser e2e |
| 10. Deployment | ⬜ Not started | |
| 7. Rule-Based Scheduling Assistant | ⬜ Not started | |
| 8. Analytics | ⬜ Not started | |
| 9. Testing | ⬜ Not started | |
| 10. Deployment | ⬜ Not started | |

| Module | Responsibility |
|---|---|
| **1. AI Timetable Optimization Engine** | Generates clash-free, workload-balanced, idle-time-minimized timetables using Google OR-Tools |
| **2. Smart Scheduling Assistant** | A rule-based (non-LLM) intent engine that finds free rooms/labs, schedules extra or replacement lectures, checks availability, and explains its recommendations |

The system supports two roles — **Administrator** (configures data, constraints, and generates timetables) and **Faculty** (views personal schedule, requests lectures, uses the assistant).

---

## Features

**Admin:** Login · Dashboard · Faculty/Subject/Classroom/Lab/Division Management · Timetable Generation & Editing · Timetable Export · Constraint Configuration

**Faculty:** Login · Personal Dashboard · Weekly Timetable · Today's Schedule · Notifications · Workload Statistics · Extra/Replacement Lecture Requests · AI Scheduling Assistant

**System:** Conflict Detection · Classroom/Faculty Allocation · Student Break Optimization · Workload Balancing · Dynamic Timetable Updates · Common Faculty Free Hour · Explainable Recommendations

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + Material UI + Axios + React Hook Form + Zod + TanStack Query |
| Backend | Python + FastAPI |
| Database | MySQL |
| ORM | SQLAlchemy |
| Authentication | JWT |
| Scheduling Engine | Google OR-Tools |
| Charts | Chart.js |
| Tooling | ESLint + Prettier + Husky (frontend) |
| Version Control | Git + GitHub |

> No Docker, no external LLM APIs (OpenAI/Gemini) are used. The AI Assistant is fully rule-based.
>
> **Migration note:** the frontend was originally scaffolded with Create React App, then migrated to Next.js 15 after CRA's tooling broke under Node 22 (`react-scripts` is unmaintained). See `frontend/README.md` for the complete before/after breakdown.

---

## Prerequisites

Make sure the following are installed on your machine:

- **Node.js** ≥ 18.18 (Next.js 15 requirement; this project has been built and tested on Node 22) and **npm** ≥ 9.x
- **Python** ≥ 3.10
- **MySQL Server** ≥ 8.0
- **Git**
- (Recommended) **pip** and **venv** for Python virtual environments

---

## Installation

Clone the repository:

```bash
git clone https://github.com/<your-org>/smartsched-ai.git
cd smartsched-ai
```

The project is organized as a monorepo with two independent apps: `backend/` and `frontend/`.

---

## Environment Variables

Create a `.env` file inside `backend/` (use `backend/.env.example` as a template):

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=smartsched_ai
DB_USER=root
DB_PASSWORD=your_mysql_password

# Auth
JWT_SECRET_KEY=your_super_secret_key
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60

# App
APP_ENV=development
BACKEND_CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

Create a `.env.local` file inside `frontend/` (use `frontend/.env.example` as a template):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

> Next.js only exposes environment variables prefixed `NEXT_PUBLIC_` to the browser. This replaces the `REACT_APP_*` convention from the project's original Create React App scaffold — see `frontend/README.md` for the full CRA → Next.js migration notes.

---

## Database Setup

1. Log into MySQL and create the database:

   ```sql
   CREATE DATABASE smartsched_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Apply the schema (SQL DDL scripts live in `database/schema/`):

   ```bash
   mysql -u root -p smartsched_ai < database/schema/001_create_tables.sql
   ```

3. (Optional) Seed sample data for local development:

   ```bash
   mysql -u root -p smartsched_ai < database/seed/seed_data.sql
   ```

4. If using Alembic migrations instead of raw SQL:

   ```bash
   cd backend
   alembic upgrade head
   ```

---

## Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env            # then fill in your values

# Run database migrations (if using Alembic)
alembic upgrade head

# Start the development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at **http://localhost:8000**, with interactive API docs at **http://localhost:8000/docs** (Swagger UI) and **http://localhost:8000/redoc**.

---

## Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start the development server
npm run dev
```

The frontend will be available at **http://localhost:3000**.

Husky's pre-commit hook (lint + format on staged files) installs
automatically via `npm install`'s `prepare` script, as long as `frontend/`
(or a parent directory) is a git repository. See `frontend/README.md`
for details, including what happens if it isn't.

---

## Running the Project

To run the full stack locally, use two terminal windows:

**Terminal 1 — Backend**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```

Then open the frontend URL in your browser and log in as Admin or Faculty.

**Default flow to try:**
1. Log in as Admin → add Faculty, Subjects, Classrooms, Labs, Divisions.
2. Configure institutional constraints.
3. Click **Generate Timetable**.
4. Log in as Faculty → view personal timetable → open **AI Scheduling Assistant** → try "Find an empty classroom tomorrow" or "Schedule an extra lecture."

---

## Testing

**Backend** (57 pytest tests, isolated test database):
```bash
cd backend
venv/bin/pip install -r requirements-dev.txt
bash tests/setup_test_db.sh   # one-time (or re-run any time to reset)
pytest
```

**Frontend** (34 Vitest tests):
```bash
cd frontend
npm run test
```

See each README's Phase 9 section for what's covered and what's
deliberately out of scope (no full browser e2e — reasoning explained
there, not just asserted here).

---

## Folder Structure

```
smartsched-ai/
│
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI entrypoint
│   │   ├── config.py                # Settings & environment config
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── routers/         # Route definitions (auth, faculty, admin, assistant...)
│   │   │       └── deps.py          # Shared dependencies (auth, db session)
│   │   ├── core/
│   │   │   ├── security.py          # JWT, password hashing
│   │   │   └── logging.py
│   │   ├── models/                  # SQLAlchemy ORM models
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   ├── repositories/            # Database access layer
│   │   ├── services/                # Business logic (timetable engine, assistant, workload)
│   │   ├── scheduling/
│   │   │   ├── optimizer.py         # OR-Tools based timetable generator
│   │   │   ├── constraints.py       # Constraint definitions
│   │   │   └── assistant/
│   │   │       ├── intent_engine.py     # Rule-based intent detection
│   │   │       ├── rule_engine.py       # Constraint checking rules
│   │   │       └── recommender.py       # Scoring & ranking logic
│   │   └── utils/
│   ├── tests/                        # 57 pytest tests (Phase 9) + setup_test_db.sh
│   ├── requirements.txt
│   ├── requirements-dev.txt          # extends requirements.txt with pytest, httpx, pytest-order
│   └── .env.example
│
├── frontend/                         # Next.js 15 (App Router) — see frontend/README.md for full details
│   ├── public/
│   ├── src/
│   │   ├── app/                      # File-based routing (pages, layouts, middleware live alongside)
│   │   │   ├── admin/                 # Admin dashboard + management screens
│   │   │   ├── faculty/               # Faculty dashboard, timetable, assistant
│   │   │   └── login/
│   │   ├── middleware.ts             # Edge-level route protection
│   │   ├── components/               # auth/, common/, layout/, timetable/ — *.test.tsx alongside components (Phase 9)
│   │   ├── hooks/useAuth.tsx         # TanStack Query-backed auth context
│   │   ├── lib/                      # api.ts (Axios), cookies.ts — *.test.ts alongside (Phase 9)
│   │   ├── providers/AppProviders.tsx
│   │   ├── schemas/                  # Zod validation schemas — *.test.ts alongside (Phase 9)
│   │   ├── theme/                    # MUI theme, next/font loaders, SSR cache registry
│   │   └── types/
│   ├── package.json
│   ├── next.config.mjs
│   ├── eslint.config.mjs
│   ├── vitest.config.mts             # Phase 9
│   ├── .prettierrc
│   ├── .husky/
│   └── .env.example
│
├── database/
│   ├── schema/                       # SQL DDL scripts
│   ├── seed/                         # Sample seed data
│   └── docs/
│       └── er-diagram.md
│
├── .gitignore
├── LICENSE
└── README.md
```

---

## API Documentation

Once the backend is running, full interactive API documentation is auto-generated by FastAPI:

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

Key endpoint groups (✅ = built and tested, ⬜ = planned for a later phase):

| Group | Base Path | Purpose | Status |
|---|---|---|---|
| Auth | `/api/v1/auth` | Login, current-user lookup | ✅ |
| Admin - Dashboard | `/api/v1/admin/dashboard` | Real faculty/subject/room/pending-request counts | ✅ |
| Admin - Lookups | `/api/v1/admin/lookups` | Departments, academic years (read-only, for dropdowns) | ✅ |
| Admin - Faculty | `/api/v1/admin/faculty` | Full CRUD, creates a login + profile together | ✅ |
| Admin - Subjects | `/api/v1/admin/subjects` | Full CRUD | ✅ |
| Admin - Rooms | `/api/v1/admin/rooms` | Full CRUD — serves both Classroom and Laboratory Management via `?room_type=` | ✅ |
| Admin - Divisions | `/api/v1/admin/divisions` | Full CRUD | ✅ |
| Admin - Constraints | `/api/v1/admin/constraints` | Full CRUD, `config` is flexible JSON | ✅ |
| Admin - Lecture Requests | `/api/v1/admin/lecture-requests` | List pending, approve/reject | ✅ |
| Faculty - Schedule | `/api/v1/faculty/me/schedule/today`, `/me/timetable`, `/me/workload` | Real queries against `timetable_entries` — empty until Phase 6 | ✅ |
| Faculty - Notifications | `/api/v1/faculty/notifications` | List + mark-as-read | ✅ |
| Faculty - Lookups | `/api/v1/faculty/lookups` | Read-only subjects/divisions for the request form | ✅ |
| Faculty - Lecture Requests | `/api/v1/faculty/lecture-requests` | Submit extra/replacement requests, view own history | ✅ |
| Admin - Assignments | `/api/v1/admin/assignments` | Subject-Faculty-Division assignments — the optimizer's input | ✅ |
| Admin - Timetable | `/api/v1/admin/timetable`, `/admin/timetable/generate` | Real OR-Tools CP-SAT generation + full timetable listing | ✅ |
| Assistant | `/api/v1/faculty/assistant/query`, `/faculty/assistant/confirm` | Rule-based intent detection, scored recommendations, booking confirmation | ✅ |
| Admin - Analytics | `/api/v1/admin/analytics` | Real utilization, idle-time, and assistant-usage metrics | ✅ |

---

## Future Scope

- Mobile app (React Native) for faculty on the go
- Student-facing timetable portal
- Automated substitute-faculty suggestion on leave
- Multi-campus / multi-department support
- Timetable versioning and rollback
- Push notifications (email/SMS) for schedule changes

---

## Contributors

| Name | Role |
|---|---|
| _Add your name_ | Project Lead / Full Stack Developer |
| _Add teammate_ | Backend Developer |
| _Add teammate_ | Frontend Developer |

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.

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
| 1. Frontend | ✅ Done | React/TS/MUI, terminal-console theme, full nav shell, builds clean |
| 2. Database Design | ✅ Done | 16 tables, 27 FKs, executed against real MySQL, seed data verified |
| 3. Authentication | ✅ Done | JWT + RBAC, tested end-to-end against the live DB |
| 4. Admin Module | ⬜ Not started | |
| 5. Faculty Module | ⬜ Not started | |
| 6. Timetable Generation Engine | ⬜ Not started | |
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
| Frontend | React + TypeScript + Material UI |
| Backend | Python + FastAPI |
| Database | MySQL |
| ORM | SQLAlchemy |
| Authentication | JWT |
| Scheduling Engine | Google OR-Tools |
| Charts | Chart.js |
| Version Control | Git + GitHub |

> No Docker, no Vite, no external LLM APIs (OpenAI/Gemini) are used. The AI Assistant is fully rule-based.

---

## Prerequisites

Make sure the following are installed on your machine:

- **Node.js** ≥ 18.x and **npm** ≥ 9.x
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

Create a `.env` file inside `frontend/`:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

> Note: even though Vite is excluded from the *build tooling* decision described in the project brief, if the frontend is bootstrapped with Create React App instead, use `REACT_APP_API_BASE_URL` in place of `VITE_API_BASE_URL` and adjust accordingly.

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
cp .env.example .env            # then fill in your values

# Start the development server
npm run dev          # or `npm start` depending on the bootstrap tool used
```

The frontend will be available at **http://localhost:5173** (or `http://localhost:3000`).

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
│   ├── alembic/                     # DB migrations
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/              # Reusable UI components
│   │   ├── pages/
│   │   │   ├── auth/                # Login, Forgot Password
│   │   │   ├── admin/                # Admin Dashboard, Management screens
│   │   │   ├── faculty/              # Faculty Dashboard, Timetable, Assistant
│   │   │   └── shared/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/                 # API client / axios instances
│   │   ├── store/                    # State management
│   │   ├── routes/                   # Route definitions & guards
│   │   ├── types/                    # TypeScript types/interfaces
│   │   ├── theme/                    # MUI theme config
│   │   └── App.tsx
│   ├── package.json
│   └── .env.example
│
├── database/
│   ├── schema/                       # SQL DDL scripts
│   └── seed/                         # Sample seed data
│
├── docs/
│   ├── er-diagram.md
│   ├── api-reference.md
│   └── architecture.md
│
├── scripts/                          # Setup/deployment helper scripts
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

Key endpoint groups:

| Group | Base Path | Purpose |
|---|---|---|
| Auth | `/api/v1/auth` | Login, token refresh, password reset |
| Admin | `/api/v1/admin` | Faculty/Subject/Classroom/Lab/Division CRUD |
| Timetable | `/api/v1/timetable` | Generate, fetch, edit, export timetables |
| Constraints | `/api/v1/constraints` | Create/update institutional rules |
| Faculty | `/api/v1/faculty` | Personal dashboard, workload, notifications |
| Assistant | `/api/v1/assistant` | Intent-based scheduling queries |

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

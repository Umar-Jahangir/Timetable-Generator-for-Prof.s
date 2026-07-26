# SmartSched AI — Backend (Phase 3: Authentication)

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

## Next

Phase 4 (Admin Module) builds real CRUD endpoints — Faculty, Subjects,
Classrooms, Laboratories, Divisions — behind `require_role(UserRole.admin)`,
following the exact same repository → service → router pattern
established here.

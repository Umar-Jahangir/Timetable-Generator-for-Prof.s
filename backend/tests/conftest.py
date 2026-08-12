"""
Shared pytest fixtures for the whole backend test suite.

CRITICAL ORDERING NOTE: the environment variables below MUST be set
before any `app.*` module is imported anywhere — including by other
test files. `app.db.session` builds its SQLAlchemy engine at import
time from `app.config.get_settings()`, which is `lru_cache`-d, so
whichever values are in `os.environ` the first time it's called win
for the rest of the process. Pytest always fully executes conftest.py
before collecting/importing test modules in the same directory, so
setting these here — above the `from app.main import app` line below —
guarantees every test runs against `smartsched_ai_test`, never the
real `smartsched_ai` development database.
"""

import os

os.environ["DB_NAME"] = "smartsched_ai_test"
os.environ["DB_USER"] = "smartsched_app"
os.environ["DB_PASSWORD"] = "SmartSched@2026"
os.environ["DB_HOST"] = "127.0.0.1"
os.environ["DB_PORT"] = "3306"
os.environ["JWT_SECRET_KEY"] = "test-only-secret-do-not-use-in-production"
os.environ["APP_ENV"] = "test"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402


@pytest.fixture(scope="session")
def client():
    """One TestClient for the whole test session — cheap to share since
    it's stateless between requests (auth is via Bearer tokens the
    tests themselves acquire, not cookies/sessions on the client)."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def db():
    """
    Direct DB session for tests that need to assert against raw rows
    the API doesn't expose (e.g. clash-detection queries — there's no
    "list clashes" endpoint, because the optimizer guarantees there
    aren't any; the test has to check the database directly to prove
    that guarantee holds).

    Two things had to be fixed here to make this fixture actually
    trustworthy, both found by running the suite for real rather than
    assumed correct:

    1. Function-scoped, NOT session-scoped (see git history / PR
       description for the original bug) — a session-scoped fixture
       held one long-lived transaction for the whole test run, going
       stale the moment any OTHER connection (like `client`'s
       request-scoped sessions) committed a write after this
       fixture's first read.
    2. Explicit READ COMMITTED isolation on this session specifically.
       Fixing #1 wasn't enough on its own: several tests do a "before"
       read, trigger a write via `client` (a different session/
       connection), then an "after" read on the SAME `db` session —
       and MySQL's default REPEATABLE READ still freezes a snapshot at
       the first read of *that* test's transaction, so the "after"
       read would still miss the write. READ COMMITTED makes every
       individual statement see the latest committed data, which is
       exactly what these tests need: they're intentionally checking
       cross-connection visibility, not testing MVCC snapshot behavior.
    """
    session = SessionLocal(bind=engine.execution_options(isolation_level="READ COMMITTED"))
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="session")
def admin_token(client):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@college.edu", "password": "Admin@123"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest.fixture(scope="session")
def faculty_token(client):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "jsmith@college.edu", "password": "Faculty@123"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def faculty_headers(faculty_token):
    return {"Authorization": f"Bearer {faculty_token}"}

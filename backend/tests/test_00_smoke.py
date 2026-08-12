def test_health_check(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_admin_login_succeeds(admin_headers, client):
    resp = client.get("/api/v1/auth/me", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["role"] == "admin"


def test_faculty_login_succeeds(faculty_headers, client):
    resp = client.get("/api/v1/auth/me", headers=faculty_headers)
    assert resp.status_code == 200
    assert resp.json()["role"] == "faculty"


def test_running_against_test_database_not_dev(db):
    """Confirms the isolation fixture actually works — if this ever
    queries the real dev database instead, the row counts would differ
    from what the test seed script produces."""
    from sqlalchemy import text

    result = db.execute(text("SELECT DATABASE()")).scalar()
    assert result == "smartsched_ai_test"

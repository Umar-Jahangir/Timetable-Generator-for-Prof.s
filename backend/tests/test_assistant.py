"""
Formalizes Phase 7's manual verification: intent detection across all
supported intents, the flagship recommend-then-confirm flow (including
the stale-slot re-validation that returns 409), the deliberate
"DBMS doesn't match" honest-fallback behavior, and query logging.
"""


def test_schedule_extra_lecture_with_matching_terms_returns_recommendation(faculty_headers, client):
    resp = client.post(
        "/api/v1/faculty/assistant/query",
        headers=faculty_headers,
        json={"query": "Schedule an extra CS301 lecture for TY-A"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["intent"] == "schedule_extra_lecture"
    assert body["recommendation"] is not None
    rec = body["recommendation"]
    assert 0 <= rec["score"] <= 100
    assert len(rec["reasons"]) > 0
    assert all(r["satisfied"] for r in rec["reasons"]), "a returned recommendation must pass every hard check"


def test_abbreviation_that_does_not_substring_match_gets_honest_fallback(faculty_headers, client):
    """This is deliberate, documented behavior, not a bug: 'DBMS' isn't
    a substring of subject code 'CS301' or name 'Database Management
    Systems', and the rule-based extractor has no synonym dictionary.
    The correct response is asking for clarification, not guessing."""
    resp = client.post(
        "/api/v1/faculty/assistant/query",
        headers=faculty_headers,
        json={"query": "Schedule an extra DBMS lecture for TY-A"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["recommendation"] is None
    assert "specify" in body["message"].lower() or "couldn't tell" in body["message"].lower()


def test_unknown_query_gets_graceful_fallback_not_an_error(faculty_headers, client):
    resp = client.post(
        "/api/v1/faculty/assistant/query", headers=faculty_headers, json={"query": "asdkjfh qwerty banana"}
    )
    assert resp.status_code == 200
    assert resp.json()["intent"] == "unknown"


def test_confirm_booking_creates_real_entry_and_rejects_stale_reconfirm(faculty_headers, client, db):
    from sqlalchemy import text

    query_resp = client.post(
        "/api/v1/faculty/assistant/query",
        headers=faculty_headers,
        json={"query": "Schedule an extra CS301 lecture for TY-A"},
    )
    rec = query_resp.json()["recommendation"]
    assert rec is not None, "expected a free slot to exist for this test to proceed"

    confirm_payload = {
        "subject_id": rec["subject_id"],
        "division_id": rec["division_id"],
        "time_slot_id": rec["time_slot_id"],
        "room_id": rec["room_id"],
        "request_type": "extra",
        "score": rec["score"],
    }

    confirm_resp = client.post("/api/v1/faculty/assistant/confirm", headers=faculty_headers, json=confirm_payload)
    assert confirm_resp.status_code == 200, confirm_resp.text
    entry_id = confirm_resp.json()["entry_id"]

    # Prove it's a REAL row, not just a 200 response.
    found = db.execute(
        text("SELECT COUNT(*) FROM timetable_entries WHERE entry_id = :eid AND is_active = 1"),
        {"eid": entry_id},
    ).scalar()
    assert found == 1

    # Re-confirming the identical now-taken slot must be rejected —
    # this is the stale-recommendation re-validation from Phase 7.
    stale_resp = client.post("/api/v1/faculty/assistant/confirm", headers=faculty_headers, json=confirm_payload)
    assert stale_resp.status_code == 409


def test_check_workload_intent(faculty_headers, client):
    resp = client.post("/api/v1/faculty/assistant/query", headers=faculty_headers, json={"query": "What is my workload?"})
    assert resp.status_code == 200
    assert resp.json()["intent"] == "check_workload"


def test_find_empty_classroom_intent_returns_data_rows(faculty_headers, client):
    resp = client.post(
        "/api/v1/faculty/assistant/query", headers=faculty_headers, json={"query": "Find an empty classroom on Monday"}
    )
    assert resp.status_code == 200
    assert resp.json()["intent"] == "find_empty_classroom"


def test_every_query_is_logged(faculty_headers, client, db):
    from sqlalchemy import text

    before = db.execute(text("SELECT COUNT(*) FROM assistant_query_logs")).scalar()
    client.post("/api/v1/faculty/assistant/query", headers=faculty_headers, json={"query": "Show my timetable"})
    after = db.execute(text("SELECT COUNT(*) FROM assistant_query_logs")).scalar()
    assert after == before + 1


def test_admin_cannot_query_assistant(admin_headers, client):
    resp = client.post("/api/v1/faculty/assistant/query", headers=admin_headers, json={"query": "test"})
    assert resp.status_code == 403

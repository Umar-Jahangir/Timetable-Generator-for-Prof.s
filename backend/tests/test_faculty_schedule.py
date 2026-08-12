"""
Formalizes Phase 5's schedule/timetable/workload verification. Runs
after test_05_timetable_generation.py (alphabetically: 'f' > '0'), so
a real generated timetable exists — these assertions check structural
correctness against real data, not just an empty-state shape.
"""


def test_today_schedule_returns_a_list(faculty_headers, client):
    resp = client.get("/api/v1/faculty/me/schedule/today", headers=faculty_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    for entry in resp.json():
        assert set(entry.keys()) >= {"entry_id", "day_of_week", "start_time", "end_time", "entry_type"}


def test_weekly_timetable_has_entries_after_generation(faculty_headers, client):
    resp = client.get("/api/v1/faculty/me/timetable", headers=faculty_headers)
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) > 0, "expected real entries — test_05_timetable_generation.py should have run first"
    assert all(e["day_of_week"] in {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"} for e in entries)


def test_workload_reflects_real_scheduled_hours(faculty_headers, client):
    resp = client.get("/api/v1/faculty/me/workload", headers=faculty_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["max_weekly_hours"] > 0
    assert body["scheduled_hours"] >= 0
    assert body["entries_count"] >= 0
    # Utilization must be internally consistent with the two raw numbers.
    expected_pct = round(min(body["scheduled_hours"] / body["max_weekly_hours"] * 100, 100), 1)
    assert body["utilization_percent"] == expected_pct


def test_faculty_lookups_are_readable_but_not_writable(faculty_headers, client):
    subjects = client.get("/api/v1/faculty/lookups/subjects", headers=faculty_headers)
    divisions = client.get("/api/v1/faculty/lookups/divisions", headers=faculty_headers)
    assert subjects.status_code == 200
    assert divisions.status_code == 200
    assert len(subjects.json()) > 0

    # Same faculty token, still can't mutate — read-only lookup access
    # doesn't imply write access to the underlying admin resource.
    write_attempt = client.post(
        "/api/v1/admin/subjects",
        headers=faculty_headers,
        json={"name": "x", "code": "TST-RBAC-2", "academic_year_id": 3, "department_id": 1},
    )
    assert write_attempt.status_code == 403

"""
Formalizes Phase 6's manual verification of the CP-SAT timetable
optimizer. Named with a numeric prefix (rather than test_admin_timetable.py,
which would sort after test_admin_faculty etc. but before test_assistant/
test_faculty_*) so it runs early and deliberately — later test files
(test_assistant.py, test_faculty_schedule.py) benefit from a populated
timetable existing already, giving their assertions something real to
check rather than only exercising the empty-state path.

The zero-clash checks query timetable_entries directly rather than
trusting any API response, because the whole point of Phase 6 is that
clashes are structurally impossible — the only way to actually prove
that is to look at the raw data, the same way the manual testing in
Phase 6 did.
"""

from sqlalchemy import text


def test_generate_schedules_all_sessions_optimally(admin_headers, client):
    resp = client.post("/api/v1/admin/timetable/generate", headers=admin_headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["solver_status"] == "OPTIMAL"
    assert body["sessions_scheduled"] == body["sessions_requested"]
    assert body["entries_created"] > 0


def test_generated_timetable_has_zero_faculty_clashes(db):
    result = db.execute(
        text(
            """
            SELECT faculty_id, time_slot_id, COUNT(*) as cnt
            FROM timetable_entries
            WHERE is_active = 1
            GROUP BY faculty_id, time_slot_id
            HAVING cnt > 1
            """
        )
    ).fetchall()
    assert result == [], f"faculty double-booked: {result}"


def test_generated_timetable_has_zero_room_clashes(db):
    result = db.execute(
        text(
            """
            SELECT room_id, time_slot_id, COUNT(*) as cnt
            FROM timetable_entries
            WHERE is_active = 1 AND room_id IS NOT NULL
            GROUP BY room_id, time_slot_id
            HAVING cnt > 1
            """
        )
    ).fetchall()
    assert result == [], f"room double-booked: {result}"


def test_generated_timetable_has_zero_division_clashes(db):
    result = db.execute(
        text(
            """
            SELECT division_id, time_slot_id, COUNT(*) as cnt
            FROM timetable_entries
            WHERE is_active = 1
            GROUP BY division_id, time_slot_id
            HAVING cnt > 1
            """
        )
    ).fetchall()
    assert result == [], f"division double-booked: {result}"


def test_lab_sessions_occupy_two_consecutive_slots(db):
    """Every lab entry must pair with exactly one other lab entry for the
    same subject+division+day, on adjacent slot_order values — this is
    the hard constraint from the original wireframe ("Labs always
    occupy 2 continuous hours")."""
    rows = db.execute(
        text(
            """
            SELECT te.subject_id, te.division_id, ts.day_of_week,
                   GROUP_CONCAT(ts.slot_order ORDER BY ts.slot_order) as slots
            FROM timetable_entries te
            JOIN time_slots ts ON ts.time_slot_id = te.time_slot_id
            WHERE te.is_active = 1 AND te.entry_type = 'lab'
            GROUP BY te.subject_id, te.division_id, ts.day_of_week
            """
        )
    ).fetchall()
    assert len(rows) > 0, "expected at least one lab session in the generated timetable"
    for row in rows:
        slots = [int(s) for s in row.slots.split(",")]
        assert len(slots) == 2, f"lab session isn't exactly 2 slots: {row}"
        assert slots[1] - slots[0] == 1, f"lab slots aren't consecutive: {row}"


def test_faculty_free_hour_constraint_is_respected(admin_headers, client, db):
    """Adds a Friday 1-2pm faculty_free_hour constraint, regenerates,
    and confirms zero entries land in that slot — formalizes the exact
    manual test run during Phase 6."""
    create_resp = client.post(
        "/api/v1/admin/constraints",
        headers=admin_headers,
        json={
            "name": "TST Friday faculty free hour",
            "constraint_type": "faculty_free_hour",
            "config": {"day": "Friday", "start": "13:00", "end": "14:00"},
        },
    )
    assert create_resp.status_code == 201
    constraint_id = create_resp.json()["constraint_id"]

    try:
        gen_resp = client.post("/api/v1/admin/timetable/generate", headers=admin_headers)
        assert gen_resp.status_code == 200

        blocked = db.execute(
            text(
                """
                SELECT COUNT(*) FROM timetable_entries te
                JOIN time_slots ts ON ts.time_slot_id = te.time_slot_id
                WHERE te.is_active = 1 AND ts.day_of_week = 'Friday' AND ts.start_time = '13:00:00'
                """
            )
        ).scalar()
        assert blocked == 0
    finally:
        client.delete(f"/api/v1/admin/constraints/{constraint_id}", headers=admin_headers)
        # Regenerate once more so later tests aren't left with the
        # constrained (and now-stale) timetable from this test.
        client.post("/api/v1/admin/timetable/generate", headers=admin_headers)


def test_regeneration_soft_deletes_previous_entries(admin_headers, client, db):
    first = client.post("/api/v1/admin/timetable/generate", headers=admin_headers)
    assert first.status_code == 200

    inactive_before = db.execute(
        text("SELECT COUNT(*) FROM timetable_entries WHERE is_active = 0")
    ).scalar()

    second = client.post("/api/v1/admin/timetable/generate", headers=admin_headers)
    assert second.status_code == 200

    inactive_after = db.execute(
        text("SELECT COUNT(*) FROM timetable_entries WHERE is_active = 0")
    ).scalar()
    active_after = db.execute(
        text("SELECT COUNT(*) FROM timetable_entries WHERE is_active = 1")
    ).scalar()

    assert inactive_after > inactive_before, "previous entries should be soft-deleted, not left active"
    assert active_after == second.json()["entries_created"]


def test_faculty_cannot_generate_timetable(faculty_headers, client):
    resp = client.post("/api/v1/admin/timetable/generate", headers=faculty_headers)
    assert resp.status_code == 403


def test_admin_assignments_list_matches_seed_data(admin_headers, client):
    resp = client.get("/api/v1/admin/assignments", headers=admin_headers)
    assert resp.status_code == 200
    codes = {a["subject_name"] for a in resp.json()}
    assert "Database Management Systems" in codes
    assert "Artificial Intelligence" in codes

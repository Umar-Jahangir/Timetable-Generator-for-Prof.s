"""Formalizes Phase 6's Subject-Faculty Assignment CRUD — the essential
input the timetable optimizer reads. Uses the existing seeded subject
(CS301/CS302), faculty, and division IDs plus a fresh division to avoid
colliding with the two permanent assignments from
database/seed/002_assignments.sql that test_05_timetable_generation.py
depends on."""


def test_create_list_delete_assignment(admin_headers, client):
    # Create a scratch division so this test's assignment doesn't
    # collide with the permanent seeded ones.
    division_resp = client.post(
        "/api/v1/admin/divisions",
        headers=admin_headers,
        json={"academic_year_id": 3, "department_id": 1, "name": "TST-ASSIGN"},
    )
    assert division_resp.status_code == 201
    division_id = division_resp.json()["division_id"]

    try:
        create_resp = client.post(
            "/api/v1/admin/assignments",
            headers=admin_headers,
        json={"subject_id": 1, "faculty_id": 1, "division_id": division_id, "delivery_type": "theory"},
        )
        assert create_resp.status_code == 201, create_resp.text
        assignment_id = create_resp.json()["assignment_id"]
        assert create_resp.json()["subject_name"] == "Database Management Systems"
        assert create_resp.json()["division_label"].endswith("-TST-ASSIGN")

        update_resp = client.put(
            f"/api/v1/admin/assignments/{assignment_id}",
            headers=admin_headers,
            json={"subject_id": 1, "faculty_id": 1, "division_id": division_id, "delivery_type": "theory"},
        )
        assert update_resp.status_code == 200, update_resp.text

        list_resp = client.get("/api/v1/admin/assignments", headers=admin_headers)
        assert any(a["assignment_id"] == assignment_id for a in list_resp.json())

        delete_resp = client.delete(f"/api/v1/admin/assignments/{assignment_id}", headers=admin_headers)
        assert delete_resp.status_code == 204
    finally:
        client.delete(f"/api/v1/admin/divisions/{division_id}", headers=admin_headers)


def test_faculty_cannot_create_assignment(faculty_headers, client):
    resp = client.post(
        "/api/v1/admin/assignments",
        headers=faculty_headers,
        json={"subject_id": 1, "faculty_id": 1, "division_id": 1, "delivery_type": "theory"},
    )
    assert resp.status_code == 403

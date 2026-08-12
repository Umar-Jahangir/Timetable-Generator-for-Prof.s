"""
Formalizes Phase 4's manual Subject CRUD verification: create, list,
get, update, delete, plus the duplicate-code and invalid-FK validation
paths. Each test cleans up rows it creates so the suite can be re-run
repeatedly without accumulating cruft in the test database.
"""


def test_create_list_get_update_delete_subject(admin_headers, client):
    create_resp = client.post(
        "/api/v1/admin/subjects",
        headers=admin_headers,
        json={
            "name": "Operating Systems",
            "code": "TST-OS-1",
            "academic_year_id": 3,
            "department_id": 1,
            "credits": 4,
            "lectures_per_week": 3,
            "tutorials_per_week": 1,
            "lab_hours_per_week": 2,
        },
    )
    assert create_resp.status_code == 201, create_resp.text
    subject_id = create_resp.json()["subject_id"]

    try:
        list_resp = client.get("/api/v1/admin/subjects", headers=admin_headers)
        assert list_resp.status_code == 200
        assert any(s["subject_id"] == subject_id for s in list_resp.json())

        get_resp = client.get(f"/api/v1/admin/subjects/{subject_id}", headers=admin_headers)
        assert get_resp.status_code == 200
        assert get_resp.json()["code"] == "TST-OS-1"

        update_resp = client.put(
            f"/api/v1/admin/subjects/{subject_id}",
            headers=admin_headers,
            json={"credits": 5},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["credits"] == 5
    finally:
        delete_resp = client.delete(f"/api/v1/admin/subjects/{subject_id}", headers=admin_headers)
        assert delete_resp.status_code == 204

    confirm_resp = client.get(f"/api/v1/admin/subjects/{subject_id}", headers=admin_headers)
    assert confirm_resp.status_code == 404


def test_duplicate_subject_code_rejected(admin_headers, client):
    payload = {
        "name": "Dup Test Subject",
        "code": "TST-DUP-1",
        "academic_year_id": 3,
        "department_id": 1,
    }
    first = client.post("/api/v1/admin/subjects", headers=admin_headers, json=payload)
    assert first.status_code == 201
    subject_id = first.json()["subject_id"]

    try:
        second = client.post("/api/v1/admin/subjects", headers=admin_headers, json=payload)
        assert second.status_code == 409
    finally:
        client.delete(f"/api/v1/admin/subjects/{subject_id}", headers=admin_headers)


def test_invalid_academic_year_id_rejected(admin_headers, client):
    resp = client.post(
        "/api/v1/admin/subjects",
        headers=admin_headers,
        json={"name": "Bad Ref", "code": "TST-BAD-1", "academic_year_id": 99999, "department_id": 1},
    )
    assert resp.status_code == 400


def test_faculty_cannot_create_subject(faculty_headers, client):
    resp = client.post(
        "/api/v1/admin/subjects",
        headers=faculty_headers,
        json={"name": "x", "code": "TST-RBAC-1", "academic_year_id": 3, "department_id": 1},
    )
    assert resp.status_code == 403

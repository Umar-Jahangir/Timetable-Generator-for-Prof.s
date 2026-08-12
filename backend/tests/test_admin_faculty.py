"""
Formalizes Phase 4's Faculty CRUD verification. The delete test is the
most important one here — it's regression coverage for a real bug
found during Phase 4 (SQLAlchemy tried to NULL out faculty.user_id
before deleting the parent User, which failed against the NOT NULL
column; fixed with passive_deletes=True). This test would fail loudly
if that fix were ever accidentally reverted.
"""

from app.db.session import SessionLocal
from app.models.user import User


def test_create_faculty_returns_temp_password_once(admin_headers, client):
    resp = client.post(
        "/api/v1/admin/faculty",
        headers=admin_headers,
        json={
            "name": "Prof. Test Account",
            "email": "test.pytest.faculty@college.edu",
            "department_id": 1,
            "designation": "Lecturer",
            "max_weekly_hours": 20,
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert len(body["temporary_password"]) >= 8
    assert body["faculty"]["user"]["email"] == "test.pytest.faculty@college.edu"

    client.delete(f"/api/v1/admin/faculty/{body['faculty']['faculty_id']}", headers=admin_headers)


def test_duplicate_email_rejected(admin_headers, client):
    payload = {"name": "Dup", "email": "test.pytest.dup@college.edu", "department_id": 1}
    first = client.post("/api/v1/admin/faculty", headers=admin_headers, json=payload)
    assert first.status_code == 201
    faculty_id = first.json()["faculty"]["faculty_id"]

    try:
        second = client.post("/api/v1/admin/faculty", headers=admin_headers, json=payload)
        assert second.status_code == 409
    finally:
        client.delete(f"/api/v1/admin/faculty/{faculty_id}", headers=admin_headers)


def test_update_faculty_designation_and_hours(admin_headers, client):
    create_resp = client.post(
        "/api/v1/admin/faculty",
        headers=admin_headers,
        json={"name": "Prof. Update Test", "email": "test.pytest.update@college.edu", "department_id": 1},
    )
    faculty_id = create_resp.json()["faculty"]["faculty_id"]

    try:
        update_resp = client.put(
            f"/api/v1/admin/faculty/{faculty_id}",
            headers=admin_headers,
            json={"designation": "Senior Lecturer", "max_weekly_hours": 22},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["designation"] == "Senior Lecturer"
        assert update_resp.json()["max_weekly_hours"] == 22
    finally:
        client.delete(f"/api/v1/admin/faculty/{faculty_id}", headers=admin_headers)


def test_delete_faculty_cascades_to_user_row(admin_headers, client, db):
    """Regression test for the Phase 4 cascade-delete bug. Deletes a
    faculty member via the API, then checks the raw `users` table
    directly — the whole point of the original bug was that the DELETE
    would 500 instead of completing, so this must actually verify the
    row is gone, not just that the HTTP call returned 204."""
    create_resp = client.post(
        "/api/v1/admin/faculty",
        headers=admin_headers,
        json={"name": "Prof. Delete Test", "email": "test.pytest.delete@college.edu", "department_id": 1},
    )
    faculty_id = create_resp.json()["faculty"]["faculty_id"]
    user_id = create_resp.json()["faculty"]["user"]["user_id"]

    delete_resp = client.delete(f"/api/v1/admin/faculty/{faculty_id}", headers=admin_headers)
    assert delete_resp.status_code == 204

    assert client.get(f"/api/v1/admin/faculty/{faculty_id}", headers=admin_headers).status_code == 404

    remaining_user = SessionLocal().query(User).filter(User.user_id == user_id).first()
    assert remaining_user is None, "cascade delete regression: the users row survived the faculty delete"


def test_faculty_cannot_create_faculty(faculty_headers, client):
    resp = client.post(
        "/api/v1/admin/faculty",
        headers=faculty_headers,
        json={"name": "x", "email": "test.pytest.rbac@college.edu", "department_id": 1},
    )
    assert resp.status_code == 403

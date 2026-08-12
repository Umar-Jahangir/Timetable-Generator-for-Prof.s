"""Formalizes Phase 4's Division CRUD verification, including the
(academic_year + department + name) duplicate check."""


def test_create_update_delete_division(admin_headers, client):
    create_resp = client.post(
        "/api/v1/admin/divisions",
        headers=admin_headers,
        json={"academic_year_id": 3, "department_id": 1, "name": "TST-Z", "strength": 50},
    )
    assert create_resp.status_code == 201, create_resp.text
    division_id = create_resp.json()["division_id"]

    try:
        update_resp = client.put(
            f"/api/v1/admin/divisions/{division_id}",
            headers=admin_headers,
            json={"strength": 55},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["strength"] == 55
    finally:
        assert client.delete(f"/api/v1/admin/divisions/{division_id}", headers=admin_headers).status_code == 204

    assert client.get(f"/api/v1/admin/divisions/{division_id}", headers=admin_headers).status_code == 404


def test_duplicate_division_year_department_name_rejected(admin_headers, client):
    payload = {"academic_year_id": 3, "department_id": 1, "name": "TST-DUPDIV"}
    first = client.post("/api/v1/admin/divisions", headers=admin_headers, json=payload)
    assert first.status_code == 201
    division_id = first.json()["division_id"]

    try:
        second = client.post("/api/v1/admin/divisions", headers=admin_headers, json=payload)
        assert second.status_code == 409
    finally:
        client.delete(f"/api/v1/admin/divisions/{division_id}", headers=admin_headers)

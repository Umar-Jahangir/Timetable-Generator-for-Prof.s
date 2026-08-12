"""Formalizes Phase 4's Constraint CRUD verification — including the
JSON config field that Phase 6's optimizer reads directly."""


def test_create_update_delete_constraint(admin_headers, client):
    create_resp = client.post(
        "/api/v1/admin/constraints",
        headers=admin_headers,
        json={
            "name": "TST Friday faculty free hour",
            "constraint_type": "faculty_free_hour",
            "config": {"day": "Friday", "start": "13:00", "end": "14:00"},
        },
    )
    assert create_resp.status_code == 201, create_resp.text
    constraint_id = create_resp.json()["constraint_id"]
    assert create_resp.json()["config"]["day"] == "Friday"

    try:
        update_resp = client.put(
            f"/api/v1/admin/constraints/{constraint_id}",
            headers=admin_headers,
            json={"is_active": False},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["is_active"] is False
    finally:
        assert (
            client.delete(f"/api/v1/admin/constraints/{constraint_id}", headers=admin_headers).status_code
            == 204
        )

    assert client.get(f"/api/v1/admin/constraints/{constraint_id}", headers=admin_headers).status_code == 404

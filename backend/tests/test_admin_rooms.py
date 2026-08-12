"""
Formalizes Phase 4's Room CRUD verification — including the
room_type filter that a single backend endpoint uses to serve both the
"Classroom Management" and "Laboratory Management" frontend screens.
"""


def test_create_list_update_delete_room(admin_headers, client):
    create_resp = client.post(
        "/api/v1/admin/rooms",
        headers=admin_headers,
        json={"name": "TST-D101", "building": "D Block", "capacity": 80, "room_type": "classroom"},
    )
    assert create_resp.status_code == 201, create_resp.text
    room_id = create_resp.json()["room_id"]

    try:
        update_resp = client.put(
            f"/api/v1/admin/rooms/{room_id}",
            headers=admin_headers,
            json={"is_active": False},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["is_active"] is False
    finally:
        assert client.delete(f"/api/v1/admin/rooms/{room_id}", headers=admin_headers).status_code == 204

    assert client.get(f"/api/v1/admin/rooms/{room_id}", headers=admin_headers).status_code == 404


def test_room_type_filter_separates_classrooms_and_labs(admin_headers, client):
    classroom_resp = client.get("/api/v1/admin/rooms?room_type=classroom", headers=admin_headers)
    lab_resp = client.get("/api/v1/admin/rooms?room_type=laboratory", headers=admin_headers)
    assert classroom_resp.status_code == lab_resp.status_code == 200

    classroom_ids = {r["room_id"] for r in classroom_resp.json()}
    lab_ids = {r["room_id"] for r in lab_resp.json()}
    assert classroom_ids.isdisjoint(lab_ids)
    assert all(r["room_type"] == "classroom" for r in classroom_resp.json())
    assert all(r["room_type"] == "laboratory" for r in lab_resp.json())


def test_duplicate_room_name_rejected(admin_headers, client):
    payload = {"name": "TST-DUPROOM-1", "capacity": 40, "room_type": "classroom"}
    first = client.post("/api/v1/admin/rooms", headers=admin_headers, json=payload)
    assert first.status_code == 201
    room_id = first.json()["room_id"]

    try:
        second = client.post("/api/v1/admin/rooms", headers=admin_headers, json=payload)
        assert second.status_code == 409
    finally:
        client.delete(f"/api/v1/admin/rooms/{room_id}", headers=admin_headers)

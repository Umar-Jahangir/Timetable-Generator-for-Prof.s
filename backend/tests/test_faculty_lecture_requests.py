"""Formalizes Phase 5's lecture request lifecycle: submit, appear in
faculty's own list, appear in admin's pending queue, dashboard count
reflects it, admin resolves, re-resolving an already-resolved request
is rejected — the exact sequence manually verified during Phase 5."""


def test_full_lecture_request_lifecycle(admin_headers, faculty_headers, client):
    # No cleanup needed: lecture_requests has no DELETE endpoint by
    # design (it's meant to be an audit trail, resolved via status
    # transitions, not removed) — every assertion below compares
    # relative deltas against a fresh "before" snapshot, so repeated
    # runs stay correct even as resolved requests accumulate.
    dashboard_before = client.get("/api/v1/admin/dashboard", headers=admin_headers).json()

    create_resp = client.post(
        "/api/v1/faculty/lecture-requests",
        headers=faculty_headers,
        json={"subject_id": 1, "division_id": 1, "request_type": "extra"},
    )
    assert create_resp.status_code == 201, create_resp.text
    request_id = create_resp.json()["request_id"]
    assert create_resp.json()["status"] == "pending"

    own_list = client.get("/api/v1/faculty/lecture-requests", headers=faculty_headers).json()
    assert any(r["request_id"] == request_id for r in own_list)

    pending_list = client.get("/api/v1/admin/lecture-requests", headers=admin_headers).json()
    assert any(r["request_id"] == request_id for r in pending_list)

    dashboard_during = client.get("/api/v1/admin/dashboard", headers=admin_headers).json()
    assert dashboard_during["pending_requests"] == dashboard_before["pending_requests"] + 1

    resolve_resp = client.put(
        f"/api/v1/admin/lecture-requests/{request_id}", headers=admin_headers, json={"status": "approved"}
    )
    assert resolve_resp.status_code == 200
    assert resolve_resp.json()["status"] == "approved"

    dashboard_after = client.get("/api/v1/admin/dashboard", headers=admin_headers).json()
    assert dashboard_after["pending_requests"] == dashboard_before["pending_requests"]

    re_resolve = client.put(
        f"/api/v1/admin/lecture-requests/{request_id}", headers=admin_headers, json={"status": "rejected"}
    )
    assert re_resolve.status_code == 409


def test_invalid_subject_id_rejected(faculty_headers, client):
    resp = client.post(
        "/api/v1/faculty/lecture-requests",
        headers=faculty_headers,
        json={"subject_id": 999999, "division_id": 1, "request_type": "extra"},
    )
    assert resp.status_code == 400

"""Formalizes Phase 5's Notifications verification, including the
deliberate 404-not-403 behavior when marking another user's
notification — a 403 would confirm the notification ID exists and
belongs to someone else; 404 doesn't leak that."""


def test_list_notifications_returns_seeded_data(faculty_headers, client):
    resp = client.get("/api/v1/faculty/notifications", headers=faculty_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 2
    assert any(n["title"] == "Extra DBMS Lecture Approved" for n in resp.json())


def test_mark_own_notification_read(faculty_headers, client):
    notifications = client.get("/api/v1/faculty/notifications", headers=faculty_headers).json()
    unread = next((n for n in notifications if not n["is_read"]), None)
    assert unread is not None, "expected at least one unread seeded notification"

    resp = client.patch(f"/api/v1/faculty/notifications/{unread['notification_id']}/read", headers=faculty_headers)
    assert resp.status_code == 200
    assert resp.json()["is_read"] is True

    # Restore state so the suite is repeatable.
    from app.db.session import SessionLocal
    from app.models.notification import Notification

    session = SessionLocal()
    try:
        row = session.query(Notification).filter(Notification.notification_id == unread["notification_id"]).first()
        row.is_read = False
        session.commit()
    finally:
        session.close()


def test_marking_another_users_notification_returns_404_not_403(client):
    """arao@college.edu's notifications (if any) shouldn't be markable
    by jsmith — and the response must be 404, not 403, to avoid
    confirming the notification exists."""
    arao_login = client.post(
        "/api/v1/auth/login", json={"email": "arao@college.edu", "password": "Faculty@123"}
    )
    arao_headers = {"Authorization": f"Bearer {arao_login.json()['access_token']}"}

    jsmith_login = client.post(
        "/api/v1/auth/login", json={"email": "jsmith@college.edu", "password": "Faculty@123"}
    )
    jsmith_headers = {"Authorization": f"Bearer {jsmith_login.json()['access_token']}"}

    jsmith_notifications = client.get("/api/v1/faculty/notifications", headers=jsmith_headers).json()
    assert len(jsmith_notifications) > 0
    jsmith_notification_id = jsmith_notifications[0]["notification_id"]

    resp = client.patch(f"/api/v1/faculty/notifications/{jsmith_notification_id}/read", headers=arao_headers)
    assert resp.status_code == 404

"""
Formalizes the manual curl-based verification from Phase 3 into a
repeatable suite: login success/failure, /me, and role-based access
control across a representative admin-only and faculty-only endpoint.
"""


def test_login_admin_returns_token_and_correct_role(client):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@college.edu", "password": "Admin@123"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["access_token"]
    assert body["token_type"] == "bearer"
    assert body["user"]["role"] == "admin"
    assert body["user"]["email"] == "admin@college.edu"


def test_login_faculty_returns_token_and_correct_role(client):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "jsmith@college.edu", "password": "Faculty@123"},
    )
    assert resp.status_code == 200
    assert resp.json()["user"]["role"] == "faculty"


def test_login_wrong_password_rejected(client):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@college.edu", "password": "wrong-password"},
    )
    assert resp.status_code == 401
    # Same generic message as an unknown email would get — asserting
    # this prevents a regression back to a user-enumeration leak.
    assert "incorrect" in resp.json()["detail"].lower()


def test_login_unknown_email_gives_identical_error_to_wrong_password(client):
    known_wrong = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@college.edu", "password": "wrong-password"},
    )
    unknown_email = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody-registered@college.edu", "password": "whatever"},
    )
    assert known_wrong.status_code == unknown_email.status_code == 401
    assert known_wrong.json()["detail"] == unknown_email.json()["detail"]


def test_me_with_no_token_returns_401(client):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_me_with_tampered_token_returns_401(client):
    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer this.is.not.a.valid.jwt"},
    )
    assert resp.status_code == 401


def test_admin_token_allowed_on_admin_only_route(admin_headers, client):
    resp = client.get("/api/v1/admin/ping", headers=admin_headers)
    assert resp.status_code == 200


def test_faculty_token_rejected_on_admin_only_route(faculty_headers, client):
    resp = client.get("/api/v1/admin/ping", headers=faculty_headers)
    assert resp.status_code == 403


def test_faculty_token_allowed_on_faculty_only_route(faculty_headers, client):
    resp = client.get("/api/v1/faculty/ping", headers=faculty_headers)
    assert resp.status_code == 200


def test_admin_token_rejected_on_faculty_only_route(admin_headers, client):
    resp = client.get("/api/v1/faculty/ping", headers=admin_headers)
    assert resp.status_code == 403

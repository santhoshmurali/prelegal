from fastapi.testclient import TestClient

from conftest import SEED_PASSWORD, SEED_USERNAME


def sign_up(client: TestClient, username: str, password: str):
    return client.post("/api/auth/signup", json={"username": username, "password": password})


def sign_in_as_admin(client: TestClient) -> None:
    client.post("/api/auth/login", json={"username": SEED_USERNAME, "password": SEED_PASSWORD})


def test_signup_creates_an_active_user_and_signs_them_in(client: TestClient) -> None:
    response = sign_up(client, "ana", "long-enough-pass")

    assert response.status_code == 201
    assert response.json() == {"id": 2, "username": "ana", "isAdmin": False}
    assert client.get("/api/auth/me").json()["username"] == "ana"


def test_signup_rejects_short_passwords(client: TestClient) -> None:
    assert sign_up(client, "ana", "short").status_code == 422


def test_signup_rejects_oversized_passwords(client: TestClient) -> None:
    assert sign_up(client, "ana", "x" * 10_000).status_code == 422


def test_signup_rejects_a_taken_username(client: TestClient) -> None:
    sign_up(client, "ana", "long-enough-pass")

    assert sign_up(client, "ana", "another-pass-1").status_code == 409


def test_signup_cannot_reuse_the_admin_username(client: TestClient) -> None:
    assert sign_up(client, SEED_USERNAME, "long-enough-pass").status_code == 409


def test_signup_strips_whitespace_from_the_username(client: TestClient) -> None:
    sign_up(client, "  ana  ", "long-enough-pass")

    assert client.get("/api/auth/me").json()["username"] == "ana"


def test_non_admin_cannot_list_or_change_users(client: TestClient) -> None:
    sign_up(client, "ana", "long-enough-pass")

    assert client.get("/api/admin/users").status_code == 403
    assert client.patch("/api/admin/users/1", json={"isActive": False}).status_code == 403


def test_admin_lists_all_accounts(client: TestClient) -> None:
    sign_up(client, "ana", "long-enough-pass")
    client.post("/api/auth/logout")
    sign_in_as_admin(client)

    users = client.get("/api/admin/users").json()

    assert [(user["username"], user["isAdmin"], user["isActive"]) for user in users] == [
        (SEED_USERNAME, True, True),
        ("ana", False, True),
    ]


def test_admin_deactivates_a_user_who_then_loses_access(client: TestClient) -> None:
    sign_up(client, "ana", "long-enough-pass")
    client.post("/api/auth/logout")
    sign_in_as_admin(client)

    response = client.patch("/api/admin/users/2", json={"isActive": False})

    assert response.status_code == 200
    assert response.json()["isActive"] is False


def test_deactivated_user_loses_a_live_session_and_cannot_sign_in(client: TestClient) -> None:
    ana = TestClient(client.app)
    sign_up(ana, "ana", "long-enough-pass")
    sign_in_as_admin(client)
    client.patch("/api/admin/users/2", json={"isActive": False})

    assert ana.get("/api/auth/me").status_code == 401
    assert ana.post("/api/auth/login", json={"username": "ana", "password": "long-enough-pass"}).status_code == 403


def test_admin_can_reactivate_a_user(client: TestClient) -> None:
    sign_up(client, "ana", "long-enough-pass")
    client.post("/api/auth/logout")
    sign_in_as_admin(client)
    client.patch("/api/admin/users/2", json={"isActive": False})

    response = client.patch("/api/admin/users/2", json={"isActive": True})

    assert response.json()["isActive"] is True


def test_admin_cannot_deactivate_their_own_account(client: TestClient) -> None:
    sign_in_as_admin(client)

    response = client.patch("/api/admin/users/1", json={"isActive": False})

    assert response.status_code == 400


def test_unknown_user_returns_not_found(client: TestClient) -> None:
    sign_in_as_admin(client)

    assert client.patch("/api/admin/users/999", json={"isActive": False}).status_code == 404

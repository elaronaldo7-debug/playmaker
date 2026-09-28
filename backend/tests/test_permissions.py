"""
Basic tests proving the core security requirement from the spec:
a coach can never write attendance/fees outside their assigned category,
even if they manually craft a request with a different category_id.

Run with: pytest (requires a reachable TEST_DATABASE_URL / DATABASE_URL)
"""
import pytest
from datetime import date

from app import create_app
from extensions import db
from models.user import User
from models.coach import Coach
from models.category import Category
from models.player import Player


@pytest.fixture
def app():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def _make_coach(app, category_name="U13", other_category_name="U15"):
    with app.app_context():
        cat = Category(name=category_name)
        other_cat = Category(name=other_category_name)
        db.session.add_all([cat, other_cat])
        db.session.commit()

        user = User(username="coach_prasanna", role=User.ROLE_COACH, is_active=True)
        user.set_password("password123")
        db.session.add(user)
        db.session.flush()

        coach = Coach(user_id=user.id, coach_name="Prasanna", category_id=cat.id)
        db.session.add(coach)

        player_own = Player(
            player_id="P001", player_name="Own Category Player",
            date_of_birth=date(2013, 1, 1), category_id=cat.id,
        )
        player_other = Player(
            player_id="P002", player_name="Other Category Player",
            date_of_birth=date(2011, 1, 1), category_id=other_cat.id,
        )
        db.session.add_all([player_own, player_other])
        db.session.commit()

        return cat.id, other_cat.id, player_own.id, player_other.id


def _login(client, username, password):
    resp = client.post("/api/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200
    # Every /api/* response is wrapped in the standard envelope:
    # {"success": true, "data": {...}} -- see app.py's apply_response_envelope.
    return resp.get_json()["data"]["access_token"]


def test_coach_cannot_write_attendance_for_other_category(app, client):
    cat_id, other_cat_id, own_player_id, other_player_id = _make_coach(app)
    token = _login(client, "coach_prasanna", "password123")
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to save attendance for the OTHER category -> must be rejected
    resp = client.post(
        "/api/attendance",
        headers=headers,
        json={
            "date": "2026-09-07",
            "category_id": other_cat_id,
            "records": [{"player_id": other_player_id, "status": "PRESENT"}],
        },
    )
    assert resp.status_code == 403

    # Own category -> must succeed
    resp = client.post(
        "/api/attendance",
        headers=headers,
        json={
            "date": "2026-09-07",
            "category_id": cat_id,
            "records": [{"player_id": own_player_id, "status": "PRESENT"}],
        },
    )
    assert resp.status_code == 200


def test_coach_cannot_view_fees_for_other_category(app, client):
    cat_id, other_cat_id, own_player_id, other_player_id = _make_coach(app)
    token = _login(client, "coach_prasanna", "password123")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get(f"/api/fees?category_id={other_cat_id}", headers=headers)
    assert resp.status_code == 403

    resp = client.get(f"/api/fees?category_id={cat_id}", headers=headers)
    assert resp.status_code == 200

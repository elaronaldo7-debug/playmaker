from flask import Blueprint, request, jsonify

from extensions import db
from models.user import User
from models.coach import Coach
from utils.auth import require_admin

coaches_bp = Blueprint("coaches", __name__)


@coaches_bp.route("", methods=["GET"])
@require_admin
def list_coaches():
    coaches = Coach.query.join(User).order_by(Coach.coach_name).all()
    return jsonify([c.to_dict() for c in coaches])


@coaches_bp.route("/<int:coach_id>", methods=["GET"])
@require_admin
def get_coach(coach_id):
    coach = Coach.query.get_or_404(coach_id)
    return jsonify(coach.to_dict())


@coaches_bp.route("", methods=["POST"])
@require_admin
def create_coach():
    """
    Creates a login account (User, role=COACH) plus the minimal Coach profile
    row, and assigns them to a category in one step.
    """
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    coach_name = (payload.get("coach_name") or "").strip()
    category_id = payload.get("category_id")

    if not username or not password or not coach_name:
        return jsonify({"error": "username, password and coach_name are required"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already taken"}), 409

    user = User(username=username, role=User.ROLE_COACH, is_active=True)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    coach = Coach(user_id=user.id, coach_name=coach_name, category_id=category_id)
    db.session.add(coach)
    db.session.commit()

    return jsonify(coach.to_dict()), 201


@coaches_bp.route("/<int:coach_id>", methods=["PUT"])
@require_admin
def update_coach(coach_id):
    """
    Admin can rename a coach, reassign their category, and enable/disable
    their login. Coaches themselves cannot call this endpoint (require_admin).
    """
    coach = Coach.query.get_or_404(coach_id)
    payload = request.get_json(silent=True) or {}

    if "coach_name" in payload:
        coach.coach_name = (payload.get("coach_name") or "").strip() or coach.coach_name
    if "category_id" in payload:
        coach.category_id = payload.get("category_id")
    if "is_active" in payload and coach.user:
        coach.user.is_active = bool(payload.get("is_active"))
    if "password" in payload and payload.get("password") and coach.user:
        coach.user.set_password(payload["password"])

    db.session.commit()
    return jsonify(coach.to_dict())


@coaches_bp.route("/<int:coach_id>", methods=["DELETE"])
@require_admin
def delete_coach(coach_id):
    coach = Coach.query.get_or_404(coach_id)
    # Disable login rather than hard-delete, to preserve attendance/fee history
    # that references this user via marked_by / recorded_by.
    if coach.user:
        coach.user.is_active = False
    db.session.commit()
    return jsonify({"message": "Coach account disabled"})

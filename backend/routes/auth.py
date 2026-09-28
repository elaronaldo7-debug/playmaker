from flask import Blueprint, request, jsonify

from extensions import db
from services.auth_service import authenticate, get_user_context
from utils.auth import require_auth, get_current_user

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    user, token = authenticate(username, password)
    if not user:
        return jsonify({"error": "Invalid username or password"}), 401

    return jsonify({"access_token": token, "user": get_user_context(user)})


@auth_bp.route("/me", methods=["GET"])
@require_auth
def me():
    user = get_current_user()
    return jsonify(get_user_context(user))


@auth_bp.route("/logout", methods=["POST"])
@require_auth
def logout():
    # Stateless JWT: the client is responsible for discarding the token.
    # This endpoint exists for a clean API contract / future token-blocklist support.
    return jsonify({"message": "Logged out"})


@auth_bp.route("/change-password", methods=["PUT"])
@require_auth
def change_password():
    """
    Self-service password change, for the Settings screen -- works the same
    for Admin and Coach: both change their OWN password here (an admin
    resetting a coach's password instead uses PUT /api/coaches/:id).
    """
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    current_password = payload.get("current_password") or ""
    new_password = payload.get("new_password") or ""

    if not current_password or not new_password:
        return jsonify({"error": "current_password and new_password are required"}), 400
    if len(new_password) < 6:
        return jsonify({"error": "new_password must be at least 6 characters"}), 400
    if not user.check_password(current_password):
        return jsonify({"error": "Current password is incorrect"}), 401

    user.set_password(new_password)
    db.session.commit()
    return jsonify({"message": "Password updated successfully"})

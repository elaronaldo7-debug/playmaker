"""
Reusable authentication decorators built on top of Flask-JWT-Extended.

These decorators are the ONLY place where "am I logged in / what is my role"
is decided. Route handlers should never re-implement this logic.
"""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity

from models.user import User
from models.coach import Coach


def require_auth(fn):
    """Require a valid JWT. Attaches nothing extra, just validates the token."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        if not user or not user.is_active:
            return jsonify({"error": "Account is disabled or does not exist"}), 401
        return fn(*args, **kwargs)
    return wrapper


def require_admin(fn):
    """Require a valid JWT AND role == ADMIN."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get("role") != User.ROLE_ADMIN:
            return jsonify({"error": "Admin access required"}), 403
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        if not user or not user.is_active:
            return jsonify({"error": "Account is disabled or does not exist"}), 401
        return fn(*args, **kwargs)
    return wrapper


def require_coach_or_admin(fn):
    """Require a valid JWT with role ADMIN or COACH (i.e. any authenticated staff user)."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get("role") not in (User.ROLE_ADMIN, User.ROLE_COACH):
            return jsonify({"error": "Access denied"}), 403
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        if not user or not user.is_active:
            return jsonify({"error": "Account is disabled or does not exist"}), 401
        return fn(*args, **kwargs)
    return wrapper


def get_current_user():
    """Fetch the full User row for the currently authenticated request."""
    user_id = get_jwt_identity()
    return User.query.get(int(user_id))


def get_current_coach_category_id():
    """
    Returns the category_id assigned to the current user, IF they are a coach.
    Returns None for admins (who are not restricted to one category) or if
    the coach somehow has no assignment yet.
    """
    user = get_current_user()
    if not user or user.role != User.ROLE_COACH:
        return None
    coach = Coach.query.filter_by(user_id=user.id).first()
    return coach.category_id if coach else None

"""
Reusable authentication decorators built on top of Flask-JWT-Extended.

These decorators are the ONLY place where "am I logged in / what is my role"
is decided. Route handlers should never re-implement this logic.
"""

from functools import wraps

from flask import jsonify

from flask_jwt_extended import (
    verify_jwt_in_request,
    get_jwt,
    get_jwt_identity,
)

from models.user import User
from models.coach import Coach


# ============================================================
# REQUIRE AUTHENTICATED USER
# ============================================================

def require_auth(fn):
    """
    Require a valid JWT.

    Any active authenticated user is allowed:
    ADMIN
    COACH
    PLAYER
    """

    @wraps(fn)
    def wrapper(*args, **kwargs):

        verify_jwt_in_request()

        user_id = get_jwt_identity()

        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            return jsonify({
                "error": "Invalid user identity"
            }), 401

        user = User.query.get(user_id)

        if not user or not user.is_active:
            return jsonify({
                "error": "Account is disabled or does not exist"
            }), 401

        return fn(*args, **kwargs)

    return wrapper


# ============================================================
# REQUIRE ADMIN
# ============================================================

def require_admin(fn):
    """
    Require a valid JWT AND role == ADMIN.
    """

    @wraps(fn)
    def wrapper(*args, **kwargs):

        verify_jwt_in_request()

        claims = get_jwt()

        if claims.get("role") != User.ROLE_ADMIN:
            return jsonify({
                "error": "Admin access required"
            }), 403

        user_id = get_jwt_identity()

        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            return jsonify({
                "error": "Invalid user identity"
            }), 401

        user = User.query.get(user_id)

        if not user or not user.is_active:
            return jsonify({
                "error": "Account is disabled or does not exist"
            }), 401

        return fn(*args, **kwargs)

    return wrapper


# ============================================================
# REQUIRE COACH OR ADMIN
# ============================================================

def require_coach_or_admin(fn):
    """
    Require a valid JWT with role ADMIN or COACH.
    """

    @wraps(fn)
    def wrapper(*args, **kwargs):

        verify_jwt_in_request()

        claims = get_jwt()

        if claims.get("role") not in (
            User.ROLE_ADMIN,
            User.ROLE_COACH,
        ):
            return jsonify({
                "error": "Access denied"
            }), 403

        user_id = get_jwt_identity()

        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            return jsonify({
                "error": "Invalid user identity"
            }), 401

        user = User.query.get(user_id)

        if not user or not user.is_active:
            return jsonify({
                "error": "Account is disabled or does not exist"
            }), 401

        return fn(*args, **kwargs)

    return wrapper


# ============================================================
# REQUIRE PLAYER
# ============================================================

def require_player(fn):
    """
    Require a valid JWT AND role == PLAYER.

    A PLAYER must:
    - have an active user account
    - have a linked player profile
    - have an ACTIVE player profile
    """

    @wraps(fn)
    def wrapper(*args, **kwargs):

        verify_jwt_in_request()

        claims = get_jwt()

        if claims.get("role") != User.ROLE_PLAYER:
            return jsonify({
                "error": "Player access required"
            }), 403

        user_id = get_jwt_identity()

        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            return jsonify({
                "error": "Invalid user identity"
            }), 401

        user = User.query.get(user_id)

        if not user or not user.is_active:
            return jsonify({
                "error": "Account is disabled or does not exist"
            }), 401

        player = getattr(user, "player", None)

        if not player:
            return jsonify({
                "error": "Player profile is not linked to this account"
            }), 403

        if player.status != player.STATUS_ACTIVE:
            return jsonify({
                "error": "Player account is inactive"
            }), 403

        return fn(*args, **kwargs)

    return wrapper


# ============================================================
# CURRENT USER
# ============================================================

def get_current_user():
    """
    Fetch the full User row for the currently authenticated request.

    Returns:
        User object
        None if the user does not exist
    """

    user_id = get_jwt_identity()

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None

    return User.query.get(user_id)


# ============================================================
# CURRENT PLAYER
# ============================================================

def get_current_player():
    """
    Fetch the Player profile linked to the currently authenticated
    PLAYER account.

    Returns:
        Player object
        None if no linked player exists.
    """

    user = get_current_user()

    if not user:
        return None

    if user.role != User.ROLE_PLAYER:
        return None

    player = getattr(user, "player", None)

    if not player:
        return None

    return player


# ============================================================
# CURRENT COACH CATEGORY
# ============================================================

def get_current_coach_category_id():
    """
    Returns the category_id assigned to the current user,
    IF they are a coach.

    Returns:
        category_id for COACH
        None for ADMIN
        None if coach has no category assignment
    """

    user = get_current_user()

    if not user or user.role != User.ROLE_COACH:
        return None

    coach = Coach.query.filter_by(
        user_id=user.id
    ).first()

    return coach.category_id if coach else None
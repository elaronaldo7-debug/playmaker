"""
Authentication and authorization helpers for Playmaker FC.

Roles:
    ADMIN
    COACH
    PLAYER

PLAYER security:
    A PLAYER can access only the Player record linked to
    their own User account.
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
# REQUIRE AUTHENTICATION
# ============================================================

def require_auth(fn):
    """
    Require a valid JWT.

    Any active authenticated user can pass this decorator.
    """

    @wraps(fn)
    def wrapper(*args, **kwargs):

        verify_jwt_in_request()

        user_id = get_jwt_identity()

        try:
            user_id = int(user_id)
        except (TypeError, ValueError):

            return jsonify({
                "error": "Invalid authentication identity"
            }), 401

        user = User.query.get(
            user_id
        )

        if not user:

            return jsonify({
                "error": "Account does not exist"
            }), 401

        if not user.is_active:

            return jsonify({
                "error": "Account is disabled"
            }), 401

        return fn(*args, **kwargs)

    return wrapper


# ============================================================
# REQUIRE ADMIN
# ============================================================

def require_admin(fn):
    """
    Require:
        1. Valid JWT
        2. Active User
        3. ADMIN role
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
                "error": "Invalid authentication identity"
            }), 401

        user = User.query.get(
            user_id
        )

        if not user:

            return jsonify({
                "error": "Account does not exist"
            }), 401

        if not user.is_active:

            return jsonify({
                "error": "Account is disabled"
            }), 401

        return fn(*args, **kwargs)

    return wrapper


# ============================================================
# REQUIRE COACH OR ADMIN
# ============================================================

def require_coach_or_admin(fn):
    """
    Require:
        ADMIN or COACH

    PLAYER is intentionally NOT allowed.
    """

    @wraps(fn)
    def wrapper(*args, **kwargs):

        verify_jwt_in_request()

        claims = get_jwt()

        role = claims.get(
            "role"
        )

        if role not in (
            User.ROLE_ADMIN,
            User.ROLE_COACH,
        ):

            return jsonify({
                "error": "Admin or Coach access required"
            }), 403

        user_id = get_jwt_identity()

        try:
            user_id = int(user_id)
        except (TypeError, ValueError):

            return jsonify({
                "error": "Invalid authentication identity"
            }), 401

        user = User.query.get(
            user_id
        )

        if not user:

            return jsonify({
                "error": "Account does not exist"
            }), 401

        if not user.is_active:

            return jsonify({
                "error": "Account is disabled"
            }), 401

        return fn(*args, **kwargs)

    return wrapper


# ============================================================
# REQUIRE PLAYER
# ============================================================

def require_player(fn):
    """
    Require:
        1. Valid JWT
        2. Active User
        3. PLAYER role
        4. Linked Player profile

    IMPORTANT:
    The player profile is resolved from:

        JWT
          ↓
        User
          ↓
        Player

    The client does NOT provide the Player ID.
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
                "error": "Invalid authentication identity"
            }), 401

        user = User.query.get(
            user_id
        )

        if not user:

            return jsonify({
                "error": "Account does not exist"
            }), 401

        if not user.is_active:

            return jsonify({
                "error": "Account is disabled"
            }), 401

        player = getattr(
            user,
            "player",
            None
        )

        if not player:

            return jsonify({
                "error": (
                    "Player profile is not linked "
                    "to this account"
                )
            }), 403

        return fn(*args, **kwargs)

    return wrapper


# ============================================================
# GET CURRENT USER
# ============================================================

def get_current_user():
    """
    Return the User associated with the current JWT.
    """

    user_id = get_jwt_identity()

    if user_id is None:
        return None

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):

        return None

    return User.query.get(
        user_id
    )


# ============================================================
# GET CURRENT PLAYER
# ============================================================

def get_current_player():
    """
    Return ONLY the Player linked to the currently
    authenticated PLAYER account.

    NEVER uses a Player ID supplied by the client.
    """

    user = get_current_user()

    if not user:

        return None

    if user.role != User.ROLE_PLAYER:

        return None

    return getattr(
        user,
        "player",
        None
    )


# ============================================================
# GET CURRENT COACH CATEGORY
# ============================================================

def get_current_coach_category_id():
    """
    Return the category assigned to the current COACH.

    ADMIN:
        Returns None because Admin is not restricted
        to one category.

    COACH without category:
        Returns None.
    """

    user = get_current_user()

    if not user:

        return None

    if user.role != User.ROLE_COACH:

        return None

    coach = Coach.query.filter_by(
        user_id=user.id
    ).first()

    if not coach:

        return None

    return coach.category_id
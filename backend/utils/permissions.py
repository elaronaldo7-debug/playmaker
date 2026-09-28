"""
Category-level and action-level permission checks.

This is the single source of truth for whether a user can act on a given
category or record. Every route that touches attendance or fees MUST run
its request through these helpers -- never trust category values sent from
the React Native app.
"""
from models.user import User
from utils.auth import get_current_user, get_current_coach_category_id


class PermissionError(Exception):
    """Raised when a user attempts an action outside their allowed scope."""

    def __init__(self, message="You do not have permission to perform this action", status_code=403):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def category_permission_check(category_id, action="write"):
    """
    Verifies the current user may act on the given category_id.

    - ADMIN: always allowed (read + write, all categories).
    - COACH, action == "read": always allowed (coaches can VIEW all
      categories' players and attendance reports).
    - COACH, action == "write" (attendance/fees mutation): only allowed for
      their own assigned category_id.

    Raises PermissionError if not allowed. Call this before ANY attendance or
    fee mutation, and before any fee read that is category-scoped.
    """
    user = get_current_user()
    if user is None:
        raise PermissionError("Not authenticated", 401)

    if user.role == User.ROLE_ADMIN:
        return True

    if user.role == User.ROLE_COACH:
        if action == "read":
            return True
        assigned_category_id = get_current_coach_category_id()
        if assigned_category_id is None:
            raise PermissionError("Coach has no assigned category", 403)
        if int(category_id) != int(assigned_category_id):
            raise PermissionError(
                "You can only manage your own assigned category", 403
            )
        return True

    raise PermissionError("Unknown role", 403)


def can_view_fee_category(category_id):
    """
    Fees are more restrictive than attendance: coaches can only VIEW fees
    (not just mutate them) for their own assigned category.
    """
    user = get_current_user()
    if user is None:
        raise PermissionError("Not authenticated", 401)
    if user.role == User.ROLE_ADMIN:
        return True
    assigned_category_id = get_current_coach_category_id()
    if assigned_category_id is None or int(category_id) != int(assigned_category_id):
        raise PermissionError("You can only access fees for your assigned category", 403)
    return True

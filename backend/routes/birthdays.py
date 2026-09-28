from flask import Blueprint, jsonify

from utils.auth import require_coach_or_admin
from services.birthday_service import get_active_birthday_reminders

birthdays_bp = Blueprint("birthdays", __name__)


@birthdays_bp.route("", methods=["GET"])
@require_coach_or_admin
def birthdays():
    """Visible to both Admin and all Coaches, per spec."""
    return jsonify(get_active_birthday_reminders())

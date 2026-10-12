from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity

from models.attendance import Attendance
from models.player import Player

from utils.auth import (
    require_coach_or_admin,
    require_player,
    get_current_player,
)

from utils.permissions import (
    category_permission_check,
    PermissionError,
)

from services.attendance_service import (
    get_attendance_for_category_date,
    upsert_attendance_records,
    update_single_attendance,
    VALID_STATUSES,
)

attendance_bp = Blueprint("attendance", __name__)


def _parse_date(value):
    return datetime.strptime(value, "%Y-%m-%d").date()


# ============================================================
# PLAYER: VIEW OWN ATTENDANCE
# ============================================================

@attendance_bp.route("/me", methods=["GET"])
@require_player
def get_my_attendance():
    """
    GET /api/attendance/me

    Player can view ONLY their own attendance.
    The player ID is obtained from the authenticated user's profile,
    never from a client-supplied player_id.
    """

    player = get_current_player()

    if not player:
        return jsonify({
            "error": "Player profile is not linked to this account"
        }), 403

    query = Attendance.query.filter(
        Attendance.player_id == player.id
    )

    date_str = request.args.get("date")

    if date_str:
        try:
            target_date = _parse_date(date_str)
        except ValueError:
            return jsonify({
                "error": "date must be in YYYY-MM-DD format"
            }), 400

        query = query.filter(Attendance.date == target_date)

    rows = query.order_by(Attendance.date.desc()).all()

    return jsonify({
        "player_id": player.id,
        "player_name": player.player_name,
        "attendance": [row.to_dict() for row in rows],
    }), 200


# ============================================================
# ADMIN / COACH: VIEW CATEGORY ATTENDANCE
# ============================================================

@attendance_bp.route("", methods=["GET"])
@require_coach_or_admin
def get_attendance():
    """
    GET /api/attendance?date=2026-09-07&category_id=3

    Existing Admin/Coach category attendance functionality.
    """

    date_str = request.args.get("date")
    category_id = request.args.get("category_id")

    if not date_str or not category_id:
        return jsonify({
            "error": "date and category_id are required"
        }), 400

    try:
        category_id = int(category_id)
    except (ValueError, TypeError):
        return jsonify({
            "error": "category_id must be an integer"
        }), 400

    try:
        target_date = _parse_date(date_str)
    except ValueError:
        return jsonify({
            "error": "date must be in YYYY-MM-DD format"
        }), 400

    rows, counts = get_attendance_for_category_date(
        category_id,
        target_date,
    )

    return jsonify({
        "date": date_str,
        "category_id": category_id,
        "players": rows,
        "counts": counts,
    }), 200


# ============================================================
# ADMIN / COACH: SAVE CATEGORY ATTENDANCE
# ============================================================

@attendance_bp.route("", methods=["POST"])
@require_coach_or_admin
def save_attendance():
    """
    POST /api/attendance

    Bulk attendance save for Admin/Coach.
    """

    payload = request.get_json(silent=True) or {}

    date_str = payload.get("date")
    category_id = payload.get("category_id")
    records = payload.get("records", [])

    if (
        not date_str
        or category_id is None
        or not isinstance(records, list)
    ):
        return jsonify({
            "error": "date, category_id and records[] are required"
        }), 400

    try:
        category_id = int(category_id)
    except (ValueError, TypeError):
        return jsonify({
            "error": "category_id must be an integer"
        }), 400

    try:
        category_permission_check(
            category_id,
            action="write",
        )
    except PermissionError as e:
        return jsonify({
            "error": e.message
        }), e.status_code

    try:
        target_date = _parse_date(date_str)
    except ValueError:
        return jsonify({
            "error": "date must be in YYYY-MM-DD format"
        }), 400

    current_user_id = int(get_jwt_identity())

    saved = upsert_attendance_records(
        category_id,
        target_date,
        records,
        current_user_id,
    )

    return jsonify({
        "message": "Attendance saved",
        "records_saved": saved,
    }), 200


# ============================================================
# ADMIN / COACH: UPDATE ONE ATTENDANCE RECORD
# ============================================================

@attendance_bp.route("/<int:attendance_id>", methods=["PUT"])
@require_coach_or_admin
def update_attendance(attendance_id):
    """
    Single attendance correction for Admin/Coach.
    """

    row = Attendance.query.get_or_404(attendance_id)

    payload = request.get_json(silent=True) or {}
    status = payload.get("status")

    if status not in VALID_STATUSES:
        return jsonify({
            "error": "status must be PRESENT, ABSENT or UNMARKED"
        }), 400

    try:
        category_permission_check(
            row.player.category_id,
            action="write",
        )
    except PermissionError as e:
        return jsonify({
            "error": e.message
        }), e.status_code

    current_user_id = int(get_jwt_identity())

    row = update_single_attendance(
        row,
        status,
        current_user_id,
    )

    return jsonify(row.to_dict()), 200
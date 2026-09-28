from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity

from models.attendance import Attendance
from utils.auth import require_coach_or_admin
from utils.permissions import category_permission_check, PermissionError
from services.attendance_service import (
    get_attendance_for_category_date,
    upsert_attendance_records,
    update_single_attendance,
    VALID_STATUSES,
)

attendance_bp = Blueprint("attendance", __name__)


def _parse_date(value):
    return datetime.strptime(value, "%Y-%m-%d").date()


@attendance_bp.route("", methods=["GET"])
@require_coach_or_admin
def get_attendance():
    """
    GET /api/attendance?date=2026-09-07&category_id=3

    Returns every ACTIVE player in the category alongside their attendance
    status for that date (UNMARKED if no row exists yet), plus counts for the
    top summary bar. Read access is allowed for any authenticated user
    (coaches can view other categories' attendance, per spec) -- only WRITES
    are category-restricted.
    """
    date_str = request.args.get("date")
    category_id = request.args.get("category_id")
    if not date_str or not category_id:
        return jsonify({"error": "date and category_id are required"}), 400

    try:
        category_id = int(category_id)
    except ValueError:
        return jsonify({"error": "category_id must be an integer"}), 400

    try:
        target_date = _parse_date(date_str)
    except ValueError:
        return jsonify({"error": "date must be in YYYY-MM-DD format"}), 400

    rows, counts = get_attendance_for_category_date(category_id, target_date)

    return jsonify(
        {
            "date": date_str,
            "category_id": category_id,
            "players": rows,
            "counts": counts,
        }
    )


@attendance_bp.route("", methods=["POST"])
@require_coach_or_admin
def save_attendance():
    """
    POST /api/attendance
    {
      "date": "2026-09-07",
      "category_id": 3,
      "records": [ {"player_id": 12, "status": "PRESENT"}, ... ]
    }

    Bulk upsert for a whole category's attendance in one save action, matching
    the "Save Attendance" button in the app. The backend re-verifies the
    category on EVERY record's player, so a coach cannot smuggle another
    category's player_id into the payload.
    """
    payload = request.get_json(silent=True) or {}
    date_str = payload.get("date")
    category_id = payload.get("category_id")
    records = payload.get("records", [])

    if not date_str or not category_id or not isinstance(records, list):
        return jsonify({"error": "date, category_id and records[] are required"}), 400

    try:
        category_id = int(category_id)
    except (ValueError, TypeError):
        return jsonify({"error": "category_id must be an integer"}), 400

    try:
        category_permission_check(category_id, action="write")
    except PermissionError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        target_date = _parse_date(date_str)
    except ValueError:
        return jsonify({"error": "date must be in YYYY-MM-DD format"}), 400

    current_user_id = int(get_jwt_identity())
    saved = upsert_attendance_records(category_id, target_date, records, current_user_id)

    return jsonify({"message": "Attendance saved", "records_saved": saved})


@attendance_bp.route("/<int:attendance_id>", methods=["PUT"])
@require_coach_or_admin
def update_attendance(attendance_id):
    """Single-record correction (e.g. fixing one player after the bulk save)."""
    row = Attendance.query.get_or_404(attendance_id)
    payload = request.get_json(silent=True) or {}
    status = payload.get("status")

    if status not in VALID_STATUSES:
        return jsonify({"error": "status must be PRESENT, ABSENT or UNMARKED"}), 400

    try:
        category_permission_check(row.player.category_id, action="write")
    except PermissionError as e:
        return jsonify({"error": e.message}), e.status_code

    current_user_id = int(get_jwt_identity())
    row = update_single_attendance(row, status, current_user_id)
    return jsonify(row.to_dict())
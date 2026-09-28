from flask import Blueprint, request, jsonify

from utils.auth import require_coach_or_admin, get_current_user
from utils.permissions import can_view_fee_category, PermissionError
from models.user import User
from services.report_service import (
    build_attendance_report,
    build_fees_report,
    build_fees_report_all_categories,
)

reports_bp = Blueprint("reports", __name__)


@reports_bp.route("/attendance", methods=["GET"])
@require_coach_or_admin
def attendance_report():
    """
    GET /api/reports/attendance?category_id=&player_id=&date_from=&date_to=&month=

    Attendance reports are viewable by BOTH admin and coach for ALL categories
    (per spec -- attendance is not category-restricted for reads).
    """
    category_id = request.args.get("category_id")
    player_id = request.args.get("player_id")
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    month = request.args.get("month")  # YYYY-MM, filters by date prefix

    report = build_attendance_report(
        category_id=category_id, player_id=player_id, date_from=date_from, date_to=date_to, month=month
    )
    return jsonify(report)


@reports_bp.route("/fees", methods=["GET"])
@require_coach_or_admin
def fees_report():
    """
    GET /api/reports/fees?category_id=&month=&status=

    Fee reports are category-restricted for coaches: they may only view their
    own assigned category. Admin can view any/all categories, plus pending-fees
    and monthly-collection roll-ups.
    """
    category_id = request.args.get("category_id")
    month = request.args.get("month")
    status = request.args.get("status")

    user = get_current_user()

    if category_id:
        try:
            can_view_fee_category(category_id)
        except PermissionError as e:
            return jsonify({"error": e.message}), e.status_code
        report = build_fees_report(category_id, month=month, status=status)
    else:
        if user.role != User.ROLE_ADMIN:
            return jsonify({"error": "category_id is required for coach fee reports"}), 403
        report = build_fees_report_all_categories(month=month, status=status)

    return jsonify(report)

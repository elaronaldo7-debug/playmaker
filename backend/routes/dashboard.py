from datetime import date
from flask import Blueprint, jsonify
from flask import current_app

from extensions import db
from models.user import User
from models.player import Player
from models.attendance import Attendance
from models.fee import Fee
from models.category import Category
from utils.auth import require_coach_or_admin, get_current_user, get_current_coach_category_id
from services.birthday_service import get_active_birthday_reminders

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("", methods=["GET"])
@require_coach_or_admin
def dashboard():
    user = get_current_user()
    today = date.today()

    if user.role == User.ROLE_ADMIN:
        return jsonify(_admin_dashboard(today))
    return jsonify(_coach_dashboard(today))


def _admin_dashboard(today):
    total_players = Player.query.count()
    active_players = Player.query.filter_by(status=Player.STATUS_ACTIVE).count()
    inactive_players = total_players - active_players

    today_present = Attendance.query.filter_by(date=today, status=Attendance.STATUS_PRESENT).count()
    today_absent = Attendance.query.filter_by(date=today, status=Attendance.STATUS_ABSENT).count()

    month_key = today.strftime("%Y-%m")
    fees_this_month = Fee.query.filter_by(month=month_key).all()
    fees_collected = sum(float(f.paid_amount) for f in fees_this_month)
    pending_fees = sum(float(f.balance) for f in fees_this_month if f.balance > 0)

    category_summary = []
    for category in Category.query.filter_by(is_active=True).order_by(Category.name).all():
        count = Player.query.filter_by(category_id=category.id, status=Player.STATUS_ACTIVE).count()
        category_summary.append({"category_id": category.id, "category_name": category.name, "active_players": count})

    return {
        "role": "ADMIN",
        "total_players": total_players,
        "active_players": active_players,
        "inactive_players": inactive_players,
        "today_present": today_present,
        "today_absent": today_absent,
        "this_month_fees_collected": round(fees_collected, 2),
        "pending_fees": round(pending_fees, 2),
        "category_summary": category_summary,
        "birthday_reminders": get_active_birthday_reminders(today),
    }


def _coach_dashboard(today):
    category_id = get_current_coach_category_id()

    # Total ACTIVE players across the ENTIRE club (every category, not
    # just the coach's own), so the coach dashboard can show the
    # club-wide headcount alongside their own category's numbers below.
    total_club_players = Player.query.filter_by(status=Player.STATUS_ACTIVE).count()

    if category_id is None:
        return {
            "role": "COACH",
            "error": "No category assigned yet. Please contact your admin.",
            "total_club_players": total_club_players,
            "birthday_reminders": get_active_birthday_reminders(today),
        }

    category = Category.query.get(category_id)
    active_players = Player.query.filter_by(category_id=category_id, status=Player.STATUS_ACTIVE).count()

    today_present = (
        Attendance.query.join(Player)
        .filter(Attendance.date == today, Player.category_id == category_id, Attendance.status == Attendance.STATUS_PRESENT)
        .count()
    )
    today_absent = (
        Attendance.query.join(Player)
        .filter(Attendance.date == today, Player.category_id == category_id, Attendance.status == Attendance.STATUS_ABSENT)
        .count()
    )

    return {
        "role": "COACH",
        "category_id": category_id,
        "category_name": category.name if category else None,
        "assigned_category_player_count": active_players,
        "active_players": active_players,
        "total_club_players": total_club_players,
        "today_present": today_present,
        "today_absent": today_absent,
        "birthday_reminders": get_active_birthday_reminders(today),
    }
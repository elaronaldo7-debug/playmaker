"""
Reporting business logic, extracted out of routes/reports.py so the query
building and totals live in one reusable place (per the requested
backend/services/report_service.py module).
"""
import calendar
from datetime import date as date_cls

from models.attendance import Attendance
from models.player import Player
from models.fee import Fee


def _month_bounds(month_str):
    """
    'YYYY-MM' -> (first_day, last_day) as date objects.

    Used instead of a database-specific function like Postgres' to_char(),
    so the same query works identically on Postgres (production) and
    SQLite (tests) without a dialect-specific SQL function.
    """
    year, month = (int(part) for part in month_str.split("-"))
    first_day = date_cls(year, month, 1)
    last_day = date_cls(year, month, calendar.monthrange(year, month)[1])
    return first_day, last_day


def build_attendance_report(category_id=None, player_id=None, date_from=None, date_to=None, month=None):
    """
    Builds the attendance report record set + summary for the given filters.
    Available to both Admin and Coach for ALL categories (attendance reads
    are not category-restricted, per spec).
    """
    query = Attendance.query.join(Player)

    if category_id:
        query = query.filter(Player.category_id == category_id)
    if player_id:
        query = query.filter(Attendance.player_id == player_id)
    if date_from:
        query = query.filter(Attendance.date >= date_from)
    if date_to:
        query = query.filter(Attendance.date <= date_to)
    if month:
        first_day, last_day = _month_bounds(month)
        query = query.filter(Attendance.date >= first_day, Attendance.date <= last_day)

    records = query.order_by(Attendance.date.desc()).limit(2000).all()

    present = sum(1 for r in records if r.status == Attendance.STATUS_PRESENT)
    absent = sum(1 for r in records if r.status == Attendance.STATUS_ABSENT)

    return {
        "records": [r.to_dict() for r in records],
        "summary": {"present": present, "absent": absent, "total": len(records)},
    }


def build_fees_report(category_id, month=None, status=None):
    """
    Builds the fees report record set + summary for a single category.
    Category-scoping / permission is the caller's responsibility (see
    utils/permissions.can_view_fee_category) -- this function assumes the
    category_id it receives has already been authorized.
    """
    query = Fee.query.join(Player).filter(Player.category_id == category_id)

    if month:
        query = query.filter(Fee.month == month)
    if status:
        query = query.filter(Fee.status == status.upper())

    fees = query.order_by(Fee.month.desc()).all()

    total_collected = sum(float(f.paid_amount) for f in fees)
    total_pending = sum(float(f.balance) for f in fees if f.balance > 0)

    return {
        "records": [f.to_dict() for f in fees],
        "summary": {
            "total_collected": round(total_collected, 2),
            "total_pending": round(total_pending, 2),
            "count": len(fees),
        },
    }


def build_fees_report_all_categories(month=None, status=None):
    """Admin-only: same as build_fees_report but across every category."""
    query = Fee.query

    if month:
        query = query.filter(Fee.month == month)
    if status:
        query = query.filter(Fee.status == status.upper())

    fees = query.order_by(Fee.month.desc()).all()

    total_collected = sum(float(f.paid_amount) for f in fees)
    total_pending = sum(float(f.balance) for f in fees if f.balance > 0)

    return {
        "records": [f.to_dict() for f in fees],
        "summary": {
            "total_collected": round(total_collected, 2),
            "total_pending": round(total_pending, 2),
            "count": len(fees),
        },
    }

"""
Attendance business logic, extracted out of routes/attendance.py so the
upsert rules live in one reusable place (per the requested
backend/services/attendance_service.py module).
"""
from extensions import db
from models.attendance import Attendance
from models.player import Player

VALID_STATUSES = {Attendance.STATUS_PRESENT, Attendance.STATUS_ABSENT, Attendance.STATUS_UNMARKED}


def get_attendance_for_category_date(category_id, target_date):
    """
    Returns (rows, counts) for every ACTIVE player in the category on the
    given date. Players with no attendance row yet are reported as
    UNMARKED, never treated as Present or Absent.
    """
    players = (
        Player.query.filter_by(category_id=category_id, status=Player.STATUS_ACTIVE)
        .order_by(Player.player_name)
        .all()
    )
    existing = {
        a.player_id: a
        for a in Attendance.query.filter_by(date=target_date)
        .join(Player)
        .filter(Player.category_id == category_id)
        .all()
    }

    rows = []
    present = absent = unmarked = 0
    for player in players:
        record = existing.get(player.id)
        status = record.status if record else Attendance.STATUS_UNMARKED
        if status == Attendance.STATUS_PRESENT:
            present += 1
        elif status == Attendance.STATUS_ABSENT:
            absent += 1
        else:
            unmarked += 1
        rows.append(
            {
                "player_id": player.id,
                "player_name": player.player_name,
                "profile_photo": player.profile_photo,
                "status": status,
                "attendance_id": record.id if record else None,
            }
        )

    counts = {"present": present, "absent": absent, "unmarked": unmarked, "total": len(rows)}
    return rows, counts


def upsert_attendance_records(category_id, target_date, records, marked_by_user_id):
    """
    Bulk upsert-style save for a whole category's attendance in one action.

    - Creates a new Attendance row if one doesn't exist for (player, date).
    - Updates the existing row otherwise (never creates duplicates for the
      same player/date -- protected by the unique constraint on the model
      as well, this is the application-level enforcement of that rule).
    - Silently skips any player_id NOT in the given category (defends
      against a tampered payload smuggling another category's player in),
      and any status outside PRESENT/ABSENT/UNMARKED.

    Returns the number of records actually written.
    """
    player_ids_in_category = {
        p.id for p in Player.query.filter_by(category_id=category_id).all()
    }

    saved = 0
    for record in records:
        player_id = record.get("player_id")
        status = record.get("status")
        if player_id not in player_ids_in_category:
            continue
        if status not in VALID_STATUSES:
            continue

        row = Attendance.query.filter_by(player_id=player_id, date=target_date).first()
        if row is None:
            row = Attendance(player_id=player_id, date=target_date)
            db.session.add(row)
        row.status = status
        row.marked_by = marked_by_user_id
        saved += 1

    db.session.commit()
    return saved


def update_single_attendance(attendance_row, status, marked_by_user_id):
    """Applies a validated single-record correction and commits."""
    attendance_row.status = status
    attendance_row.marked_by = marked_by_user_id
    db.session.commit()
    return attendance_row
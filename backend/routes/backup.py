from flask import Blueprint, jsonify
from datetime import datetime

from utils.auth import require_coach_or_admin
from extensions import db

from models.user import User
from models.coach import Coach
from models.category import Category
from models.player import Player
from models.attendance import Attendance
from models.fee import Fee


backup_bp = Blueprint("backup", __name__)


@backup_bp.route("/json", methods=["GET"])
@require_coach_or_admin
def create_json_backup():

    try:
        users = User.query.all()
        coaches = Coach.query.all()
        categories = Category.query.all()
        players = Player.query.all()
        attendance = Attendance.query.all()
        fees = Fee.query.all()

        backup = {
            "backup_info": {
                "academy": "Playmaker FC",
                "created_at": datetime.utcnow().isoformat(),
                "format": "JSON",
                "version": "1.0",
            },

            "users": [
                user.to_dict()
                for user in users
            ],

            "coaches": [
                coach.to_dict()
                for coach in coaches
            ],

            "categories": [
                category.to_dict()
                for category in categories
            ],

            "players": [
                player.to_dict()
                for player in players
            ],

            "attendance": [
                record.to_dict()
                for record in attendance
            ],

            "fees": [
                fee.to_dict(include_payments=True)
                for fee in fees
            ],
        }

        return jsonify(backup), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": "Failed to create JSON backup",
            "detail": str(e)
        }), 500
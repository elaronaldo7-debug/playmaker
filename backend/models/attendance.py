from datetime import datetime
from extensions import db


class Attendance(db.Model):
    __tablename__ = "attendance"
    __table_args__ = (
        db.UniqueConstraint("player_id", "date", name="uq_attendance_player_date"),
        db.Index("ix_attendance_date", "date"),
    )

    id = db.Column(db.Integer, primary_key=True)
    player_id = db.Column(db.Integer, db.ForeignKey("players.id"), nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(10), default="UNMARKED", nullable=False)
    marked_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    player = db.relationship("Player", back_populates="attendance_records")
    marked_by_user = db.relationship("User")

    STATUS_PRESENT = "PRESENT"
    STATUS_ABSENT = "ABSENT"
    STATUS_UNMARKED = "UNMARKED"

    def to_dict(self):
        return {
            "id": self.id,
            "player_id": self.player_id,
            "player_name": self.player.player_name if self.player else None,
            "date": self.date.isoformat() if self.date else None,
            "status": self.status,
            "marked_by": self.marked_by,
        }

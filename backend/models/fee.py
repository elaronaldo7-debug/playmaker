from datetime import datetime
from extensions import db


class Fee(db.Model):
    __tablename__ = "fees"
    __table_args__ = (
        db.UniqueConstraint("player_id", "month", name="uq_fee_player_month"),
        db.Index("ix_fee_status", "status"),
        db.Index("ix_fee_month", "month"),
    )

    id = db.Column(db.Integer, primary_key=True)
    player_id = db.Column(db.Integer, db.ForeignKey("players.id"), nullable=False)
    fee_amount = db.Column(db.Numeric(10, 2), nullable=False)
    paid_amount = db.Column(db.Numeric(10, 2), default=0, nullable=False)
    balance = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(db.String(10), default="PENDING", nullable=False)
    month = db.Column(db.String(7), nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    player = db.relationship("Player", back_populates="fees")
    payments = db.relationship(
        "FeePayment", back_populates="fee", cascade="all, delete-orphan", order_by="FeePayment.payment_date"
    )

    STATUS_PAID = "PAID"
    STATUS_PENDING = "PENDING"
    STATUS_PARTIAL = "PARTIAL"

    def recalculate(self):
        total_paid = sum((p.amount for p in self.payments), start=0)
        self.paid_amount = total_paid
        self.balance = self.fee_amount - total_paid
        if self.balance <= 0:
            self.status = self.STATUS_PAID
        elif total_paid > 0:
            self.status = self.STATUS_PARTIAL
        else:
            self.status = self.STATUS_PENDING

    def to_dict(self, include_payments=False):
        data = {
            "id": self.id,
            "player_id": self.player_id,
            "player_name": self.player.player_name if self.player else None,
            "category_id": self.player.category_id if self.player else None,
            "fee_amount": float(self.fee_amount),
            "paid_amount": float(self.paid_amount),
            "balance": float(self.balance),
            "status": self.status,
            "month": self.month,
        }
        if include_payments:
            data["payments"] = [p.to_dict() for p in self.payments]
        return data

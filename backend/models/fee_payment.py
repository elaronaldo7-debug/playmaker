from datetime import datetime
from extensions import db


class FeePayment(db.Model):
    __tablename__ = "fee_payments"
    __table_args__ = (db.Index("ix_fee_payment_date", "payment_date"),)

    id = db.Column(db.Integer, primary_key=True)
    fee_id = db.Column(db.Integer, db.ForeignKey("fees.id"), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_method = db.Column(db.String(20), nullable=False)
    payment_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    recorded_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    fee = db.relationship("Fee", back_populates="payments")
    recorded_by_user = db.relationship("User")

    METHOD_CASH = "CASH"
    METHOD_UPI = "UPI"
    METHOD_BANK_TRANSFER = "BANK_TRANSFER"

    def to_dict(self):
        return {
            "id": self.id,
            "fee_id": self.fee_id,
            "amount": float(self.amount),
            "payment_method": self.payment_method,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "recorded_by": self.recorded_by,
            "recorded_by_username": self.recorded_by_user.username if self.recorded_by_user else None,
        }

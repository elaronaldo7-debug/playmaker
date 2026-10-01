from datetime import datetime

from extensions import db


class MonthlyFeeSetting(db.Model):
    __tablename__ = "monthly_fee_setting"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    fee_amount = db.Column(
        db.Numeric(10, 2),
        nullable=False,
        default=0,
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    def to_dict(self):
        return {
            "id": self.id,
            "fee_amount": float(self.fee_amount),
            "updated_at": (
                self.updated_at.isoformat()
                if self.updated_at
                else None
            ),
        }
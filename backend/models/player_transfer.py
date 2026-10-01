from datetime import datetime

from extensions import db


class PlayerTransfer(db.Model):
    __tablename__ = "player_transfers"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    # ============================================================
    # PLAYER
    # ============================================================

    player_id = db.Column(
        db.Integer,
        db.ForeignKey("players.id"),
        nullable=False,
        index=True
    )

    # ============================================================
    # OLD CATEGORY
    # ============================================================

    from_category_id = db.Column(
        db.Integer,
        db.ForeignKey("categories.id"),
        nullable=False
    )

    # ============================================================
    # NEW CATEGORY
    # ============================================================

    to_category_id = db.Column(
        db.Integer,
        db.ForeignKey("categories.id"),
        nullable=False
    )

    # ============================================================
    # OPTIONAL REASON
    # ============================================================

    reason = db.Column(
        db.String(255),
        nullable=True
    )

    # ============================================================
    # WHO TRANSFERRED
    # ============================================================

    transferred_by = db.Column(
        db.String(120),
        nullable=True
    )

    # ============================================================
    # DATE / TIME
    # ============================================================

    transferred_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    # ============================================================
    # RELATIONSHIPS
    # ============================================================

    player = db.relationship(
        "Player",
        backref=db.backref(
            "transfer_history",
            lazy=True,
            cascade="all, delete-orphan"
        )
    )

    from_category = db.relationship(
        "Category",
        foreign_keys=[from_category_id]
    )

    to_category = db.relationship(
        "Category",
        foreign_keys=[to_category_id]
    )

    # ============================================================
    # TO DICT
    # ============================================================

    def to_dict(self):

        return {
            "id": self.id,

            "player_id": self.player_id,

            "from_category_id": (
                self.from_category_id
            ),

            "from_category_name": (
                self.from_category.name
                if self.from_category
                else None
            ),

            "to_category_id": (
                self.to_category_id
            ),

            "to_category_name": (
                self.to_category.name
                if self.to_category
                else None
            ),

            "reason": self.reason,

            "transferred_by": self.transferred_by,

            "transferred_at": (
                self.transferred_at.isoformat()
                if self.transferred_at
                else None
            ),
        }
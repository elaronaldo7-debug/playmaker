from datetime import datetime

from werkzeug.security import generate_password_hash, check_password_hash

from extensions import db


class User(db.Model):
    __tablename__ = "users"

    # ============================================================
    # PRIMARY KEY
    # ============================================================

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    # ============================================================
    # LOGIN
    # ============================================================

    username = db.Column(
        db.String(80),
        unique=True,
        nullable=False,
        index=True
    )

    password_hash = db.Column(
        db.String(255),
        nullable=False
    )

    # ============================================================
    # ROLE
    #
    # ADMIN  -> Full system access
    # COACH  -> Academy / category access
    # PLAYER -> Own profile + own attendance only
    # ============================================================

    role = db.Column(
        db.String(20),
        nullable=False
    )

    is_active = db.Column(
        db.Boolean,
        default=True,
        nullable=False
    )

    # ============================================================
    # TIMESTAMPS
    # ============================================================

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # ============================================================
    # RELATIONSHIPS
    # ============================================================

    coach = db.relationship(
        "Coach",
        back_populates="user",
        uselist=False
    )

    player = db.relationship(
        "Player",
        back_populates="user",
        uselist=False
    )

    # ============================================================
    # ROLE CONSTANTS
    # ============================================================

    ROLE_ADMIN = "ADMIN"
    ROLE_COACH = "COACH"
    ROLE_PLAYER = "PLAYER"

    # ============================================================
    # PASSWORD
    # ============================================================

    def set_password(self, raw_password: str) -> None:
        self.password_hash = generate_password_hash(
            raw_password
        )

    def check_password(self, raw_password: str) -> bool:
        return check_password_hash(
            self.password_hash,
            raw_password
        )

    # ============================================================
    # SERIALIZATION
    # ============================================================

    def to_dict(self):
        data = {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "is_active": self.is_active,
        }

        # --------------------------------------------------------
        # PLAYER INFORMATION
        #
        # Only expose the player's linked profile identifier.
        # Detailed player data is handled by player routes.
        # --------------------------------------------------------

        if self.role == self.ROLE_PLAYER:
            player = getattr(self, "player", None)

            data["player_id"] = (
                player.id
                if player
                else None
            )

            data["player_code"] = (
                player.player_id
                if player
                else None
            )

        return data
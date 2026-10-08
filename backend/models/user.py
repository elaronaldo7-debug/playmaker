from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)

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

    # ADMIN | COACH | PLAYER
    role = db.Column(
        db.String(20),
        nullable=False
    )

    is_active = db.Column(
        db.Boolean,
        default=True,
        nullable=False
    )

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

    # Existing Coach relationship
    coach = db.relationship(
        "Coach",
        back_populates="user",
        uselist=False
    )

    # Player relationship
    player = db.relationship(
        "Player",
        back_populates="user",
        uselist=False
    )

    ROLE_ADMIN = "ADMIN"
    ROLE_COACH = "COACH"
    ROLE_PLAYER = "PLAYER"

    def set_password(self, raw_password: str) -> None:
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return check_password_hash(
            self.password_hash,
            raw_password
        )

    def to_dict(self):
        data = {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "is_active": self.is_active,
        }

        # Player login என்றால் linked player information
        if self.role == self.ROLE_PLAYER and self.player:
            data["player_id"] = self.player.id

        return data
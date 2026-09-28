from extensions import db


class Coach(db.Model):
    __tablename__ = "coaches"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True)
    coach_name = db.Column(db.String(120), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=True)

    user = db.relationship("User", back_populates="coach")
    category = db.relationship("Category", back_populates="coaches")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "username": self.user.username if self.user else None,
            "coach_name": self.coach_name,
            "category_id": self.category_id,
            "category_name": self.category.name if self.category else None,
            "is_active": self.user.is_active if self.user else None,
        }

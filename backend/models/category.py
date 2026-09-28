from extensions import db


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    coaches = db.relationship("Coach", back_populates="category")
    players = db.relationship("Player", back_populates="category")

    def to_dict(self):
        return {"id": self.id, "name": self.name, "is_active": self.is_active}

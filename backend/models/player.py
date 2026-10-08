from datetime import date

from extensions import db


class Player(db.Model):
    __tablename__ = "players"

    # ============================================================
    # PRIMARY KEY
    # ============================================================

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    # ============================================================
    # PLAYER ID
    # ============================================================

    player_id = db.Column(
        db.String(20),
        unique=True,
        nullable=False,
        index=True
    )

    # ============================================================
    # BASIC INFORMATION
    # ============================================================

    player_name = db.Column(
        db.String(120),
        nullable=False,
        index=True
    )

    profile_photo = db.Column(
        db.String(255),
        nullable=True
    )

    date_of_birth = db.Column(
        db.Date,
        nullable=True
    )

    school = db.Column(
        db.String(120),
        nullable=True
    )

    standard = db.Column(
        db.String(20),
        nullable=True
    )

    phone_1 = db.Column(
        db.String(20),
        nullable=True
    )

    phone_2 = db.Column(
        db.String(20),
        nullable=True
    )

    pickup_person = db.Column(
        db.String(120),
        nullable=True
    )

    health_condition = db.Column(
        db.Text,
        nullable=True
    )

    # ============================================================
    # STATUS
    # ============================================================

    status = db.Column(
        db.String(10),
        default="ACTIVE",
        nullable=False,
        index=True
    )

    # ============================================================
    # CATEGORY
    # ============================================================

    category_id = db.Column(
        db.Integer,
        db.ForeignKey("categories.id"),
        nullable=False,
        index=True
    )

    # ============================================================
    # PLAYER LOGIN ACCOUNT
    #
    # One Player can have one User account.
    #
    # Player.user_id -> users.id
    #
    # Existing migration:
    # 888d98b1af16_add_player_login_account_relationship.py
    # ============================================================

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        unique=True,
        nullable=True,
        index=True
    )

    # ============================================================
    # FIXED MONTHLY FEE
    #
    # None  = Fee not configured yet
    # 0     = Player is FREE
    # 1000  = ₹1000/month
    # ============================================================

    monthly_fee = db.Column(
        db.Numeric(10, 2),
        nullable=True
    )

    # ============================================================
    # RELATIONSHIPS
    # ============================================================

    category = db.relationship(
        "Category",
        back_populates="players"
    )

    user = db.relationship(
        "User",
        back_populates="player",
        foreign_keys=[user_id],
        uselist=False
    )

    attendance_records = db.relationship(
        "Attendance",
        back_populates="player",
        cascade="all, delete-orphan"
    )

    fees = db.relationship(
        "Fee",
        back_populates="player",
        cascade="all, delete-orphan"
    )

    # ============================================================
    # STATUS CONSTANTS
    # ============================================================

    STATUS_ACTIVE = "ACTIVE"
    STATUS_INACTIVE = "INACTIVE"

    # ============================================================
    # AGE
    # ============================================================

    @property
    def age(self):

        if not self.date_of_birth:
            return None

        today = date.today()
        dob = self.date_of_birth

        return (
            today.year
            - dob.year
            - (
                (today.month, today.day)
                < (dob.month, dob.day)
            )
        )

    # ============================================================
    # TO DICT
    # ============================================================

    def to_dict(
        self,
        include_summary=False
    ):

        data = {
            "id": self.id,

            "player_id": self.player_id,

            "player_name": self.player_name,

            "profile_photo": self.profile_photo,

            "date_of_birth": (
                self.date_of_birth.isoformat()
                if self.date_of_birth
                else None
            ),

            "age": self.age,

            "school": self.school,

            "standard": self.standard,

            "phone_1": self.phone_1,

            "phone_2": self.phone_2,

            "pickup_person": self.pickup_person,

            "health_condition": self.health_condition,

            "status": self.status,

            "category_id": self.category_id,

            "category_name": (
                self.category.name
                if self.category
                else None
            ),

            # ====================================================
            # MONTHLY FEE
            # ====================================================

            "monthly_fee": (
                float(self.monthly_fee)
                if self.monthly_fee is not None
                else None
            ),
        }

        # ========================================================
        # ATTENDANCE SUMMARY
        # ========================================================

        if include_summary:

            total = len(
                self.attendance_records
            )

            present = sum(
                1
                for attendance
                in self.attendance_records
                if attendance.status == "PRESENT"
            )

            absent = sum(
                1
                for attendance
                in self.attendance_records
                if attendance.status == "ABSENT"
            )

            attendance_percentage = (
                round(
                    (present / total) * 100,
                    1
                )
                if total
                else 0.0
            )

            data["attendance_summary"] = {
                "total_days": total,

                "present": present,

                "absent": absent,

                "attendance_percentage":
                    attendance_percentage,
            }

        return data
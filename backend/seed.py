"""
Seeds the database with an initial admin account and the default category list.

Usage:
    flask db upgrade
    python seed.py
"""

import os

from app import create_app
from extensions import db
from models.user import User
from models.category import Category


DEFAULT_CATEGORIES = [
    "Coaches",
    "Basic 1",
    "Basic 2",
    "Keeper",
    "U7",
    "U9",
    "U11",
    "U13",
    "U15",
]


app = create_app(os.getenv("FLASK_ENV", "development"))


with app.app_context():

    # ============================================================
    # DEFAULT CATEGORIES
    # ============================================================

    for name in DEFAULT_CATEGORIES:

        existing_category = Category.query.filter_by(
            name=name
        ).first()

        if not existing_category:
            db.session.add(
                Category(name=name)
            )

    db.session.commit()

    print(
        f"Categories ready: "
        f"{[c.name for c in Category.query.all()]}"
    )


    # ============================================================
    # ADMIN ACCOUNT
    # ============================================================

    admin = User.query.filter_by(
        username="admin"
    ).first()


    # ------------------------------------------------------------
    # ADMIN DOES NOT EXIST
    # ------------------------------------------------------------

    if admin is None:

        admin = User(
            username="admin",
            role=User.ROLE_ADMIN,
            is_active=True
        )

        admin.set_password("Admin@123")

        db.session.add(admin)

        db.session.commit()

        print()
        print("========================================")
        print(" ADMIN ACCOUNT CREATED")
        print("========================================")
        print(" Username : admin")
        print(" Password : Admin@123")
        print(" Role     : ADMIN")
        print(" Status   : ACTIVE")
        print("========================================")


    # ------------------------------------------------------------
    # ADMIN ALREADY EXISTS
    # RESET PASSWORD
    # ------------------------------------------------------------

    else:

        admin.set_password("Admin@123")

        admin.role = User.ROLE_ADMIN

        admin.is_active = True

        db.session.commit()

        print()
        print("========================================")
        print(" ADMIN ACCOUNT RESET")
        print("========================================")
        print(" Username : admin")
        print(" Password : Admin@123")
        print(" Role     : ADMIN")
        print(" Status   : ACTIVE")
        print("========================================")


    print()
    print("Seed complete.")
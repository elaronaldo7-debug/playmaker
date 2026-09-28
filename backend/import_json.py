import json
import hashlib
from datetime import datetime

from app import create_app
from extensions import db

from models.player import Player
from models.category import Category
from models.attendance import Attendance


# ---------------------------------------------------------
# SETTINGS
# ---------------------------------------------------------

JSON_FILE = "attendance_data.json"

CATEGORY_MAP = {
    "BASIC 1": "Basic 1",
    "BASIC 2": "Basic 2",
    "KEEPER": "Keeper",
    "U7": "U7",
    "U9": "U9",
    "U11": "U11",
    "U13": "U13",
    "U15": "U15",
}


# ---------------------------------------------------------
# HELPERS
# ---------------------------------------------------------

def clean_text(value):
    if value is None:
        return None

    value = str(value).strip()

    if not value:
        return None

    return value


def parse_dob(value):
    if not value:
        return None

    value = str(value).strip()

    if not value:
        return None

    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        print(f"WARNING: Invalid DOB: {value}")
        return None


def make_player_id(category_name, player_name):
    """
    Creates a short, stable unique player ID.
    Example:
    PM-A1B2C3D4E5
    """

    raw = f"{category_name.strip().upper()}::{player_name.strip().upper()}"

    digest = hashlib.sha1(
        raw.encode("utf-8")
    ).hexdigest()[:10].upper()

    return f"PM-{digest}"


def split_school_standard(value):
    """
    JSON sometimes stores school + standard together.

    Example:
    ACHARYA THENGATHITU / 2 STD

    Result:
    school   = ACHARYA THENGATHITU
    standard = 2 STD
    """

    value = clean_text(value)

    if not value:
        return None, None

    if "/" in value:
        parts = value.rsplit("/", 1)

        school = parts[0].strip()
        standard = parts[1].strip()

        return (
            school or None,
            standard or None
        )

    return value, None


# ---------------------------------------------------------
# LOAD JSON
# ---------------------------------------------------------

print()
print("=" * 60)
print("PLAYMAKER FC - JSON IMPORT")
print("=" * 60)
print()

print(f"Loading: {JSON_FILE}")

with open(
    JSON_FILE,
    "r",
    encoding="utf-8"
) as file:
    json_data = json.load(file)


attendance_data = json_data.get(
    "attendance_data",
    {}
)

players_data = attendance_data.get(
    "players",
    {}
)

profiles_data = attendance_data.get(
    "profiles",
    {}
)

attendance_history = attendance_data.get(
    "att",
    {}
)


print(
    f"Player categories found : {len(players_data)}"
)

print(
    f"Profile records found   : {len(profiles_data)}"
)

print(
    f"Attendance dates found  : {len(attendance_history)}"
)

print()


# ---------------------------------------------------------
# CREATE FLASK APP
# ---------------------------------------------------------

app = create_app("development")


with app.app_context():

    # -----------------------------------------------------
    # LOAD CATEGORIES
    # -----------------------------------------------------

    categories = {}

    for json_category, db_category_name in CATEGORY_MAP.items():

        category = Category.query.filter_by(
            name=db_category_name
        ).first()

        if not category:
            print(
                f"ERROR: Category not found in DB: "
                f"{db_category_name}"
            )
            continue

        categories[json_category] = category


    # -----------------------------------------------------
    # IMPORT PLAYERS
    # -----------------------------------------------------

    print("=" * 60)
    print("IMPORTING PLAYERS")
    print("=" * 60)

    imported_players = {}

    created_count = 0
    updated_count = 0

    for json_category, player_names in players_data.items():

        # Coaches are not player records.
        if json_category == "COACHES":
            print(
                "Skipping COACHES category"
            )
            continue

        category = categories.get(
            json_category
        )

        if not category:
            print(
                f"WARNING: Category skipped: "
                f"{json_category}"
            )
            continue


        for player_name in player_names:

            player_name = clean_text(
                player_name
            )

            if not player_name:
                continue


            # ---------------------------------------------
            # Profile key
            # ---------------------------------------------

            profile_key = (
                f"{json_category}::{player_name}"
            )

            profile = profiles_data.get(
                profile_key,
                {}
            )

            if not isinstance(profile, dict):
                profile = {}


            # ---------------------------------------------
            # Profile data
            # ---------------------------------------------

            dob = parse_dob(
                profile.get("dob")
            )

            school, standard = split_school_standard(
                profile.get("school")
            )

            phone_1 = clean_text(
                profile.get("phone1")
            )

            phone_2 = clean_text(
                profile.get("phone2")
            )

            pickup_person = clean_text(
                profile.get("pickup")
            )

            health_condition = clean_text(
                profile.get("health")
            )


            # ---------------------------------------------
            # Find existing player
            # ---------------------------------------------

            player = Player.query.filter_by(
                player_name=player_name,
                category_id=category.id
            ).first()


            # ---------------------------------------------
            # CREATE
            # ---------------------------------------------

            if not player:

                player = Player(
                    player_id=make_player_id(
                        json_category,
                        player_name
                    ),

                    player_name=player_name,

                    profile_photo=None,

                    date_of_birth=dob,

                    school=school,

                    standard=standard,

                    phone_1=phone_1,

                    phone_2=phone_2,

                    pickup_person=pickup_person,

                    health_condition=health_condition,

                    status=Player.STATUS_ACTIVE,

                    category_id=category.id,
                )

                db.session.add(player)

                created_count += 1

            # ---------------------------------------------
            # UPDATE
            # ---------------------------------------------

            else:

                if dob is not None:
                    player.date_of_birth = dob

                if school is not None:
                    player.school = school

                if standard is not None:
                    player.standard = standard

                if phone_1 is not None:
                    player.phone_1 = phone_1

                if phone_2 is not None:
                    player.phone_2 = phone_2

                if pickup_person is not None:
                    player.pickup_person = pickup_person

                if health_condition is not None:
                    player.health_condition = health_condition

                player.status = Player.STATUS_ACTIVE

                updated_count += 1


            imported_players[
                profile_key
            ] = player


    # Save players first so they receive DB IDs.
    db.session.flush()


    print()
    print(
        f"Players created : {created_count}"
    )

    print(
        f"Players updated : {updated_count}"
    )

    print(
        f"Players total   : {len(imported_players)}"
    )

    print()


    # -----------------------------------------------------
    # IMPORT ATTENDANCE
    # -----------------------------------------------------

    print("=" * 60)
    print("IMPORTING ATTENDANCE")
    print("=" * 60)

    attendance_created = 0
    attendance_updated = 0

    for date_string, categories_data in attendance_history.items():

        try:
            attendance_date = datetime.strptime(
                date_string,
                "%Y-%m-%d"
            ).date()

        except ValueError:
            print(
                f"WARNING: Invalid attendance date: "
                f"{date_string}"
            )
            continue


        if not isinstance(categories_data, dict):
            continue


        for json_category, player_records in categories_data.items():

            if json_category == "COACHES":
                continue

            if not isinstance(player_records, dict):
                continue


            for player_name, is_present in player_records.items():

                player_name = clean_text(
                    player_name
                )

                if not player_name:
                    continue


                profile_key = (
                    f"{json_category}::{player_name}"
                )

                player = imported_players.get(
                    profile_key
                )


                # Safety fallback:
                # search database if player wasn't
                # found in imported_players.
                if not player:

                    category = categories.get(
                        json_category
                    )

                    if not category:
                        continue

                    player = Player.query.filter_by(
                        player_name=player_name,
                        category_id=category.id
                    ).first()


                if not player:
                    print(
                        f"WARNING: Player not found "
                        f"for attendance: "
                        f"{json_category} / "
                        f"{player_name}"
                    )
                    continue


                # -----------------------------------------
                # Convert boolean to attendance status
                # -----------------------------------------

                status = (
                    "PRESENT"
                    if bool(is_present)
                    else "ABSENT"
                )


                # -----------------------------------------
                # Find existing attendance
                # -----------------------------------------

                record = Attendance.query.filter_by(
                    player_id=player.id,
                    date=attendance_date
                ).first()


                if record:

                    record.status = status

                    attendance_updated += 1

                else:

                    record = Attendance(
                        player_id=player.id,
                        date=attendance_date,
                        status=status,
                        marked_by=None,
                    )

                    db.session.add(record)

                    attendance_created += 1


    # -----------------------------------------------------
    # COMMIT EVERYTHING
    # -----------------------------------------------------

    print()
    print("=" * 60)
    print("SAVING DATABASE")
    print("=" * 60)

    db.session.commit()


    # -----------------------------------------------------
    # FINAL SUMMARY
    # -----------------------------------------------------

    print()
    print("=" * 60)
    print("IMPORT COMPLETED SUCCESSFULLY")
    print("=" * 60)

    print()
    print(
        f"Players created       : {created_count}"
    )

    print(
        f"Players updated       : {updated_count}"
    )

    print(
        f"Attendance created    : {attendance_created}"
    )

    print(
        f"Attendance updated    : {attendance_updated}"
    )

    print(
        f"Attendance dates      : "
        f"{len(attendance_history)}"
    )

    print()
    print("=" * 60)
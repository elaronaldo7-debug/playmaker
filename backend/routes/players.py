import os
import uuid

from flask import Blueprint, jsonify, request
from werkzeug.utils import secure_filename

from extensions import db
from models.player import Player
from models.category import Category

from utils.auth import (
    require_auth,
    require_admin,
    require_coach_or_admin,
)

from utils.permissions import (
    category_permission_check,
    PermissionError,
)


players_bp = Blueprint(
    "players",
    __name__,
)


# =========================================================
# PLAYER PHOTO UPLOAD CONFIG
# =========================================================

UPLOAD_FOLDER = os.path.join(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    ),
    "uploads",
    "players",
)

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True,
)


ALLOWED_PHOTO_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png",
    "webp",
}


# =========================================================
# HELPER - PHOTO EXTENSION
# =========================================================

def allowed_photo(filename):

    if not filename:
        return False

    if "." not in filename:
        return False

    extension = filename.rsplit(
        ".",
        1
    )[1].lower()

    return extension in ALLOWED_PHOTO_EXTENSIONS


# =========================================================
# GET ALL PLAYERS
# =========================================================

@players_bp.route(
    "",
    methods=["GET"]
)
@require_auth
def list_players():

    query = Player.query

    search = request.args.get(
        "search",
        ""
    ).strip()

    if search:

        like = f"%{search}%"

        query = query.filter(
            db.or_(
                Player.player_name.ilike(
                    like
                ),
                Player.player_id.ilike(
                    like
                ),
            )
        )

    # =====================================================
    # CATEGORY FILTER
    # =====================================================

    category_id = request.args.get(
        "category_id",
        type=int,
    )

    if category_id:

        query = query.filter_by(
            category_id=category_id
        )

    # =====================================================
    # STATUS FILTER
    # =====================================================

    status = request.args.get(
        "status"
    )

    if status:

        status = status.upper().strip()

        if status not in {
            Player.STATUS_ACTIVE,
            Player.STATUS_INACTIVE,
        }:

            return jsonify(
                {
                    "message":
                        "Invalid player status"
                }
            ), 400

        query = query.filter_by(
            status=status
        )

    # =====================================================
    # PAGINATION
    # =====================================================

    page = request.args.get(
        "page",
        default=1,
        type=int,
    )

    per_page = min(
        request.args.get(
            "per_page",
            default=50,
            type=int,
        ),
        200,
    )

    query = query.order_by(
        Player.player_name
    )

    paginated = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False,
    )

    return jsonify(
        {
            "players": [
                player.to_dict()
                for player in paginated.items
            ],
            "total": paginated.total,
            "page": page,
            "per_page": per_page,
            "pages": paginated.pages,
        }
    )


# =========================================================
# GET SINGLE PLAYER
# =========================================================

@players_bp.route(
    "/<int:player_id>",
    methods=["GET"]
)
@require_auth
def get_player(player_id):

    player = Player.query.get_or_404(
        player_id
    )

    data = player.to_dict(
        include_summary=True
    )

    # =====================================================
    # FEES
    # =====================================================

    fees_sorted = sorted(
        player.fees,
        key=lambda fee: fee.month,
        reverse=True,
    )

    data["fees"] = [
        fee.to_dict()
        for fee in fees_sorted
    ]

    return jsonify(
        data
    )


# =========================================================
# UPDATE PLAYER DETAILS
# =========================================================

@players_bp.route(
    "/<int:player_id>",
    methods=["PUT"]
)
@require_admin
def update_player(player_id):

    player = Player.query.get_or_404(
        player_id
    )

    data = request.get_json(
        silent=True
    ) or {}

    # =====================================================
    # PLAYER NAME
    # =====================================================

    player_name = str(
        data.get(
            "player_name",
            ""
        )
    ).strip()

    if not player_name:

        return jsonify(
            {
                "message":
                    "Player name is required"
            }
        ), 400

    # =====================================================
    # STATUS
    # =====================================================

    status = str(
        data.get(
            "status",
            player.status
        )
    ).upper().strip()

    if status not in {
        Player.STATUS_ACTIVE,
        Player.STATUS_INACTIVE,
    }:

        return jsonify(
            {
                "message":
                    "Invalid player status"
            }
        ), 400

    # =====================================================
    # UPDATE
    # =====================================================

    player.player_name = player_name

    player.date_of_birth = (
        data.get("date_of_birth")
    )

    player.school = (
        data.get("school")
    )

    player.standard = (
        data.get("standard")
    )

    player.phone_1 = (
        data.get("phone_1")
    )

    player.phone_2 = (
        data.get("phone_2")
    )

    player.pickup_person = (
        data.get("pickup_person")
    )

    player.health_condition = (
        data.get("health_condition")
    )

    player.status = status

    db.session.commit()

    return jsonify(
        player.to_dict()
    ), 200


# =========================================================
# CREATE PLAYER
# =========================================================

@players_bp.route(
    "",
    methods=["POST"]
)
@require_admin
def create_player():

    data = request.get_json(
        silent=True
    ) or {}

    player_name = str(
        data.get(
            "player_name",
            ""
        )
    ).strip()

    player_id = str(
        data.get(
            "player_id",
            ""
        )
    ).strip()

    category_id = data.get(
        "category_id"
    )

    # =====================================================
    # VALIDATE NAME
    # =====================================================

    if not player_name:

        return jsonify(
            {
                "message":
                    "Player name is required"
            }
        ), 400

    # =====================================================
    # VALIDATE PLAYER ID
    # =====================================================

    if not player_id:

        return jsonify(
            {
                "message":
                    "Player ID is required"
            }
        ), 400

    # =====================================================
    # CATEGORY ID
    # =====================================================

    try:

        category_id = int(
            category_id
        )

    except (
        TypeError,
        ValueError
    ):

        return jsonify(
            {
                "message":
                    "Valid category_id is required"
            }
        ), 400

    # =====================================================
    # CATEGORY
    # =====================================================

    category = Category.query.get(
        category_id
    )

    if not category:

        return jsonify(
            {
                "message":
                    "Category not found"
            }
        ), 404

    # =====================================================
    # DUPLICATE PLAYER ID
    # =====================================================

    existing_player = (
        Player.query
        .filter_by(
            player_id=player_id
        )
        .first()
    )

    if existing_player:

        return jsonify(
            {
                "message":
                    "Player ID already exists"
            }
        ), 409

    # =====================================================
    # CREATE PLAYER
    # =====================================================

    player = Player(
        player_id=player_id,
        player_name=player_name,
        category_id=category_id,
        profile_photo=data.get(
            "profile_photo"
        ),
        date_of_birth=data.get(
            "date_of_birth"
        ),
        school=data.get(
            "school"
        ),
        standard=data.get(
            "standard"
        ),
        phone_1=data.get(
            "phone_1"
        ),
        phone_2=data.get(
            "phone_2"
        ),
        pickup_person=data.get(
            "pickup_person"
        ),
        health_condition=data.get(
            "health_condition"
        ),
        status=data.get(
            "status",
            Player.STATUS_ACTIVE
        ),
    )

    db.session.add(
        player
    )

    db.session.commit()

    return jsonify(
        player.to_dict()
    ), 201


# =========================================================
# QUICK ADD PLAYER
# =========================================================

@players_bp.route(
    "/quick-add",
    methods=["POST"]
)
@require_coach_or_admin
def quick_add_player():

    data = request.get_json(
        silent=True
    ) or {}

    player_name = str(
        data.get(
            "player_name",
            ""
        )
    ).strip()

    category_id = data.get(
        "category_id"
    )

    # =====================================================
    # NAME
    # =====================================================

    if not player_name:

        return jsonify(
            {
                "message":
                    "Player name is required"
            }
        ), 400

    # =====================================================
    # CATEGORY
    # =====================================================

    try:

        category_id = int(
            category_id
        )

    except (
        TypeError,
        ValueError
    ):

        return jsonify(
            {
                "message":
                    "Valid category_id is required"
            }
        ), 400

    category = Category.query.get(
        category_id
    )

    if not category:

        return jsonify(
            {
                "message":
                    "Category not found"
            }
        ), 404

    # =====================================================
    # PERMISSION
    # =====================================================

    try:

        category_permission_check(
            category_id,
            action="write"
        )

    except PermissionError as e:

        return jsonify(
            {
                "message": e.message
            }
        ), e.status_code

    # =====================================================
    # GENERATE PLAYER ID
    # =====================================================

    def generate_player_id():

        return (
            "PM-"
            + uuid.uuid4().hex[:8].upper()
        )

    player_id = (
        generate_player_id()
    )

    while Player.query.filter_by(
        player_id=player_id
    ).first():

        player_id = (
            generate_player_id()
        )

    # =====================================================
    # CREATE
    # =====================================================

    player = Player(
        player_id=player_id,
        player_name=player_name,
        category_id=category_id,
        status=Player.STATUS_ACTIVE,
    )

    db.session.add(
        player
    )

    db.session.commit()

    return jsonify(
        player.to_dict()
    ), 201


# =========================================================
# UPLOAD / UPDATE PLAYER PROFILE PHOTO
# =========================================================
#
# POST /api/players/<player_id>/photo
#
# FormData:
#
# photo = image file
#
# =========================================================

@players_bp.route(
    "/<int:player_id>/photo",
    methods=["POST"]
)
@require_admin
def upload_player_photo(player_id):

    # =====================================================
    # FIND PLAYER
    # =====================================================

    player = Player.query.get_or_404(
        player_id
    )

    # =====================================================
    # CHECK FILE
    # =====================================================

    if "photo" not in request.files:

        return jsonify(
            {
                "message":
                    "No photo file provided"
            }
        ), 400

    file = request.files["photo"]

    if file is None:

        return jsonify(
            {
                "message":
                    "Invalid photo file"
            }
        ), 400

    if not file.filename:

        return jsonify(
            {
                "message":
                    "Photo filename is required"
            }
        ), 400

    # =====================================================
    # CHECK EXTENSION
    # =====================================================

    if not allowed_photo(
        file.filename
    ):

        return jsonify(
            {
                "message":
                    (
                        "Invalid photo format. "
                        "Allowed formats: "
                        "jpg, jpeg, png, webp"
                    )
            }
        ), 400

    # =====================================================
    # SECURE ORIGINAL NAME
    # =====================================================

    original_filename = (
        secure_filename(
            file.filename
        )
    )

    if not original_filename:

        return jsonify(
            {
                "message":
                    "Invalid photo filename"
            }
        ), 400

    # =====================================================
    # GET EXTENSION
    # =====================================================

    extension = os.path.splitext(
        original_filename
    )[1].lower()

    # =====================================================
    # GENERATE UNIQUE FILE NAME
    # =====================================================

    filename = (
        f"player_{player.id}_"
        f"{uuid.uuid4().hex}"
        f"{extension}"
    )

    file_path = os.path.join(
        UPLOAD_FOLDER,
        filename
    )

    # =====================================================
    # DELETE OLD PHOTO
    # =====================================================

    old_photo = (
        player.profile_photo
    )

    if old_photo:

        old_filename = os.path.basename(
            old_photo
        )

        old_file_path = os.path.join(
            UPLOAD_FOLDER,
            old_filename
        )

        try:

            if os.path.isfile(
                old_file_path
            ):

                os.remove(
                    old_file_path
                )

        except OSError:

            # Old file deletion should
            # not stop new upload.
            pass

    # =====================================================
    # SAVE NEW FILE
    # =====================================================

    try:

        file.save(
            file_path
        )

    except Exception as e:

        return jsonify(
            {
                "message":
                    "Could not save profile photo",
                "error":
                    str(e),
            }
        ), 500

    # =====================================================
    # SAVE PATH TO DATABASE
    # =====================================================

    player.profile_photo = (
        f"/uploads/players/{filename}"
    )

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        # Remove newly uploaded file
        try:

            if os.path.isfile(
                file_path
            ):

                os.remove(
                    file_path
                )

        except OSError:

            pass

        return jsonify(
            {
                "message":
                    "Could not update player photo",
                "error":
                    str(e),
            }
        ), 500

    # =====================================================
    # RESPONSE
    # =====================================================

    return jsonify(
        {
            "success": True,
            "message":
                "Profile photo updated successfully.",
            "player":
                player.to_dict(),
        }
    ), 200


# =========================================================
# ACTIVATE / DEACTIVATE PLAYER
# =========================================================

@players_bp.route(
    "/<int:player_id>/status",
    methods=["PATCH"]
)
@require_admin
def update_player_status(player_id):

    player = Player.query.get_or_404(
        player_id
    )

    data = request.get_json(
        silent=True
    ) or {}

    status = str(
        data.get(
            "status",
            ""
        )
    ).upper().strip()

    # =====================================================
    # VALIDATE
    # =====================================================

    if status not in {
        Player.STATUS_ACTIVE,
        Player.STATUS_INACTIVE,
    }:

        return jsonify(
            {
                "message":
                    "Invalid player status"
            }
        ), 400

    # =====================================================
    # NO CHANGE
    # =====================================================

    if player.status == status:

        return jsonify(
            {
                "success": True,
                "message":
                    (
                        "Player is already "
                        f"{status.lower()}"
                    ),
                "player":
                    player.to_dict(),
            }
        ), 200

    # =====================================================
    # UPDATE
    # =====================================================

    player.status = status

    db.session.commit()

    if status == Player.STATUS_ACTIVE:

        message = (
            "Player activated successfully"
        )

    else:

        message = (
            "Player moved to inactive players"
        )

    return jsonify(
        {
            "success": True,
            "message": message,
            "player":
                player.to_dict(),
        }
    ), 200


# =========================================================
# PERMANENT DELETE PLAYER
# =========================================================

@players_bp.route(
    "/<int:player_id>",
    methods=["DELETE"]
)
@require_admin
def delete_player_permanently(
    player_id
):

    player = Player.query.get_or_404(
        player_id
    )

    # =====================================================
    # ONLY INACTIVE
    # =====================================================

    if (
        player.status
        != Player.STATUS_INACTIVE
    ):

        return jsonify(
            {
                "message":
                    (
                        "Only inactive players "
                        "can be permanently deleted"
                    )
            }
        ), 400

    # =====================================================
    # DELETE
    # =====================================================

    db.session.delete(
        player
    )

    db.session.commit()

    return jsonify(
        {
            "success": True,
            "message":
                "Player permanently deleted",
        }
    ), 200
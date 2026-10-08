import os
import uuid
from decimal import Decimal, InvalidOperation

import cloudinary
import cloudinary.uploader

from flask import Blueprint, jsonify, request
from werkzeug.utils import secure_filename

from extensions import db
from models.player import Player
from models.category import Category
from models.player_transfer import PlayerTransfer

from utils.auth import (
    require_auth,
    require_admin,
    require_coach_or_admin,
    require_player,
    get_current_player,
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
# CLOUDINARY CONFIG
# =========================================================

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
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
# HELPER - MONTHLY FEE
# =========================================================

# None  = fee not configured
# 0     = FREE
# 500   = ₹500/month
# 1000  = ₹1000/month

# =========================================================

def parse_monthly_fee(value):
    """
    Convert monthly fee input into Decimal.

    Returns:
        Decimal value
        None when no fee was supplied

    Raises:
        ValueError for invalid/negative fee
    """

    if value is None:
        return None

    # Empty string means no value supplied
    if isinstance(value, str):
        value = value.strip()

        if value == "":
            return None

    try:
        amount = Decimal(
            str(value)
        ).quantize(
            Decimal("0.01")
        )

    except (
        InvalidOperation,
        TypeError,
        ValueError,
    ):
        raise ValueError(
            "Invalid monthly_fee"
        )

    if amount < Decimal("0.00"):
        raise ValueError(
            "Monthly fee cannot be negative"
        )

    return amount


# =========================================================
# GET CURRENT PLAYER PROFILE
# =========================================================
#
# GET /api/players/me
#
# PLAYER ONLY.
#
# IMPORTANT:
# The player ID is NEVER taken from the request.
#
# It is resolved from:
#
# JWT -> User -> Player
#
# Therefore a PLAYER cannot change a player ID
# to access another player's profile.
#
# =========================================================

@players_bp.route(
    "/me",
    methods=["GET"]
)
@require_player
def get_my_player_profile():

    player = get_current_player()

    if not player:
        return jsonify({
            "error": "Player profile is not linked to this account"
        }), 403

    data = player.to_dict(
        include_summary=False
    )

    return jsonify(data), 200


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
# TRANSFER PLAYER
# =========================================================
#
# POST /api/players/<player_id>/transfer
#
# Admin only.
#
# Body:
#
# {
#     "to_category_id": 5,
#     "reason": "Moved to higher category"
# }
#
# =========================================================

@players_bp.route(
    "/<int:player_id>/transfer",
    methods=["POST"]
)
@require_admin
def transfer_player(player_id):

    # =====================================================
    # FIND PLAYER
    # =====================================================

    player = Player.query.get_or_404(
        player_id
    )

    # =====================================================
    # REQUEST DATA
    # =====================================================

    data = request.get_json(
        silent=True
    ) or {}

    # =====================================================
    # TARGET CATEGORY
    # =====================================================

    to_category_id = data.get(
        "to_category_id"
    )

    try:

        to_category_id = int(
            to_category_id
        )

    except (
        TypeError,
        ValueError
    ):

        return jsonify(
            {
                "message":
                    "Valid target category is required"
            }
        ), 400

    # =====================================================
    # FIND TARGET CATEGORY
    # =====================================================

    to_category = Category.query.get(
        to_category_id
    )

    if not to_category:

        return jsonify(
            {
                "message":
                    "Target category not found"
            }
        ), 404

    # =====================================================
    # CHECK ACTIVE CATEGORY
    # =====================================================

    if not to_category.is_active:

        return jsonify(
            {
                "message":
                    "Target category is inactive"
            }
        ), 400

    # =====================================================
    # CHECK SAME CATEGORY
    # =====================================================

    if player.category_id == to_category.id:

        return jsonify(
            {
                "message":
                    "Player is already in this category"
            }
        ), 400

    # =====================================================
    # OLD CATEGORY
    # =====================================================

    from_category_id = player.category_id

    from_category = Category.query.get(
        from_category_id
    )

    if not from_category:

        return jsonify(
            {
                "message":
                    "Current player category not found"
            }
        ), 500

    # =====================================================
    # REASON
    # =====================================================

    reason = data.get(
        "reason"
    )

    if reason is not None:

        reason = str(
            reason
        ).strip()

        if reason == "":
            reason = None

        if reason and len(reason) > 255:

            return jsonify(
                {
                    "message":
                        "Transfer reason is too long"
                }
            ), 400

    # =====================================================
    # TRANSFERRED BY
    # =====================================================

    transferred_by = None

    try:

        from flask_jwt_extended import get_jwt_identity

        identity = get_jwt_identity()

        if identity is not None:

            transferred_by = str(
                identity
            )

    except Exception:

        transferred_by = None

    # =====================================================
    # CREATE TRANSFER HISTORY
    # =====================================================

    transfer = PlayerTransfer(
        player_id=player.id,

        from_category_id=(
            from_category.id
        ),

        to_category_id=(
            to_category.id
        ),

        reason=reason,

        transferred_by=transferred_by,
    )

    # =====================================================
    # UPDATE PLAYER CATEGORY
    # =====================================================

    player.category_id = (
        to_category.id
    )

    db.session.add(
        transfer
    )

    # =====================================================
    # SAVE
    # =====================================================

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        return jsonify(
            {
                "message":
                    "Could not transfer player",
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

            "message": (
                f"Player transferred from "
                f"{from_category.name} "
                f"to "
                f"{to_category.name}"
            ),

            "player": (
                player.to_dict()
            ),

            "transfer": (
                transfer.to_dict()
            ),
        }
    ), 200


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
    # MONTHLY FEE
    # =====================================================

    try:

        monthly_fee = parse_monthly_fee(
            data.get(
                "monthly_fee",
                player.monthly_fee
            )
        )

    except ValueError as e:

        return jsonify(
            {
                "message": str(e)
            }
        ), 400

    # =====================================================
    # UPDATE PLAYER
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

    # =====================================================
    # SAVE CURRENT MONTHLY FEE
    # =====================================================

    player.monthly_fee = monthly_fee

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        return jsonify(
            {
                "message":
                    "Could not update player",
                "error":
                    str(e),
            }
        ), 500

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
    # MONTHLY FEE
    # =====================================================

    try:

        monthly_fee = parse_monthly_fee(
            data.get(
                "monthly_fee"
            )
        )

    except ValueError as e:

        return jsonify(
            {
                "message": str(e)
            }
        ), 400

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

        monthly_fee=monthly_fee,
    )

    db.session.add(
        player
    )

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        return jsonify(
            {
                "message":
                    "Could not create player",
                "error":
                    str(e),
            }
        ), 500

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
        monthly_fee=None,
    )

    db.session.add(
        player
    )

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        return jsonify(
            {
                "message":
                    "Could not create player",
                "error":
                    str(e),
            }
        ), 500

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
    # KEEP OLD PHOTO VALUE
    # =====================================================

    old_photo = (
        player.profile_photo
    )

    # =====================================================
    # UPLOAD TO CLOUDINARY
    # =====================================================

    try:

        upload_result = (
            cloudinary.uploader.upload(
                file.stream,
                folder="playmaker_fc/players",
                public_id=(
                    f"player_{player.id}_"
                    f"{uuid.uuid4().hex}"
                ),
                resource_type="image",
                overwrite=False,
            )
        )

    except Exception as e:

        return jsonify(
            {
                "message":
                    "Could not upload profile photo",
                "error":
                    str(e),
            }
        ), 500

    # =====================================================
    # GET CLOUDINARY URL
    # =====================================================

    cloudinary_url = (
        upload_result.get(
            "secure_url"
        )
    )

    if not cloudinary_url:

        return jsonify(
            {
                "message":
                    (
                        "Cloudinary did not "
                        "return an image URL"
                    )
            }
        ), 500

    # =====================================================
    # SAVE URL TO DATABASE
    # =====================================================

    player.profile_photo = (
        cloudinary_url
    )

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        # Remove newly uploaded Cloudinary image
        # if database update fails.

        try:

            public_id = (
                upload_result.get(
                    "public_id"
                )
            )

            if public_id:

                cloudinary.uploader.destroy(
                    public_id,
                    resource_type="image"
                )

        except Exception:

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
    # DELETE OLD LOCAL PHOTO
    # =====================================================

    if old_photo and not (
        old_photo.startswith("http://")
        or old_photo.startswith("https://")
    ):

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

            pass

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

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        return jsonify(
            {
                "message":
                    "Could not update player status",
                "error":
                    str(e),
            }
        ), 500

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

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        return jsonify(
            {
                "message":
                    "Could not delete player",
                "error":
                    str(e),
            }
        ), 500

    return jsonify(
        {
            "success": True,
            "message":
                "Player permanently deleted",
        }
    ), 200
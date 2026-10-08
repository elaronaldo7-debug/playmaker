from flask_jwt_extended import create_access_token

from models.user import User
from models.coach import Coach


# ============================================================
# AUTHENTICATE USER
# ============================================================

def authenticate(
    username: str,
    password: str
):
    """
    Verify username/password.

    Returns:
        (user, access_token)

    Failure:
        (None, None)

    Supported roles:
        ADMIN
        COACH
        PLAYER
    """

    # ========================================================
    # FIND USER
    # ========================================================

    user = (
        User.query
        .filter_by(
            username=username
        )
        .first()
    )

    # ========================================================
    # PASSWORD CHECK
    # ========================================================

    password_match = (
        user.check_password(password)
        if user
        else False
    )

    print(
        "PASSWORD MATCH:",
        password_match
    )

    print(
        "=================="
    )

    # ========================================================
    # ACCOUNT CHECK
    # ========================================================

    if not user:
        return None, None

    if not user.is_active:
        return None, None

    # ========================================================
    # PASSWORD CHECK
    # ========================================================

    if not password_match:
        return None, None

    # ========================================================
    # ROLE CHECK
    # ========================================================

    if user.role not in (
        User.ROLE_ADMIN,
        User.ROLE_COACH,
        User.ROLE_PLAYER,
    ):
        return None, None

    # ========================================================
    # PLAYER ACCOUNT VALIDATION
    # ========================================================
    #
    # A PLAYER account MUST have a linked Player profile.
    #
    # This prevents a PLAYER user from logging in without
    # an actual Player record.
    #
    # ========================================================

    if user.role == User.ROLE_PLAYER:

        player = getattr(
            user,
            "player",
            None
        )

        if not player:
            return None, None

        # ----------------------------------------------------
        # Inactive Player cannot login
        # ----------------------------------------------------

        if player.status != player.STATUS_ACTIVE:
            return None, None

    # ========================================================
    # JWT CLAIMS
    # ========================================================

    additional_claims = {
        "role": user.role
    }

    # ========================================================
    # CREATE ACCESS TOKEN
    # ========================================================

    token = create_access_token(
        identity=str(
            user.id
        ),
        additional_claims=additional_claims,
    )

    return user, token


# ============================================================
# GET USER CONTEXT
# ============================================================

def get_user_context(
    user: User
):
    """
    Build the /api/auth/me response.

    ADMIN:
        User information only.

    COACH:
        User information + Coach information.

    PLAYER:
        User information + linked Player information.

    IMPORTANT:
        PLAYER responses must NEVER expose fee information.
    """

    # ========================================================
    # BASIC USER DATA
    # ========================================================

    data = user.to_dict()

    # ========================================================
    # COACH
    # ========================================================

    if user.role == User.ROLE_COACH:

        coach = (
            Coach.query
            .filter_by(
                user_id=user.id
            )
            .first()
        )

        data["coach"] = (
            coach.to_dict()
            if coach
            else None
        )

    # ========================================================
    # PLAYER
    # ========================================================

    elif user.role == User.ROLE_PLAYER:

        player = getattr(
            user,
            "player",
            None
        )

        # ----------------------------------------------------
        # Player profile
        # ----------------------------------------------------
        #
        # Player.to_dict() currently contains monthly_fee.
        #
        # PLAYER users must NEVER receive fee information.
        #
        # Therefore remove monthly_fee before returning the
        # player profile.
        #
        # ----------------------------------------------------

        if player:

            player_data = player.to_dict(
                include_summary=False
            )

            # ------------------------------------------------
            # SECURITY:
            # Never expose fee information to PLAYER.
            # ------------------------------------------------

            player_data.pop(
                "monthly_fee",
                None
            )

        else:

            player_data = None

        data["player"] = player_data

        # ----------------------------------------------------
        # Internal Player database ID
        # ----------------------------------------------------

        data["player_id"] = (
            player.id
            if player
            else None
        )

        # ----------------------------------------------------
        # Player public/player code
        # ----------------------------------------------------

        data["player_code"] = (
            player.player_id
            if player
            else None
        )

        # ----------------------------------------------------
        # Safety indicator
        # ----------------------------------------------------

        data["has_player_profile"] = (
            player is not None
        )

    # ========================================================
    # RETURN
    # ========================================================

    return data
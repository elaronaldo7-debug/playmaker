from flask_jwt_extended import create_access_token

from models.user import User
from models.coach import Coach


def authenticate(username: str, password: str):
    """
    Verifies credentials and returns (user, access_token) on success.
    Returns (None, None) on failure.
    """

    user = User.query.filter_by(username=username).first()

    password_match = user.check_password(password) if user else False

    print("PASSWORD MATCH:", password_match)
    print("==================")

    if not user or not user.is_active:
        return None, None

    if not password_match:
        return None, None

    additional_claims = {
        "role": user.role
    }

    token = create_access_token(
        identity=str(user.id),
        additional_claims=additional_claims
    )

    return user, token


def get_user_context(user: User):
    """
    Builds the /api/auth/me payload.

    ADMIN:
        Returns normal user information.

    COACH:
        Returns user information + coach details.

    PLAYER:
        Returns user information + linked player ID/details.
    """

    data = user.to_dict()

    # -----------------------------
    # COACH
    # -----------------------------
    if user.role == User.ROLE_COACH:
        coach = Coach.query.filter_by(user_id=user.id).first()

        data["coach"] = (
            coach.to_dict()
            if coach
            else None
        )

    # -----------------------------
    # PLAYER
    # -----------------------------
    elif user.role == User.ROLE_PLAYER:
        player = getattr(user, "player", None)

        data["player"] = (
            player.to_dict()
            if player
            else None
        )

        data["player_id"] = (
            player.id
            if player
            else None
        )

    return data
from flask_jwt_extended import create_access_token
from models.user import User
from models.coach import Coach


def authenticate(username: str, password: str):
    """
    Verifies credentials and returns (user, access_token) on success.
    Returns (None, None) on failure.
    """

    user = User.query.filter_by(username=username).first()

    # TEMPORARY DEBUG — does NOT print the password
    print("=== AUTH DEBUG ===")
    print("USERNAME:", username)
    print("USER EXISTS:", user is not None)
    print("USER ACTIVE:", user.is_active if user else None)

    password_match = user.check_password(password) if user else False
    print("PASSWORD MATCH:", password_match)
    print("==================")

    if not user or not user.is_active:
        return None, None

    if not password_match:
        return None, None

    additional_claims = {"role": user.role}

    token = create_access_token(
        identity=str(user.id),
        additional_claims=additional_claims
    )

    return user, token


def get_user_context(user: User):
    """Builds the /api/auth/me payload, including coach category assignment if relevant."""

    data = user.to_dict()

    if user.role == User.ROLE_COACH:
        coach = Coach.query.filter_by(user_id=user.id).first()
        data["coach"] = coach.to_dict() if coach else None

    return data
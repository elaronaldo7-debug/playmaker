"""
Playmaker FC — Flask backend entrypoint.

Run with:
    python app.py

This single file wires up the app factory, registers all blueprints, and
wraps every /api/* JSON response in the project's standard envelope:

    Success -> { "success": true,  "data": <original payload> }
    Error   -> { "success": false, "message": <error text> }

Route handlers are unchanged from their original, simple return style
(jsonify(...), status) — the envelope is applied centrally here via
after_request.
"""

import os
import json

from flask import Flask, jsonify, request, send_from_directory

from config import config_by_name
from extensions import db, migrate, jwt, cors


def create_app(env_name="development"):
    app = Flask(__name__)
    app.config.from_object(config_by_name[env_name])

    # ------------------------------------------------------------------
    # Player photo upload folder
    # ------------------------------------------------------------------

    app.config["PLAYER_UPLOAD_FOLDER"] = os.path.join(
        app.root_path,
        "uploads",
        "players"
    )

    os.makedirs(
        app.config["PLAYER_UPLOAD_FOLDER"],
        exist_ok=True
    )

    # ------------------------------------------------------------------
    # Init extensions
    # ------------------------------------------------------------------

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    cors.init_app(
        app,
        resources={
            r"/api/*": {
                "origins": app.config["CORS_ORIGINS"]
            }
        }
    )

    # ------------------------------------------------------------------
    # Import models so Alembic/Flask-Migrate can see them
    # ------------------------------------------------------------------

    from models import (
        user,
        coach,
        category,
        player,
        attendance,
        fee,
        fee_payment,
    )  # noqa: F401

    # ------------------------------------------------------------------
    # Register blueprints
    # ------------------------------------------------------------------

    from routes.auth import auth_bp
    from routes.players import players_bp
    from routes.coaches import coaches_bp
    from routes.categories import categories_bp
    from routes.attendance import attendance_bp
    from routes.fees import fees_bp
    from routes.reports import reports_bp
    from routes.dashboard import dashboard_bp
    from routes.birthdays import birthdays_bp
    from routes.backup import backup_bp
    app.register_blueprint(
        auth_bp,
        url_prefix="/api/auth"
    )

    app.register_blueprint(
        players_bp,
        url_prefix="/api/players"
    )

    app.register_blueprint(
        coaches_bp,
        url_prefix="/api/coaches"
    )

    app.register_blueprint(
        categories_bp,
        url_prefix="/api/categories"
    )

    app.register_blueprint(
        attendance_bp,
        url_prefix="/api/attendance"
    )

    app.register_blueprint(
        fees_bp,
        url_prefix="/api"
    )

    app.register_blueprint(
        reports_bp,
        url_prefix="/api/reports"
    )

    app.register_blueprint(
        dashboard_bp,
        url_prefix="/api/dashboard"
    )

    app.register_blueprint(
        birthdays_bp,
        url_prefix="/api/birthdays"
    )

    app.register_blueprint(
    backup_bp,
    url_prefix="/api/backup"
)

    # ------------------------------------------------------------------
    # Player uploaded photos
    #
    # Example:
    # http://localhost:5000/uploads/players/player_123.jpg
    # ------------------------------------------------------------------

    @app.route("/uploads/players/<path:filename>")
    def player_photo(filename):
        return send_from_directory(
            app.config["PLAYER_UPLOAD_FOLDER"],
            filename
        )

    # ------------------------------------------------------------------
    # JWT error handlers
    # ------------------------------------------------------------------

    @jwt.unauthorized_loader
    def missing_token(reason):
        return jsonify({
            "error": "Authorization token is required",
            "detail": reason
        }), 401

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return jsonify({
            "error": "Invalid token",
            "detail": reason
        }), 401

    @jwt.expired_token_loader
    def expired_token(jwt_header, jwt_payload):
        return jsonify({
            "error": "Token has expired"
        }), 401

    # ------------------------------------------------------------------
    # Generic error handlers
    # ------------------------------------------------------------------

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({
            "error": "Resource not found"
        }), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({
            "error": "Internal server error"
        }), 500

    # ------------------------------------------------------------------
    # Health check
    # ------------------------------------------------------------------

    @app.route("/api/health")
    def health():
        return jsonify({
            "status": "ok",
            "service": "Playmaker FC API"
        })

    # ------------------------------------------------------------------
    # Standard response envelope
    #
    # Every /api/* JSON response becomes:
    #
    # Success:
    # {
    #     "success": true,
    #     "data": ...
    # }
    #
    # Error:
    # {
    #     "success": false,
    #     "message": "..."
    # }
    # ------------------------------------------------------------------

    @app.after_request
    def apply_response_envelope(response):

        # Only API responses
        if not request.path.startswith("/api/"):
            return response

        # Only JSON responses
        if not response.is_json:
            return response

        try:
            body = response.get_json()
        except Exception:
            return response

        # Already enveloped
        if (
            isinstance(body, dict)
            and "success" in body
        ):
            return response

        # Error response
        if (
            response.status_code >= 400
            and isinstance(body, dict)
            and "error" in body
        ):
            message = body.get("error")

            extra = {
                key: value
                for key, value in body.items()
                if key != "error"
            }

            new_body = {
                "success": False,
                "message": message,
                **extra
            }

        # Success response
        else:
            new_body = {
                "success": True,
                "data": body
            }

        response.set_data(
            json.dumps(new_body)
        )

        return response

    return app


# ----------------------------------------------------------------------
# Create application
# ----------------------------------------------------------------------

app = create_app(
    os.getenv(
        "FLASK_ENV",
        "development"
    )
)


# ----------------------------------------------------------------------
# Flask shell context
# ----------------------------------------------------------------------

@app.shell_context_processor
def make_shell_context():
    return {
        "db": db
    }


# ----------------------------------------------------------------------
# Run server
# ----------------------------------------------------------------------

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=(
            os.getenv("FLASK_ENV") == "development"
        )
    )
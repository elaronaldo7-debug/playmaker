from flask import Blueprint, request, jsonify

from extensions import db
from models.category import Category
from utils.auth import require_auth, require_admin

categories_bp = Blueprint("categories", __name__)


@categories_bp.route("", methods=["GET"])
@require_auth
def list_categories():
    active_only = request.args.get("active_only", "false").lower() == "true"
    query = Category.query
    if active_only:
        query = query.filter_by(is_active=True)
    categories = query.order_by(Category.name).all()
    return jsonify([c.to_dict() for c in categories])


@categories_bp.route("/<int:category_id>", methods=["GET"])
@require_auth
def get_category(category_id):
    category = Category.query.get_or_404(category_id)
    return jsonify(category.to_dict())


@categories_bp.route("", methods=["POST"])
@require_admin
def create_category():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Category name is required"}), 400
    if Category.query.filter_by(name=name).first():
        return jsonify({"error": "Category already exists"}), 409

    category = Category(name=name)
    db.session.add(category)
    db.session.commit()
    return jsonify(category.to_dict()), 201


@categories_bp.route("/<int:category_id>", methods=["PUT"])
@require_admin
def update_category(category_id):
    category = Category.query.get_or_404(category_id)
    payload = request.get_json(silent=True) or {}

    if "name" in payload:
        new_name = (payload.get("name") or "").strip()
        if not new_name:
            return jsonify({"error": "Category name cannot be empty"}), 400
        category.name = new_name
    if "is_active" in payload:
        category.is_active = bool(payload.get("is_active"))

    db.session.commit()
    return jsonify(category.to_dict())


@categories_bp.route("/<int:category_id>", methods=["DELETE"])
@require_admin
def delete_category(category_id):
    category = Category.query.get_or_404(category_id)
    # Soft delete to preserve historical player/attendance/fee records.
    category.is_active = False
    db.session.commit()
    return jsonify({"message": "Category deactivated"})

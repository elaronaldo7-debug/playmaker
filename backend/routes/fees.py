from decimal import Decimal, InvalidOperation

from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity

from extensions import db

from models.fee import Fee
from models.fee_payment import FeePayment
from models.player import Player

from utils.auth import (
    require_admin,
    require_coach_or_admin,
)

from utils.permissions import (
    category_permission_check,
    can_view_fee_category,
    PermissionError,
)

from services.fee_service import (
    get_or_create_fee,
    record_payment,
    edit_payment,
    delete_payment,
)


fees_bp = Blueprint("fees", __name__)


# ============================================================
# VALID PAYMENT METHODS
# ============================================================

VALID_METHODS = {
    FeePayment.METHOD_CASH,
    FeePayment.METHOD_UPI,
    FeePayment.METHOD_BANK_TRANSFER,
}


# ============================================================
# DECIMAL HELPER
# ============================================================

def _to_decimal(value):
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None


# ============================================================
# FEES - LIST
# ============================================================

@fees_bp.route("/fees", methods=["GET"])
@require_coach_or_admin
def list_fees():

    category_id = request.args.get("category_id")
    month = request.args.get("month")
    status = request.args.get("status")

    # --------------------------------------------------------
    # CATEGORY ID
    # --------------------------------------------------------

    if category_id:
        try:
            category_id = int(category_id)
        except ValueError:
            return jsonify({
                "error": "category_id must be an integer"
            }), 400

    # --------------------------------------------------------
    # CATEGORY PERMISSION
    # --------------------------------------------------------

    if category_id:

        try:
            can_view_fee_category(category_id)

        except PermissionError as e:
            return jsonify({
                "error": e.message
            }), e.status_code

        query = (
            Fee.query
            .join(Player)
            .filter(
                Player.category_id == category_id
            )
        )

    else:

        from utils.auth import get_current_user
        from models.user import User

        user = get_current_user()

        if user.role != User.ROLE_ADMIN:
            return jsonify({
                "error": (
                    "category_id is required "
                    "for coach fee access"
                )
            }), 403

        query = Fee.query

    # --------------------------------------------------------
    # MONTH
    # --------------------------------------------------------

    if month:
        query = query.filter(
            Fee.month == month
        )

    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    if status:
        query = query.filter(
            Fee.status == status.upper()
        )

    # --------------------------------------------------------
    # AUTO-CREATE MISSING MONTHLY FEES
    # --------------------------------------------------------
    #
    # When a category/month is opened:
    #
    # 1. Existing Fee row -> leave it unchanged.
    # 2. Player.monthly_fee exists -> use it.
    # 3. Player.monthly_fee is NULL -> fee_service checks
    #    the latest previous Fee and carries it forward.
    # 4. If no current/previous fee exists -> leave player
    #    without a Fee row so UI can show SET FEE.
    #
    # Historical Fee records are never changed here.
    # --------------------------------------------------------

    if category_id and month:

        players = (
            Player.query
            .filter(
                Player.category_id == category_id,
                Player.status == Player.STATUS_ACTIVE,
            )
            .all()
        )

        created_count = 0

        for player in players:

            existing_fee = Fee.query.filter_by(
                player_id=player.id,
                month=month,
            ).first()

            if existing_fee is not None:
                continue

            try:
                get_or_create_fee(
                    player_id=player.id,
                    month=month,
                )

                created_count += 1

            except ValueError:
                # No current/previous fee exists.
                # Leave the player without a fee row.
                continue

        if created_count:
            db.session.commit()

    # --------------------------------------------------------
    # FETCH
    # --------------------------------------------------------

    fees = (
        query
        .order_by(
            Fee.month.desc()
        )
        .all()
    )

    return jsonify([
        fee.to_dict()
        for fee in fees
    ])


# ============================================================
# SINGLE FEE - GET
# ============================================================

@fees_bp.route("/fees/<int:fee_id>", methods=["GET"])
@require_coach_or_admin
def get_fee(fee_id):

    fee = Fee.query.get_or_404(
        fee_id
    )

    try:
        can_view_fee_category(
            fee.player.category_id
        )

    except PermissionError as e:
        return jsonify({
            "error": e.message
        }), e.status_code

    return jsonify(
        fee.to_dict(
            include_payments=True
        )
    )


# ============================================================
# CREATE / SET FEE
# ============================================================

@fees_bp.route("/fees", methods=["POST"])
@require_admin
def create_fee():

    payload = (
        request.get_json(
            silent=True
        )
        or {}
    )

    player_id = payload.get(
        "player_id"
    )

    month = payload.get(
        "month"
    )

    fee_amount = _to_decimal(
        payload.get(
            "fee_amount"
        )
    )

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    if (
        not player_id
        or not month
        or fee_amount is None
    ):
        return jsonify({
            "error": (
                "player_id, month and "
                "fee_amount are required"
            )
        }), 400

    if fee_amount < Decimal("0"):
        return jsonify({
            "error": (
                "fee_amount cannot "
                "be negative"
            )
        }), 400

    fee_amount = fee_amount.quantize(
        Decimal("0.01")
    )

    # --------------------------------------------------------
    # PLAYER
    # --------------------------------------------------------

    player = Player.query.get_or_404(
        player_id
    )

    # --------------------------------------------------------
    # PERMISSION
    # --------------------------------------------------------

    try:
        category_permission_check(
            player.category_id,
            action="write"
        )

    except PermissionError as e:
        return jsonify({
            "error": e.message
        }), e.status_code

    # ========================================================
    # IMPORTANT:
    # SAVE PLAYER'S CURRENT / DEFAULT MONTHLY FEE
    # ========================================================
    #
    # This is the permanent value used for future months.
    #
    # Example:
    #
    # October  -> admin sets ₹1000
    # player.monthly_fee = ₹1000
    #
    # November -> automatically ₹1000
    # December -> automatically ₹1000
    #
    # If admin later changes it to ₹1200:
    #
    # Old Fee rows remain unchanged.
    # Future months use ₹1200.
    # ========================================================

    player.monthly_fee = fee_amount

    # --------------------------------------------------------
    # CREATE / UPDATE CURRENT MONTH FEE
    # --------------------------------------------------------

    fee = get_or_create_fee(
        player_id,
        month,
        fee_amount
    )

    # --------------------------------------------------------
    # SAVE BOTH PLAYER SETTING + CURRENT MONTH FEE
    # --------------------------------------------------------

    db.session.commit()

    return jsonify(
        fee.to_dict(
            include_payments=True
        )
    ), 201


# ============================================================
# UPDATE FEE
# ============================================================

@fees_bp.route(
    "/fees/<int:fee_id>",
    methods=["PUT"]
)
@require_admin
def update_fee(fee_id):

    fee = Fee.query.get_or_404(
        fee_id
    )

    # --------------------------------------------------------
    # PERMISSION
    # --------------------------------------------------------

    try:
        category_permission_check(
            fee.player.category_id,
            action="write"
        )

    except PermissionError as e:
        return jsonify({
            "error": e.message
        }), e.status_code

    payload = (
        request.get_json(
            silent=True
        )
        or {}
    )

    fee_amount = _to_decimal(
        payload.get(
            "fee_amount"
        )
    )

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    if fee_amount is None:
        return jsonify({
            "error": "fee_amount is required"
        }), 400

    if fee_amount < Decimal("0"):
        return jsonify({
            "error": (
                "fee_amount cannot "
                "be negative"
            )
        }), 400

    fee_amount = fee_amount.quantize(
        Decimal("0.01")
    )

    # ========================================================
    # SAVE NEW CURRENT MONTHLY FEE
    # ========================================================
    #
    # This changes the player's default fee for FUTURE months.
    #
    # Existing historical Fee rows are not automatically
    # modified.
    # ========================================================

    fee.player.monthly_fee = fee_amount

    # ========================================================
    # FREE
    # ========================================================

    if fee_amount == Decimal("0.00"):

        fee.fee_amount = Decimal("0.00")
        fee.paid_amount = Decimal("0.00")
        fee.balance = Decimal("0.00")

        # Existing model has no FREE status.
        fee.status = Fee.STATUS_PAID

    # ========================================================
    # NORMAL FEE
    # ========================================================

    else:

        fee.fee_amount = fee_amount

        fee.recalculate()

    db.session.commit()

    return jsonify(
        fee.to_dict(
            include_payments=True
        )
    )


# ============================================================
# COLLECT PAYMENT
# ============================================================

@fees_bp.route(
    "/fees/<int:fee_id>/payments",
    methods=["POST"]
)
@require_admin
def create_payment(fee_id):

    fee = Fee.query.get_or_404(
        fee_id
    )

    # --------------------------------------------------------
    # PERMISSION
    # --------------------------------------------------------

    try:
        category_permission_check(
            fee.player.category_id,
            action="write"
        )

    except PermissionError as e:
        return jsonify({
            "error": e.message
        }), e.status_code

    # --------------------------------------------------------
    # FREE PLAYER
    # --------------------------------------------------------

    if fee.fee_amount == Decimal("0.00"):

        return jsonify({
            "error": (
                "Cannot collect payment "
                "for a FREE player"
            )
        }), 400

    # --------------------------------------------------------
    # PAYLOAD
    # --------------------------------------------------------

    payload = (
        request.get_json(
            silent=True
        )
        or {}
    )

    amount = _to_decimal(
        payload.get(
            "amount"
        )
    )

    payment_method = payload.get(
        "payment_method"
    )

    # --------------------------------------------------------
    # AMOUNT VALIDATION
    # --------------------------------------------------------

    if amount is None:
        return jsonify({
            "error": "amount is required"
        }), 400

    amount = amount.quantize(
        Decimal("0.01")
    )

    if amount <= Decimal("0.00"):
        return jsonify({
            "error": (
                "Payment amount must "
                "be greater than zero"
            )
        }), 400

    # --------------------------------------------------------
    # PAYMENT METHOD
    # --------------------------------------------------------

    if not payment_method:
        return jsonify({
            "error": (
                "payment_method is required"
            )
        }), 400

    payment_method = str(
        payment_method
    ).upper()

    if payment_method not in VALID_METHODS:
        return jsonify({
            "error": (
                "Invalid payment method. "
                "Use CASH, UPI or BANK_TRANSFER"
            )
        }), 400

    # --------------------------------------------------------
    # BALANCE CHECK
    # --------------------------------------------------------

    if amount > fee.balance:
        return jsonify({
            "error": (
                "Payment amount cannot "
                "be greater than balance"
            )
        }), 400

    # --------------------------------------------------------
    # CURRENT USER
    # --------------------------------------------------------

    recorded_by = get_jwt_identity()

    try:
        recorded_by = int(
            recorded_by
        )

    except (
        TypeError,
        ValueError
    ):
        recorded_by = None

    # --------------------------------------------------------
    # RECORD PAYMENT
    # --------------------------------------------------------

    try:
        payment = record_payment(
            fee=fee,
            amount=amount,
            payment_method=payment_method,
            recorded_by=recorded_by,
        )

    except ValueError as e:
        return jsonify({
            "error": str(e)
        }), 400

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return jsonify({
        "success": True,
        "message": "Payment collected successfully",
        "payment": payment.to_dict(),
        "fee": fee.to_dict(
            include_payments=True
        ),
    }), 201


# ============================================================
# PAYMENT - GET
# ============================================================

@fees_bp.route(
    "/fees/<int:fee_id>/payments",
    methods=["GET"]
)
@require_coach_or_admin
def list_payments(fee_id):

    fee = Fee.query.get_or_404(
        fee_id
    )

    # --------------------------------------------------------
    # VIEW PERMISSION
    # --------------------------------------------------------

    try:
        can_view_fee_category(
            fee.player.category_id
        )

    except PermissionError as e:
        return jsonify({
            "error": e.message
        }), e.status_code

    return jsonify([
        payment.to_dict()
        for payment in fee.payments
    ])


# ============================================================
# EDIT PAYMENT
# ============================================================

@fees_bp.route(
    "/payments/<int:payment_id>",
    methods=["PUT"]
)
@require_admin
def update_payment(payment_id):

    payment = FeePayment.query.get_or_404(
        payment_id
    )

    fee = payment.fee

    # --------------------------------------------------------
    # PERMISSION
    # --------------------------------------------------------

    try:
        category_permission_check(
            fee.player.category_id,
            action="write"
        )

    except PermissionError as e:
        return jsonify({
            "error": e.message
        }), e.status_code

    payload = (
        request.get_json(
            silent=True
        )
        or {}
    )

    amount = None

    if "amount" in payload:

        amount = _to_decimal(
            payload.get(
                "amount"
            )
        )

        if amount is None:
            return jsonify({
                "error": "Invalid amount"
            }), 400

        amount = amount.quantize(
            Decimal("0.01")
        )

    payment_method = payload.get(
        "payment_method"
    )

    # --------------------------------------------------------
    # PAYMENT METHOD
    # --------------------------------------------------------

    if payment_method is not None:

        payment_method = str(
            payment_method
        ).upper()

        if payment_method not in VALID_METHODS:
            return jsonify({
                "error": (
                    "Invalid payment method"
                )
            }), 400

    # --------------------------------------------------------
    # UPDATE
    # --------------------------------------------------------

    try:
        payment = edit_payment(
            payment=payment,
            amount=amount,
            payment_method=payment_method,
        )

    except ValueError as e:
        return jsonify({
            "error": str(e)
        }), 400

    return jsonify({
        "success": True,
        "message": "Payment updated successfully",
        "payment": payment.to_dict(),
        "fee": fee.to_dict(
            include_payments=True
        ),
    })


# ============================================================
# DELETE PAYMENT
# ============================================================

@fees_bp.route(
    "/payments/<int:payment_id>",
    methods=["DELETE"]
)
@require_admin
def remove_payment(payment_id):

    payment = FeePayment.query.get_or_404(
        payment_id
    )

    fee = payment.fee

    # --------------------------------------------------------
    # PERMISSION
    # --------------------------------------------------------

    try:
        category_permission_check(
            fee.player.category_id,
            action="write"
        )

    except PermissionError as e:
        return jsonify({
            "error": e.message
        }), e.status_code

    # --------------------------------------------------------
    # DELETE
    # --------------------------------------------------------

    delete_payment(
        payment
    )

    return jsonify({
        "success": True,
        "message": "Payment deleted successfully"
    })


# ============================================================
# MONTHLY COLLECTION TOTAL
# ============================================================

@fees_bp.route(
    "/fees/collection-total",
    methods=["GET"]
)
@require_coach_or_admin
def collection_total():

    from services.fee_service import (
        monthly_collection_total
    )

    month = request.args.get(
        "month"
    )

    category_id = request.args.get(
        "category_id"
    )

    if not month:
        return jsonify({
            "error": "month is required"
        }), 400

    # --------------------------------------------------------
    # CATEGORY
    # --------------------------------------------------------

    if category_id:

        try:
            category_id = int(
                category_id
            )

        except ValueError:
            return jsonify({
                "error": (
                    "category_id must "
                    "be an integer"
                )
            }), 400

        try:
            can_view_fee_category(
                category_id
            )

        except PermissionError as e:
            return jsonify({
                "error": e.message
            }), e.status_code

    # --------------------------------------------------------
    # TOTAL
    # --------------------------------------------------------

    total = monthly_collection_total(
        month=month,
        category_id=category_id,
    )

    return jsonify({
        "month": month,
        "category_id": category_id,
        "total": float(total),
    })
from decimal import Decimal

from extensions import db
from models.fee import Fee
from models.fee_payment import FeePayment


def get_or_create_fee(
    player_id: int,
    month: str,
    fee_amount: Decimal
) -> Fee:
    """
    Fetch the monthly fee for a player.

    If the fee does not exist:
        Create it.

    If the fee already exists:
        Update the fee amount.

    IMPORTANT:
        fee_amount = 0 means FREE.
        Zero is a valid fee amount.
    """

    fee = Fee.query.filter_by(
        player_id=player_id,
        month=month
    ).first()

    # ========================================================
    # CREATE NEW FEE
    # ========================================================

    if fee is None:

        fee_amount = Decimal(fee_amount).quantize(
            Decimal("0.01")
        )

        fee = Fee(
            player_id=player_id,
            month=month,
            fee_amount=fee_amount,
            paid_amount=Decimal("0.00"),
            balance=fee_amount,
            status=(
                Fee.STATUS_PAID
                if fee_amount == Decimal("0.00")
                else Fee.STATUS_PENDING
            ),
        )

        db.session.add(fee)
        db.session.flush()

        return fee

    # ========================================================
    # UPDATE EXISTING FEE
    # ========================================================

    fee_amount = Decimal(fee_amount).quantize(
        Decimal("0.01")
    )

    fee.fee_amount = fee_amount

    # ========================================================
    # FREE PLAYER
    # ========================================================

    if fee_amount == Decimal("0.00"):

        fee.paid_amount = Decimal("0.00")
        fee.balance = Decimal("0.00")
        fee.status = Fee.STATUS_PAID

    # ========================================================
    # NORMAL FEE
    # ========================================================

    else:

        fee.recalculate()

    db.session.flush()

    return fee


# ============================================================
# RECORD PAYMENT
# ============================================================

def record_payment(
    fee: Fee,
    amount: Decimal,
    payment_method: str,
    recorded_by: int
) -> FeePayment:
    """
    Records a new payment against a fee.

    Supports:
        Full payment
        Partial payment
        Multiple payments
    """

    # --------------------------------------------------------
    # FREE FEE
    # --------------------------------------------------------

    if fee.fee_amount == Decimal("0.00"):
        raise ValueError(
            "Cannot collect payment for a FREE fee"
        )

    # --------------------------------------------------------
    # Validate amount
    # --------------------------------------------------------

    amount = Decimal(amount).quantize(
        Decimal("0.01")
    )

    if amount <= Decimal("0.00"):
        raise ValueError(
            "Payment amount must be greater than zero"
        )

    # --------------------------------------------------------
    # Do not allow payment greater than balance
    # --------------------------------------------------------

    if amount > fee.balance:
        raise ValueError(
            "Payment amount cannot be greater than balance"
        )

    # --------------------------------------------------------
    # Create payment
    # --------------------------------------------------------

    payment = FeePayment(
        fee_id=fee.id,
        amount=amount,
        payment_method=payment_method,
        recorded_by=recorded_by,
    )

    db.session.add(payment)
    db.session.flush()

    # --------------------------------------------------------
    # Recalculate fee
    # --------------------------------------------------------

    fee.recalculate()

    db.session.commit()

    return payment


# ============================================================
# EDIT PAYMENT
# ============================================================

def edit_payment(
    payment: FeePayment,
    amount: Decimal = None,
    payment_method: str = None
) -> FeePayment:
    """
    Edits an existing payment and recalculates
    the parent fee.
    """

    fee = payment.fee

    # --------------------------------------------------------
    # Update amount
    # --------------------------------------------------------

    if amount is not None:

        amount = Decimal(amount).quantize(
            Decimal("0.01")
        )

        if amount <= Decimal("0.00"):
            raise ValueError(
                "Payment amount must be greater than zero"
            )

        # Calculate balance excluding current payment
        other_paid = sum(
            (
                p.amount
                for p in fee.payments
                if p.id != payment.id
            ),
            Decimal("0.00")
        )

        if other_paid + amount > fee.fee_amount:
            raise ValueError(
                "Payment amount cannot be greater than balance"
            )

        payment.amount = amount

    # --------------------------------------------------------
    # Update payment method
    # --------------------------------------------------------

    if payment_method is not None:
        payment.payment_method = payment_method

    db.session.flush()

    # --------------------------------------------------------
    # Recalculate
    # --------------------------------------------------------

    fee.recalculate()

    db.session.commit()

    return payment


# ============================================================
# DELETE PAYMENT
# ============================================================

def delete_payment(
    payment: FeePayment
) -> None:
    """
    Deletes a payment and recalculates
    the parent fee.
    """

    fee = payment.fee

    db.session.delete(payment)
    db.session.flush()

    fee.recalculate()

    db.session.commit()


# ============================================================
# MONTHLY COLLECTION TOTAL
# ============================================================

def monthly_collection_total(
    month: str,
    category_id: int = None
) -> Decimal:
    """
    Returns the total payments collected
    for a particular month.

    Optionally filters by category.
    """

    from models.player import Player

    query = (
        db.session.query(
            db.func.coalesce(
                db.func.sum(FeePayment.amount),
                0
            )
        )
        .join(
            Fee,
            FeePayment.fee_id == Fee.id
        )
        .filter(
            Fee.month == month
        )
    )

    if category_id is not None:

        query = (
            query
            .join(
                Player,
                Fee.player_id == Player.id
            )
            .filter(
                Player.category_id == category_id
            )
        )

    return query.scalar() or Decimal("0.00")
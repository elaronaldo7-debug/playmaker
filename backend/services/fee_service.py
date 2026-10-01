from decimal import Decimal

from extensions import db
from models.fee import Fee
from models.fee_payment import FeePayment
from models.player import Player


def _effective_fee_amount(player, month):
    """
    Determine the amount to use when a monthly Fee row does not exist.

    Priority:
    1. Player.monthly_fee, if the deployed model has it and it is set.
    2. The latest existing Fee for this player from a month before `month`.

    This means changing a player's current fee does not rewrite old months,
    while future months inherit the latest configured amount automatically.
    """
    current_amount = getattr(player, "monthly_fee", None)

    if current_amount is not None:
        return Decimal(str(current_amount)).quantize(Decimal("0.01"))

    previous_fee = (
        Fee.query
        .filter(
            Fee.player_id == player.id,
            Fee.month < month,
        )
        .order_by(Fee.month.desc())
        .first()
    )

    if previous_fee is not None:
        return Decimal(str(previous_fee.fee_amount)).quantize(Decimal("0.01"))

    return None


def get_or_create_fee(player_id: int, month: str, fee_amount=None) -> Fee:
    """
    Get or create the fee row for one player/month.

    If `fee_amount` is supplied, it is an explicit admin set/edit for this
    exact month. Existing historical rows are not touched by month navigation.

    If `fee_amount` is None, the function automatically carries forward the
    player's current/latest previous monthly fee.
    """
    fee = Fee.query.filter_by(
        player_id=player_id,
        month=month,
    ).first()

    if fee is not None:
        # Explicit fee amount means the admin intentionally edited this
        # particular month. Do not change it during normal month navigation.
        if fee_amount is not None:
            amount = Decimal(str(fee_amount)).quantize(Decimal("0.01"))
            fee.fee_amount = amount

            if amount == Decimal("0.00"):
                fee.paid_amount = Decimal("0.00")
                fee.balance = Decimal("0.00")
                fee.status = Fee.STATUS_PAID
            else:
                fee.recalculate()

        return fee

    player = Player.query.get(player_id)

    if player is None:
        raise ValueError("Player not found")

    if fee_amount is None:
        amount = _effective_fee_amount(player, month)

        if amount is None:
            raise ValueError(
                "Monthly fee is not configured for this player and no previous fee exists"
            )
    else:
        amount = Decimal(str(fee_amount)).quantize(Decimal("0.01"))

    if amount < Decimal("0.00"):
        raise ValueError("Monthly fee cannot be negative")

    fee = Fee(
        player_id=player_id,
        month=month,
        fee_amount=amount,
        paid_amount=Decimal("0.00"),
        balance=amount,
        status=(
            Fee.STATUS_PAID
            if amount == Decimal("0.00")
            else Fee.STATUS_PENDING
        ),
    )

    db.session.add(fee)
    db.session.flush()

    return fee


def record_payment(
    fee: Fee,
    amount: Decimal,
    payment_method: str,
    recorded_by: int,
) -> FeePayment:
    """Record a payment and recalculate the parent monthly fee."""
    payment = FeePayment(
        fee_id=fee.id,
        amount=amount,
        payment_method=payment_method,
        recorded_by=recorded_by,
    )

    db.session.add(payment)
    db.session.flush()

    fee.recalculate()
    db.session.commit()

    return payment


def edit_payment(
    payment: FeePayment,
    amount: Decimal = None,
    payment_method: str = None,
) -> FeePayment:
    """Edit an existing payment and recalculate the parent fee."""
    if amount is not None:
        payment.amount = amount

    if payment_method is not None:
        payment.payment_method = payment_method

    db.session.flush()

    payment.fee.recalculate()
    db.session.commit()

    return payment


def delete_payment(payment: FeePayment) -> None:
    """Delete a payment and recalculate the parent fee."""
    fee = payment.fee

    db.session.delete(payment)
    db.session.flush()

    fee.recalculate()
    db.session.commit()


def monthly_collection_total(
    month: str,
    category_id: int = None,
) -> Decimal:
    """Return total payments for a month, optionally limited to a category."""
    query = (
        db.session.query(
            db.func.coalesce(
                db.func.sum(FeePayment.amount),
                0,
            )
        )
        .join(
            Fee,
            FeePayment.fee_id == Fee.id,
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
                Fee.player_id == Player.id,
            )
            .filter(
                Player.category_id == category_id
            )
        )

    return query.scalar() or Decimal("0")

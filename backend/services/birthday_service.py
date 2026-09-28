from datetime import date, timedelta
from models.player import Player


def _birthday_this_year(dob: date, today: date) -> date:
    """Returns the player's birthday date in `today`'s year, handling Feb 29 safely."""
    try:
        return dob.replace(year=today.year)
    except ValueError:
        # Feb 29 on a non-leap year -> celebrate Feb 28
        return dob.replace(year=today.year, month=2, day=28)


def get_active_birthday_reminders(today: date = None):
    """
    Returns a list of active birthday reminders.

    A reminder is active for exactly a 48-hour window:
      - the day before the birthday ("Tomorrow")
      - the birthday itself ("Today" / Happy Birthday)

    It automatically disappears the day after the birthday.
    """
    if today is None:
        today = date.today()

    tomorrow = today + timedelta(days=1)

    reminders = []
    players = Player.query.filter_by(status=Player.STATUS_ACTIVE).all()

    for player in players:
        if not player.date_of_birth:
            continue
        bday_this_year = _birthday_this_year(player.date_of_birth, today)

        if bday_this_year == today:
            reminders.append(
                {
                    "player_id": player.id,
                    "player_name": player.player_name,
                    "category_name": player.category.name if player.category else None,
                    "is_today": True,
                    "message": f"Happy Birthday {player.player_name}!",
                }
            )
        elif bday_this_year == tomorrow:
            reminders.append(
                {
                    "player_id": player.id,
                    "player_name": player.player_name,
                    "category_name": player.category.name if player.category else None,
                    "is_today": False,
                    "message": f"{player.player_name}'s birthday is tomorrow",
                }
            )

    return reminders

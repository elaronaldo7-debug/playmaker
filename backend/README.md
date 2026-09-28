# Playmaker FC — Backend (Flask REST API)

Flat structure, single entrypoint (`app.py`), PostgreSQL + SQLAlchemy + JWT.

```
backend/
├── app.py              # Flask app factory + entrypoint (run with: python app.py)
├── config.py
├── extensions.py
├── requirements.txt
├── .env.example
├── seed.py             # creates default categories + admin/Admin@123
├── models/
│   ├── user.py  coach.py  category.py  player.py
│   └── attendance.py  fee.py  fee_payment.py
├── routes/
│   ├── auth.py  players.py  coaches.py  categories.py
│   ├── attendance.py  fees.py  dashboard.py  reports.py  birthdays.py
├── services/
│   ├── auth_service.py  attendance_service.py
│   ├── fee_service.py   report_service.py   birthday_service.py
├── utils/
│   ├── auth.py          # require_auth / require_admin / require_coach_or_admin
│   └── permissions.py   # category_permission_check / can_view_fee_category
└── tests/
    └── test_permissions.py
```

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env: set SECRET_KEY, JWT_SECRET_KEY, DATABASE_URL

# Create the database in Postgres first:
#   createdb playmaker_fc
# or, from psql:
#   CREATE DATABASE playmaker_fc;

export FLASK_APP=app.py
flask db init          # first time only
flask db migrate -m "initial schema"
flask db upgrade

python seed.py          # creates default categories + admin/Admin@123
python app.py            # runs on http://0.0.0.0:5000
```

## Default login (created by seed.py)
```
username: admin
password: Admin@123
```
**Change this password immediately after first login.**

## Response format

Every `/api/*` response is wrapped in a standard envelope by a single
`after_request` hook in `app.py` — route handlers themselves stay simple
(`jsonify(payload), status`) and never need to build this envelope by hand:

```json
// success
{ "success": true, "data": { ... } }

// error
{ "success": false, "message": "You can only manage your own assigned category" }
```

HTTP status codes used throughout: `200` success, `201` created, `400`
validation error, `401` unauthenticated, `403` forbidden, `404` not found,
`409` conflict, `500` server error.

## Testing
```bash
pip install pytest
DATABASE_URL="sqlite:///:memory:" pytest
```
`tests/test_permissions.py` proves the critical security requirement: a
coach can never write attendance or view fees outside their assigned
category, even if the category_id in the request body is tampered with.

## API surface
See the route files in `routes/` — each one is documented inline. Import
`Playmaker_FC.postman_collection.json` (in the repo root) into Postman for
a ready-made request collection covering every endpoint, with JWT auth
wired via a `{{token}}` collection variable.

## Security model
- Every request is authenticated via `Authorization: Bearer <JWT>`.
- Passwords are hashed with Werkzeug's `generate_password_hash`
  (PBKDF2-SHA256) — never stored in plain text.
- `utils/auth.py` — decorators: `require_auth`, `require_admin`,
  `require_coach_or_admin`.
- `utils/permissions.py` — `category_permission_check()` and
  `can_view_fee_category()` are the single source of truth for "can this
  user touch this category". Every attendance/fee mutation route calls one
  of these before writing anything — the frontend app's UI restrictions are
  a convenience only, never the actual guard.

## Mobile connection (local development)

- **Expo Web on the same PC** as the backend: `http://127.0.0.1:5000/api`
- **Physical phone / Expo Go**: use your PC's LAN IP instead of localhost,
  e.g. `http://192.168.1.42:5000/api` (localhost on a phone means the phone
  itself, not your computer).

The frontend app's API base URL is configured in `frontend/app.json` under
`expo.extra.apiBaseUrl`, read by `frontend/services/api.ts`.

# Nobanno — Agent Instructions

## Status: backend is LIVE

The Django backend is **deployed and fully live** at `https://nobannoapp.online/`.
The frontend already points at it (`constants/api.ts` → `HOST = 'nobannoapp.online'`).
**`frontend/api.md` is the authoritative, up-to-date API reference** — always follow
it over older notes in this file or in `new_features.md`.

## Quick start

```bash
# Frontend only — the backend is already live, so no local server is needed
# (from frontend/)
npx expo start -c
```

For local backend development (optional):

```bash
# Backend (from backend/)
source ../venv/bin/activate
python manage.py migrate
python manage.py seed_data        # clears DB, seeds 1 admin + 5 farmers + 2 customers
python manage.py runserver 0.0.0.0:8000

# Frontend (from frontend/) — must repoint constants/api.ts to local host first
npx expo start -c
```

## Backend (Django + DRF, live at https://nobannoapp.online/api/)

- **Auth**: DRF Token auth. `POST /api/auth/login/` accepts `email_or_phone` (email or phone) — see `frontend/api.md`. Tokens rotate on every login (old token revoked), TTL 7 days.
- **Roles**: `customer`, `farmer`, `deliveryman`, `admin`/staff.
- **DB**: PostgreSQL in production; `USE_SQLITE=true` in `backend/.env` for SQLite. Tests always use in-memory SQLite.
- **CORS**: All origins allowed.
- **Tests**: `python manage.py test api`
- **Seed creds (local only)**: Admin `admin` / `mik`; farmers `farmer_jamal` / `farmerpassword123`; customers `customer_sadia` / `customerpassword123`. Full list in `backend/TESTING.md`.
- **Post model**: `total_weight_kg` is the stock field (no separate `available_weight_kg`).
- **Order flow**: `pending → completed/cancelled`. `platform_fee` = 10% product cost, `farmer_payout` = 90%. Orders complete after batch delivery or direct completion.
- **Payment**: Use **demo pay** (`payments/demo/`) for testing; bKash is the real gateway.
- **Balance**: Not writable via API. Admin topup at `POST /api/users/<id>/topup/`.
- **Password reset**: Email OTP via Gmail SMTP (creds in `backend/.env`).
- **Root venv**: Use `/venv` (project root), not `backend/venv/`.

## Frontend (Expo SDK 52, RN 0.76)

- **Router**: expo-router file-based routing in `frontend/app/`.
- **Entry flow**: `index.tsx` → location permission → auth → role dashboard.
- **API base URL**: hardcoded in `constants/api.ts` → `https://nobannoapp.online/api` (live). Only change for local dev.
- **API client**: all calls centralized in `services/api.ts`.
- **i18n**: Bengali default (`lng: 'bn'`), English fallback (`localization/i18n.js`).
- **Font**: Lora via `@expo-google-fonts/lora`.

## Repo conventions

- `junkroot/` is workspace trash — ignore.
- `new_features.md` is a wishlist, not authoritative spec — `frontend/api.md` wins.
- **Known gap**: frontend `logout()` clears local state but does not call `POST auth/logout/`, so the server token isn't revoked.

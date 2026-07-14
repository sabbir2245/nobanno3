# Nobanno — Agent Instructions

## Quick start

```bash
# Backend (from backend/)
source ../venv/bin/activate
python manage.py migrate
python manage.py seed_data        # clears DB, seeds 1 admin + 5 farmers + 2 customers
python manage.py runserver 0.0.0.0:8000

# Frontend (from frontend/)
npx expo start -c

# Fullstack
./s.sh
```

## Backend (Django 5.2 + DRF 3.17)

- **Auth**: DRF Token auth. `POST /api/auth/login/` accepts `username`, `email`, or `phone_number` (via `EmailOrPhoneBackend`).
- **DB**: PostgreSQL by default. Set `USE_SQLITE=true` in `backend/.env` for SQLite. Tests always use in-memory SQLite.
- **CORS**: All origins allowed.
- **Tests**: `python manage.py test api`
- **Seed creds**: Admin `admin` / `Adminpassword123`; farmers `farmer_jamal` / `farmerpassword123`; customers `customer_sadia` / `customerpassword123`. Full list in `backend/TESTING.md`.
- **Post model**: `total_weight_kg` is the stock field (no separate `available_weight_kg`).
- **Order flow**: `pending → shipped → completed/cancelled`. `platform_fee` = 10% product cost, `farmer_payout` = 90%.
- **Balance**: Not writable via API. Admin topup at `POST /api/users/<id>/topup/`.
- **Password reset**: Email OTP via Gmail SMTP (creds in `backend/.env`).
- **Root venv**: Use `/venv` (project root), not `backend/venv/`.

## Frontend (Expo SDK 52, RN 0.76)

- **Router**: expo-router file-based routing in `frontend/app/`.
- **Entry flow**: `index.tsx` → location permission → auth → role dashboard.
- **API base URL**: hardcoded in `constants/api.ts` — update for your network.
- **i18n**: Bengali default (`lng: 'bn'`), English fallback (`localization/i18n.js`).
- **Font**: Lora via `@expo-google-fonts/lora`.

## Repo conventions

- `junkroot/` is workspace trash — ignore.
- `new_features.md` is a wishlist, not authoritative spec.

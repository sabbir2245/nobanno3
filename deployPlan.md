# Nobanno — Full Live Deployment Plan

Path: Hetzner VPS (€4.10/mo) + own domain + HTTPS. Backend live → Play Store.

## Part 0 — Buy & Provision
1. Buy domain (~$10/yr, e.g. Namecheap/Cloudflare Registrar): `nobanno.com`.
2. Create Hetzner Cloud account; pay with BD international card (enable international transactions).
3. Create Cloud Server (CX22) — Ubuntu 22.04. Keep root password.
4. Point DNS: A record `api.nobanno.com` → VPS public IP.

## Part 1 — Backend Live (on VPS)

### 1A. Server setup
```bash
ssh root@<VPS-IP>
apt update && apt upgrade -y
apt install -y python3.11 python3.11-venv nginx postgresql certbot python3-certbot-nginx
systemctl enable --now postgresql
```

### 1B. Database
```sql
CREATE USER nobanno_user WITH PASSWORD 'strongpass';
CREATE DATABASE nobanno_db OWNER nobanno_user;
```

### 1C. Upload project
- git clone repo onto VPS (or scp).
- Create venv; pip install django djangorestframework gunicorn whitenoise psycopg2-binary django-cors-headers django-jazzmin Pillow python-dotenv.

### 1D. Code changes
In `backend/nobanno/settings.py`:
- DEBUG = False; SECRET_KEY from env (never hardcoded).
- ALLOWED_HOSTS = ['api.nobanno.com', 'localhost'].
- CORS_ALLOW_ALL_ORIGINS = False → CORS_ALLOWED_ORIGINS for the app.
- Add WhiteNoise middleware + STATIC_ROOT = BASE_DIR / 'staticfiles'.
- Set env for Postgres (USE_SQLITE=false, DB creds), bKash creds, and:
  BKASH_CALLBACK_URL = 'https://api.nobanno.com/api/payments/bkash/callback/'.

### 1E. Run
```bash
python manage.py migrate
python manage.py seed_data
python manage.py collectstatic --noinput
```
Run gunicorn via systemd (`gunicorn nobanno.wsgi --bind 127.0.0.1:8000`).
Nginx reverse-proxy → 127.0.0.1:8000, serve /static/ + /media/ (from timage/). Certbot → HTTPS.

### 1F. Verify
curl https://api.nobanno.com/api/posts/ returns data. Test bKash callback reachability.

## Part 2 — Frontend → Play Store

### 2A. Point app to live backend
Edit `frontend/constants/api.ts`:
```ts
export const API_BASE_URL = `https://api.nobanno.com/api`;
```

### 2B. Build
```bash
npx eas login
eas build:configure
eas build --platform android --profile production   # produces .aab
```

### 2C. Play Console
- Pay $25 one-time; create app listing (com.nobanno.app already set in app.json).
- Upload 512x512 icon, feature graphic, screenshots (EN/BN), descriptions.
- Complete content rating + data-safety form (location permission declared).
- Provide privacy policy URL (host one on the VPS).
- Upload .aab → Internal testing (Firebase App Tester) → Production.

## Files to change
| File | Change |
|---|---|
| backend/nobanno/settings.py | prod settings, WhiteNoise, staticfiles, CORS, secrets via env |
| backend/.env | DB/bKash/email/secret config for prod |
| frontend/constants/api.ts | API_BASE_URL → https://api.nobanno.com/api |
| (new) backend/requirements.txt | gunicorn, whitenoise, etc. |
| (new) systemd + nginx configs | copied to VPS |

## Open choices
- bKash: sandbox (default) until you have a merchant account; live needs merchant creds.
- Optional: script the whole VPS setup as an idempotent bash script.

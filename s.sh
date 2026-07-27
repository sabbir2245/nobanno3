#!/bin/bash
echo "🚀 Starting Fullstack Dev Environment..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_PYTHON="$SCRIPT_DIR/venv/bin/python3"
VENV_PIP="$SCRIPT_DIR/venv/bin/pip"

trap 'echo "🛑 Shutting down..."; kill $BACKEND_PID $TUNNEL_PID 2>/dev/null; exit' INT TERM

# 1. Install/Update Python dependencies
echo "📦 Checking and installing system dependencies..."
"$VENV_PIP" install -r "$SCRIPT_DIR/requirements.txt"

# 2. Start Cloudflare Tunnel (for SSLCommerz IPN)
echo "☁️  Starting Cloudflare Tunnel..."
CLOUDFLARED="$HOME/.local/bin/cloudflared"
if [ -x "$CLOUDFLARED" ]; then
  "$CLOUDFLARED" tunnel --url http://localhost:8000 > /tmp/cloudflared.log 2>&1 &
  TUNNEL_PID=$!
  # Wait for tunnel URL
  for i in $(seq 1 15); do
    TUNNEL_URL=$(grep -oP 'https://[a-z-]+\.trycloudflare\.com' /tmp/cloudflared.log 2>/dev/null | head -1)
    [ -n "$TUNNEL_URL" ] && break
    sleep 1
  done
  if [ -n "$TUNNEL_URL" ]; then
    echo "🌐 Tunnel URL: $TUNNEL_URL"
    export CLOUDFLARE_TUNNEL_URL="$TUNNEL_URL"
  else
    echo "⚠️  Tunnel URL not detected yet, continuing..."
  fi
else
  echo "⚠️  cloudflared not found at $CLOUDFLARED, skipping tunnel"
  TUNNEL_PID=""
fi

# 3. Start Django Server in background
echo "🐍 Launching Django Backend..."
cd "$SCRIPT_DIR/backend" && "$VENV_PYTHON" manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!

sleep 3

echo "🌐 Django Admin: http://localhost:8000/admin/"
[ -n "$TUNNEL_URL" ] && echo "🌐 Public URL:   $TUNNEL_URL/admin/"

# 4. Seed the database tables automatically
echo "🌱 Seeding fresh data and linking crop images..."
cd "$SCRIPT_DIR/backend" && "$VENV_PYTHON" manage.py seed_data

# 5. Start Expo Frontend
echo "📱 Launching Expo Frontend..."
cd "$SCRIPT_DIR/frontend" && npx expo start -c

# Cleanup on exit
kill $BACKEND_PID $TUNNEL_PID 2>/dev/null

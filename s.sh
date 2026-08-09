#!/bin/bash
echo "🚀 Starting Fullstack Dev Environment..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_PYTHON="$SCRIPT_DIR/venv/bin/python3"
VENV_PIP="$SCRIPT_DIR/venv/bin/pip"

trap 'echo "🛑 Shutting down..."; kill $BACKEND_PID 2>/dev/null; exit' INT TERM

# 1. Install/Update Python dependencies
echo "📦 Checking and installing system dependencies..."
"$VENV_PIP" install -r "$SCRIPT_DIR/requirements.txt"

# 2. Start Django Server in background
echo "🐍 Launching Django Backend..."
cd "$SCRIPT_DIR/backend" && "$VENV_PYTHON" manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!

sleep 3

echo "🌐 Django Admin: http://localhost:8000/admin/"

# 3. Seed the database tables automatically
echo "🌱 Seeding fresh data and linking crop images..."
cd "$SCRIPT_DIR/backend" && "$VENV_PYTHON" manage.py seed_data

# 4. Start Expo Frontend
echo "📱 Launching Expo Frontend..."
cd "$SCRIPT_DIR/frontend" && npx expo start -c

# Cleanup on exit
kill $BACKEND_PID 2>/dev/null

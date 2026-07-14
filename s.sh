#!/bin/bash
echo "🚀 Starting Fullstack Dev Environment..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_PYTHON="$SCRIPT_DIR/venv/bin/python3"
VENV_PIP="$SCRIPT_DIR/venv/bin/pip"

# 1. Install/Update Python dependencies
echo "📦 Checking and installing system dependencies..."
"$VENV_PIP" install -r "$SCRIPT_DIR/requirements.txt"

# 2. Start Django Server in background
echo "🐍 Launching Django Backend..."
cd "$SCRIPT_DIR/backend" && "$VENV_PYTHON" manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!

# 3. Wait 3 seconds for database initialization
sleep 3

echo "🌐 Django Admin: http://localhost:8000/admin/"

# 4. Seed the database tables automatically
echo "🌱 Seeding fresh data and linking crop images..."
cd "$SCRIPT_DIR/backend" && "$VENV_PYTHON" manage.py seed_data

# 5. Start Expo Frontend
echo "📱 Launching Expo Frontend..."
cd "$SCRIPT_DIR/frontend" && npx expo start -c

# Cleanup backend when frontend exits
kill $BACKEND_PID 2>/dev/null

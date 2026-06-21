@echo off
echo 🚀 Starting Fullstack Dev Environment...

:: 1. Install/Update Python dependencies using absolute script directory path
echo 📦 Checking and installing system dependencies...
cmd /c "pip install -r "%~dp0requirements.txt""

:: 2. Start Django Server in a separate window
echo 🐍 Launching Django Backend...
start cmd /k "cd backend && python manage.py runserver 0.0.0.0:8000"

:: 3. Wait 3 seconds for database initialization
timeout /t 3 >nul

:: 4. Seed the database tables automatically
echo 🌱 Seeding fresh data and linking crop images...
cmd /c "cd backend && python manage.py seed_data"

:: 5. Start Expo Frontend in your main VS Code terminal window
echo 📱 Launching Expo Frontend...
cd frontend && npx expo start -c
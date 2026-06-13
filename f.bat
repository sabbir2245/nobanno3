@echo off
cls
echo ====================================================
echo             NOBANNO 3 AUTOMATION FLOW            
echo ====================================================

:: Step 1: Activate environment and seed database records
echo 📂 [1/3] Seeding Database Data...
call venv\Scripts\activate
cd backend
python manage.py seed_data
if %errorlevel% neq 0 (
    echo ❌ Database seeding failed! Stopping execution.
    pause
    exit /b %errorlevel%
)

:: Step 2: Launch the server in a completely separate window
echo 🚀 [2/3] Launching Django Server in a new window...
start "Nobanno3 Backend Server" cmd /k "..\venv\Scripts\activate && python manage.py runserver"

:: Step 3: Wait a few seconds to ensure the server is fully up and listening
echo ⏳ Waiting 5 seconds for server initialization...
timeout /t 5 /nobreak >nul

:: Step 4: Fire off the API testing script
echo 🎯 [3/3] Executing Test Flow Script (tforg.py)...
python api\tforg.py

echo ====================================================
echo Execution completed successfully!
echo ====================================================
pause
@echo off
:: Check if a commit message was provided
if "%~1"=="" (
    echo Error: Please provide a commit message.
    echo Usage: push.bat "Your commit message"
    pause
    exit /b
)

:: Git commands
git add .
git commit -m "%~1"
git push

echo.
echo Process complete!
pause
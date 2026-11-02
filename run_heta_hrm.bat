@echo off
title HETA-HRM Attendance Management System
echo ========================================================
echo   Launching HETA-HRM Attendance & HR System
echo   Higher Education & Training Academy
echo ========================================================
echo.

:: 1. Start Python Backend API
echo [1/3] Starting Python Backend on http://localhost:5050...
start "HETA Backend Server" /min cmd /c "cd /d %~dp0backend && python server.py"

:: 2. Wait 2 seconds
timeout /t 2 /nobreak >nul

:: 3. Start React Frontend
echo [2/3] Starting React Frontend on http://localhost:3001...
start "HETA Frontend Server" /min cmd /c "cd /d %~dp0frontend && npm run dev -- --port 3001 --host"

:: 4. Wait 3 seconds
timeout /t 3 /nobreak >nul

:: 5. Open in Web Browser
echo [3/3] Opening HETA-HRM in your default browser...
start http://localhost:3001/

echo.
echo ========================================================
echo   HETA-HRM is now running!
echo   Frontend: http://localhost:3001/
echo   Backend:  http://localhost:5050/
echo   Admin:    pravesbalaji144@gmail.com
echo ========================================================
echo.
pause

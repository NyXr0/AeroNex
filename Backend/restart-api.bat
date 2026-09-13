@echo off
cd /d "%~dp0"
echo Restarting API server... > restart-output.log
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
  echo Killing PID %%a >> restart-output.log
  taskkill /F /PID %%a >> restart-output.log 2>&1
)
timeout /t 2 /nobreak >nul
start "AeroNex API" cmd /k python run_api.py
echo DONE_MARKER >> restart-output.log

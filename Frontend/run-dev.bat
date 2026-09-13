@echo off
cd /d "%~dp0"
echo Starting AeroNex dashboard dev server...
call npm run dev
pause

@echo off
cd /d "%~dp0"
echo Starting AeroNex API server...
python run_api.py
pause

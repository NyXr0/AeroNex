@echo off
cd /d "%~dp0"
echo Starting full live scrape (3 routes x 3 windows)... > live-scrape-output.log
echo Started at %date% %time% >> live-scrape-output.log
python run_live_scrape.py >> live-scrape-output.log 2>&1
echo. >> live-scrape-output.log
echo EXIT_CODE=%errorlevel% >> live-scrape-output.log
echo DONE_MARKER >> live-scrape-output.log

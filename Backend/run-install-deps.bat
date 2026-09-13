@echo off
cd /d "%~dp0"
echo === pip install (psycopg2-binary) === > install-deps-output.log
pip install "psycopg2-binary>=2.9" >> install-deps-output.log 2>&1
echo === DONE (exit %errorlevel%) === >> install-deps-output.log 2>&1

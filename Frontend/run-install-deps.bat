@echo off
cd /d "%~dp0"
echo === npm install (framer-motion + supabase-js) === > install-deps-output.log
npm install --no-audit --no-fund >> install-deps-output.log 2>&1
echo === DONE (exit %errorlevel%) === >> install-deps-output.log 2>&1

@echo off
cd /d "%~dp0"
echo === git remote setup === > push-output.log
git remote remove origin >> push-output.log 2>&1
git remote add origin https://github.com/NyXr0/AeroNex.git >> push-output.log 2>&1
git remote -v >> push-output.log 2>&1
echo === git push === >> push-output.log 2>&1
git push -u origin master >> push-output.log 2>&1
echo === DONE (exit %errorlevel%) === >> push-output.log 2>&1

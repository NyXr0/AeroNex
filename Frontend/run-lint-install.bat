@echo off
cd /d "%~dp0"
echo Installing lint deps... > lint-output.log
call npm install --no-audit --no-fund >> lint-output.log 2>&1
echo INSTALL_EXIT_CODE=%errorlevel% >> lint-output.log
call npm run lint >> lint-output.log 2>&1
echo LINT_EXIT_CODE=%errorlevel% >> lint-output.log
echo DONE_MARKER >> lint-output.log

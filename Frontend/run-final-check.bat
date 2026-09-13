@echo off
cd /d "%~dp0"
echo Final check... > final-check-output.log
rmdir /s /q .next 2>nul
call npm run build >> final-check-output.log 2>&1
echo BUILD_EXIT_CODE=%errorlevel% >> final-check-output.log
call npm run lint >> final-check-output.log 2>&1
echo LINT_EXIT_CODE=%errorlevel% >> final-check-output.log
echo DONE_MARKER >> final-check-output.log

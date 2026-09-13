@echo off
cd /d "%~dp0"
echo Running production build... > build-output.log
call npm run build >> build-output.log 2>&1
echo BUILD_EXIT_CODE=%errorlevel% >> build-output.log
echo DONE_MARKER >> build-output.log

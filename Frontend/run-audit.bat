@echo off
cd /d "%~dp0"
echo Running npm audit... > audit-output.log
call npm audit --audit-level=high >> audit-output.log 2>&1
echo AUDIT_EXIT_CODE=%errorlevel% >> audit-output.log
echo DONE_MARKER >> audit-output.log

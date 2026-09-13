@echo off
cd /d "%~dp0"
echo Restarting dev server... > restart-dev-output.log
for %%p in (3000 3001 3002 3003) do (
  for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%%p ^| findstr LISTENING') do (
    echo Killing PID %%a on port %%p >> restart-dev-output.log
    taskkill /F /PID %%a >> restart-dev-output.log 2>&1
  )
)
timeout /t 2 /nobreak >nul
rmdir /s /q .next 2>nul
start "next-server" cmd /k npm run dev
echo DONE_MARKER >> restart-dev-output.log

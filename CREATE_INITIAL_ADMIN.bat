@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo CREATE INITIAL ADMIN
echo ==========================================
echo.

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass ^
  -File "%~dp0CREATE_INITIAL_ADMIN.ps1"

if errorlevel 1 (
  echo.
  echo Initial admin creation failed.
  pause
  exit /b 1
)

echo.
echo Initial admin creation completed.
pause

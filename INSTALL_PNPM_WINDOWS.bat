@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0INSTALL_PNPM_WINDOWS.ps1"
if errorlevel 1 (
  echo.
  echo Cai dat that bai. Kiem tra thong bao phia tren.
  pause
  exit /b 1
)
echo.
pause

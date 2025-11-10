@echo off
setlocal
cd /d "%~dp0"

PowerShell -NoProfile -ExecutionPolicy Bypass -File ".\tools\generate_data.ps1"
if %ERRORLEVEL% NEQ 0 (
  echo Error al generar data.js
  pause
  exit /b 1
)

start "" "%cd%\index.html"
endlocal

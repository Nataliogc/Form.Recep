@echo off
cd /d "%~dp0"
set PORT=5173

REM Intenta con Python
where python >nul 2>&1
if %errorlevel%==0 (
  start "" http://localhost:%PORT%/
  python -m http.server %PORT%
  goto :eof
)

REM Si no hay Python, intenta con Node http-server (npm i -g http-server)
where http-server >nul 2>&1
if %errorlevel%==0 (
  start "" http://localhost:%PORT%/
  http-server -p %PORT%
  goto :eof
)

echo No se encontró Python ni http-server.
echo Instala Python (https://python.org) o ejecuta:  npm i -g http-server
pause

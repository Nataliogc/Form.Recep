@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
set "ROOT=%~dp0"
set "XLSX=%ROOT%plantilla_preguntas_unica.xlsx"
if not exist "%XLSX%" (
  echo [ERROR] No encuentro %XLSX%
  pause & exit /b 1
)

:: Pausa OneDrive si lo usas (opcional)
:: taskkill /IM OneDrive.exe /F >nul 2>nul

:: 1) Generar data/
py -m pip install --upgrade pandas openpyxl
py "%ROOT%tools\xlsx_to_json_single_FIXED.py" --xlsx "%XLSX%" || goto :err

:: 2) Bump version en index para cache-busting
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do set D=%%d%%b%%c
for /f "tokens=1-2 delims=: " %%a in ("%time%") do set T=%%a%%b
set VER=%D%_%T%
set VER=%VER: =0%
powershell -NoProfile -Command "(Get-Content '%ROOT%index.html') -replace '\?v=\d+','?v=%VER%' | Set-Content '%ROOT%index.html'"

:: 3) Git push
del /f /q "%ROOT%\.git\index.lock" 2>nul
git -C "%ROOT%" fetch origin
git -C "%ROOT%" switch main || git -C "%ROOT%" switch -c main origin/main
git -C "%ROOT%" pull --rebase origin main
git -C "%ROOT%" add -A
git -C "%ROOT%" commit -s -m "build: data regenerated + v=%VER%" 1>nul 2>nul
git -C "%ROOT%" push origin main || goto :err

echo.
echo ✅ Publicado: https://nataliogc.github.io/Form.Recep/?v=%VER%
echo (Recuerda tener el binding RESULTS en Cloudflare Pages)
pause
exit /b 0

:err
echo.
echo ❌ Algo falló. Revisa los mensajes anteriores.
pause
exit /b 1

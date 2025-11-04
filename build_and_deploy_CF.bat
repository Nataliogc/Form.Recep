@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

REM === CONFIG ===
set "REPO=C:\Users\comun\Documents\Web Test"
set "PY=python"
set "MSG=build: regenerate data + static (CF Pages)"
set "DEPLOY=%~dp0deploy_frontend_CF.bat"

REM 0) Ir al repo
pushd "%REPO%" || (echo [ERR] No existe "%REPO%" & exit /b 1)

REM 1) Generar JSON desde Excel (opcional)
REM "%PY%" tools\xlsx_to_json_single_FIXED.py || (echo [ERR] Fallo generando JSON & popd & exit /b 1)

REM 2) Construcci?n si aplica
if exist package.json (
  call npm run build || (echo [ERR] npm build fall? & popd & exit /b 1)
) else (
  echo [=] Sin paso de build (no hay package.json)
)

REM 3) (Opcional) Copiar htmls a \dist si es tu flujo
REM if not exist dist mkdir dist
REM for %%I in (index.html live.html live.mobile.html mobile.html) do (
REM   if exist "%%I" copy /y "%%I" "dist\%%I" >nul
REM )

REM 4) Commit preliminar
git add -A
git commit -m "%MSG%" 1>nul 2>nul

REM 5) Deploy
call "%DEPLOY%"
popd

@echo off
setlocal

REM =========================================
REM  Push a GitHub con DCO (sign-off) simple
REM =========================================

set "REMOTE_URL=https://github.com/Nataliogc/Form.Recep.git"
set "BRANCH=main"

echo ==========================================
echo   Subida de cambios a GitHub (DCO activo)
echo ==========================================

where git >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git no esta en el PATH. Instala Git y vuelve a intentar.
  goto :END_ERROR
)

if exist "xlsx_to_json_single_FIXED.py" (
  where python >nul 2>&1
  if not errorlevel 1 (
    echo [Paso] Ejecutando generador Excel->JSON...
    python "xlsx_to_json_single_FIXED.py"
    if errorlevel 1 (
      echo [AVISO] El generador devolvio error. Continuo igualmente.
    ) else (
      echo [OK] Datos generados en /data.
    )
  ) else (
    echo [AVISO] Python no encontrado. Omito la generacion de /data.
  )
) else (
  echo [Info] No hay generador xlsx_to_json_single_FIXED.py (omito este paso).
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [Paso] Inicializando repositorio...
  git init || goto :END_ERROR
  git branch -M "%BRANCH%" || goto :END_ERROR
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo [Paso] Configurando remote origin: %REMOTE_URL%
  git remote add origin "%REMOTE_URL%" || goto :END_ERROR
)

if not exist ".gitignore" (
  echo [Paso] Creando .gitignore...
  > ".gitignore" (
    echo Thumbs.db
    echo ~$*.xlsx
    echo __pycache__/
    echo *.pyc
    echo data/_tmp_read.xlsx
  )
)

for /f "usebackq tokens=*" %%A in (`git config --get user.name 2^>nul`) do set "GUSER=%%A"
for /f "usebackq tokens=*" %%A in (`git config --get user.email 2^>nul`) do set "GMAIL=%%A"

if "%GUSER%"=="" (
  echo [Paso] Configurando git user.name por defecto...
  git config user.name "FormRecep" || goto :END_ERROR
)
if "%GMAIL%"=="" (
  echo [Paso] Configurando git user.email por defecto...
  git config user.email "formrecep@users.noreply.github.com" || goto :END_ERROR
)

git add -A

set "MSG=%*"
if "%MSG%"=="" set "MSG=Auto: actualizacion"

echo [Paso] Commit con sign-off: "%MSG%"
git commit -s -m "%MSG%" >nul 2>&1
if errorlevel 1 (
  echo [Info] No hay cambios nuevos para commitear.
) else (
  echo [OK] Commit realizado con sign-off.
)

echo [Paso] Sincronizando con remoto (pull --rebase)...
git pull --rebase origin "%BRANCH%" >nul 2>&1
if errorlevel 1 (
  echo [AVISO] Pull con advertencias (primer push o sin upstream). Sigo.
) else (
  echo [OK] Pull correcto.
)

echo [Paso] Subiendo a GitHub...
git push -u origin "%BRANCH%"
if errorlevel 1 (
  echo [ERROR] No se pudo hacer push. Revisa credenciales/permisos/red.
  goto :END_ERROR
)

echo.
echo ==========================================
echo [OK] Todo subido correctamente (DCO aplicado).
echo ==========================================
echo.
pause
endlocal
exit /b 0

:END_ERROR
echo.
echo ==========================================
echo [ERROR] Hubo problemas durante el proceso.
echo         Revisa los mensajes anteriores.
echo ==========================================
echo.
pause
endlocal
exit /b 1


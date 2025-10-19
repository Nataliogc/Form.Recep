@echo off
setlocal ENABLEDELAYEDEXPANSION

:: ==========================================================
::  Subida a GitHub con DCO (sign-off) 100% automática
::  - Ejecuta generador Excel->JSON (si existe)
::  - Inicializa repo, remoto y rama main (si falta)
::  - Configura user.name / user.email si no existen
::  - Commit con --signoff (DCO)
::  - Pull --rebase y Push
:: ==========================================================

:: --- Config básica ---
set "PROJECT_DIR=%~dp0"
set "DEFAULT_REMOTE=https://github.com/Nataliogc/Form.Recep.git"
set "BRANCH=main"
set "ERR=0"

cd /d "%PROJECT_DIR%"

echo ==========================================
echo   Subida de cambios a GitHub (DCO activo)
echo ==========================================

:: --- Pre-chequeos ---
where git >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git no esta en el PATH. Instala Git y vuelve a intentar.
  set "ERR=1"
  goto :END
)

:: --- Generar /data desde Excel (si existe) ---
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

:: --- Inicializar repo si hace falta ---
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [Paso] Inicializando nuevo repositorio...
  git init
  if errorlevel 1 ( echo [ERROR] No se pudo inicializar git.& set ERR=1& goto :END )
  git branch -M "%BRANCH%"
)

:: --- Asegurar remote origin ---
git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo [Paso] Configurando remote origin: %DEFAULT_REMOTE%
  git remote add origin "%DEFAULT_REMOTE%"
  if errorlevel 1 ( echo [ERROR] No se pudo configurar el remoto origin.& set ERR=1& goto :END )
)

:: --- Crear .gitignore básico si falta ---
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

:: --- Configurar user.name / user.email si faltan (para DCO) ---
for /f "tokens=*" %%A in ('git config --get user.name 2^>nul') do set "GUSER=%%A"
for /f "tokens=*" %%A in ('git config --get user.email 2^>nul') do set "GMAIL=%%A"

if "%GUSER%"=="" (
  :: Intentar deducir owner a partir del remoto
  for /f "tokens=2 delims=/ " %%O in ('git remote get-url origin 2^>nul') do set "OWNER_RAW=%%O"
  :: OWNER_RAW puede venir como github.com:Owner/Repo.git o https://github.com/Owner/Repo.git
  set "OWNER=%OWNER_RAW%"
  :: Quitar github.com: si aparece
  set "OWNER=!OWNER:*github.com/=%"
  set "OWNER=!OWNER:*github.com:^=!"
  :: Cortar por /
  for /f "tokens=1 delims=/" %%U in ("!OWNER!") do set "OWNER_ONLY=%%U"
  if "!OWNER_ONLY!"=="" set "OWNER_ONLY=GitUser"

  git config user.name "!OWNER_ONLY!"
)

if "%GMAIL%"=="" (
  if "!OWNER_ONLY!"=="" (
    for /f "tokens=1 delims=@" %%U in ("%USERNAME%@users.noreply.github.com") do set "TEMPUSER=%%U"
    git config user.email "%TEMPUSER%@users.noreply.github.com"
  ) else (
    git config user.email "!OWNER_ONLY!@users.noreply.github.com"
  )
)

echo [OK] Git user:  ^<^%USERNAME%^>  /  Nombre: ^<^%GUSER%^>  /  Email: ^<^%GMAIL%^>
echo     (Si estaban vacios, se han configurado automaticamente.)

:: --- Add + commit (con sign-off DCO) ---
git add -A

set "MSG=%*"
if "%MSG%"=="" (
  for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set "today=%%a-%%b-%%c"
  set "MSG=Auto: actualizacion %today% %time%"
)

echo [Paso] Commit con sign-off (DCO): "%MSG%"
git commit -s -m "%MSG%" >nul 2>&1
if errorlevel 1 (
  echo [Info] No hay cambios nuevos para commitear.
) else (
  echo [OK] Commit realizado con sign-off.
)

:: --- Pull --rebase (no critico) ---
echo [Paso] Sincronizando con remoto (pull --rebase)...
git pull --rebase origin "%BRANCH%" >nul 2>&1
if errorlevel 1 (
  echo [AVISO] Pull con advertencias (primer push o sin upstream). Sigo.
) else (
  echo [OK] Pull correcto.
)

:: --- Push ---
echo [Paso] Subiendo a GitHub...
git push -u origin "%BRANCH%"
if errorlevel 1 (
  echo [ERROR] No se pudo hacer push. Revisa credenciales/permisos/red.
  set "ERR=1"
  goto :END
) else (
  echo [OK] Push realizado a origin/%BRANCH%.
)

:END@echo off
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

echo.
if "%ERR%"=="0" (
  color 0A
  echo ==========================================
  echo [OK] Todo subido correctamente (DCO aplicado).
  echo ==========================================
) else (
  color 0C
  echo ==========================================
  echo [ERROR] Hubo problemas durante el proceso.
  echo         Revisa los mensajes anteriores.
  echo ==========================================
)
echo.
pause
endlocal

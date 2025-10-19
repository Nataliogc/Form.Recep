@echo off
setlocal ENABLEDELAYEDEXPANSION

REM ==========================================================
REM  Push a GitHub + DCO + Logging + Chequeos
REM ==========================================================
set "REMOTE_URL=https://github.com/Nataliogc/Form.Recep.git"
set "BRANCH=main"
set "GEN_FILE=xlsx_to_json_single_FIXED.py"

REM --- Preparar carpeta de logs y nombre de archivo con timestamp seguro ---
if not exist "logs" mkdir "logs"
for /f %%I in ('powershell -NoProfile -Command "(Get-Date).ToString(\"yyyyMMdd_HHmmss\")"') do set "TS=%%I"
set "LOG=logs\push_log_%TS%.txt"

REM --- utilidades de logging ---
call :LOG "=========================================="
call :LOG "  Subida de cambios a GitHub (DCO + LOG)"
call :LOG "=========================================="
call :LOG "Repo remoto: %REMOTE_URL%"
call :LOG "Rama: %BRANCH%"
call :LOG "Log: %LOG%"

REM --- 0) Chequeos básicos: Git ---
where git >nul 2>&1
if errorlevel 1 (
  call :ERR "Git no está en el PATH. Instala Git y vuelve a intentar."
  goto END_ERR
) else (
  for /f "tokens=2 delims= " %%v in ('git --version') do set GVER=%%v
  call :OK "Git encontrado (v%GVER%)."
)

REM --- 1) (Opcional) Generar /data desde Excel ---
if exist "%GEN_FILE%" (
  where python >nul 2>&1
  if errorlevel 1 (
    call :WARN "Python no encontrado. Omito la generación de /data."
  ) else (
    call :STEP "Ejecutando generador Excel->JSON: %GEN_FILE%"
    python "%GEN_FILE%" >> "%LOG%" 2>&1
    if errorlevel 1 (
      call :WARN "El generador devolvió error. (Se continúa igualmente)"
    ) else (
      call :OK "Datos generados en /data."
    )
  )
) else (
  call :INFO "No hay generador %GEN_FILE% (omito este paso)."
)

REM --- 2) Inicializar repo si hace falta ---
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  call :STEP "Inicializando repositorio Git..."
  git init >> "%LOG%" 2>&1 || (call :ERR "git init falló" & goto END_ERR)
  git branch -M "%BRANCH%" >> "%LOG%" 2>&1 || (call :ERR "git branch -M %BRANCH% falló" & goto END_ERR)
  call :OK "Repositorio inicializado."
) else (
  call :OK "Repositorio Git detectado."
)

REM --- 3) Asegurar remoto origin ---
git remote get-url origin >nul 2>&1
if errorlevel 1 (
  call :STEP "Configurando remoto origin: %REMOTE_URL%"
  git remote add origin "%REMOTE_URL%" >> "%LOG%" 2>&1 || (call :ERR "No se pudo configurar origin" & goto END_ERR)
  call :OK "Remote origin configurado."
) else (
  for /f "usebackq tokens=*" %%R in (`git remote get-url origin`) do set CURR_REMOTE=%%R
  call :OK "Remote origin ya existe: %CURR_REMOTE%"
)

REM --- 4) .gitignore básico si falta ---
if not exist ".gitignore" (
  call :STEP "Creando .gitignore básico..."
  > ".gitignore" (
    echo Thumbs.db
    echo ~$*.xlsx
    echo __pycache__/
    echo *.pyc
    echo data/_tmp_read.xlsx
  )
  call :OK ".gitignore creado."
) else (
  call :INFO ".gitignore ya existe."
)

REM --- 5) Configurar user.name / user.email si faltan (DCO necesita autor) ---
for /f "usebackq tokens=*" %%A in (`git config --get user.name 2^>nul`) do set "GUSER=%%A"
for /f "usebackq tokens=*" %%A in (`git config --get user.email 2^>nul`) do set "GMAIL=%%A"
if "%GUSER%"=="" (
  call :STEP "Configurando git user.name por defecto..."
  git config user.name "FormRecep" >> "%LOG%" 2>&1 || (call :ERR "No se pudo configurar user.name" & goto END_ERR)
)
if "%GMAIL%"=="" (
  call :STEP "Configurando git user.email por defecto..."
  git config user.email "formrecep@users.noreply.github.com" >> "%LOG%" 2>&1 || (call :ERR "No se pudo configurar user.email" & goto END_ERR)
)
call :OK "Autor Git: name=%GUSER% email=%GMAIL% (si estaban vacíos, ya quedaron configurados)"

REM --- 6) Conectividad a GitHub (ping) ---
call :STEP "Comprobando conectividad a github.com..."
ping -n 1 github.com >nul 2>&1
if errorlevel 1 (
  call :WARN "No hay respuesta de ping (puede estar bloqueado). Intento continuar."
) else (
  call :OK "Conectividad OK (ping)."
)

REM --- 7) Comprobar acceso al remoto (credenciales) ---
call :STEP "Verificando acceso al remoto (git ls-remote)..."
git ls-remote origin >nul 2>&1
if errorlevel 1 (
  call :WARN "No se pudo listar remoto. Puede ser el primer push o credenciales faltantes."
) else (
  call :OK "Acceso al remoto verificado."
)

REM --- 8) Add + commit con sign-off (DCO) ---
git add -A >> "%LOG%" 2>&1
set "MSG=%*"
if "%MSG%"=="" set "MSG=Auto: actualizacion"
call :STEP "Commit con sign-off: %MSG%"
git commit -s -m "%MSG%" >> "%LOG%" 2>&1
if errorlevel 1 (
  call :INFO "No hay cambios nuevos para commitear."
) else (
  call :OK "Commit realizado con sign-off."
)

REM --- 9) Pull --rebase (no crítico) ---
call :STEP "Sincronizando con remoto (pull --rebase)..."
git pull --rebase origin "%BRANCH%" >> "%LOG%" 2>&1
if errorlevel 1 (
  call :WARN "Pull con advertencias (primer push o sin upstream). Continúo."
) else (
  call :OK "Pull correcto."
)

REM --- 10) Push ---
call :STEP "Subiendo a GitHub (push)..."
git push -u origin "%BRANCH%" >> "%LOG%" 2>&1
if errorlevel 1 (
  call :ERR "No se pudo hacer push. Revisa credenciales/permisos/red. Mira el log: %LOG%"
  goto END_ERR
) else (
  call :OK "Push realizado a origin/%BRANCH%."
)

call :LOG ""
call :LOG "=========================================="
call :LOG "[OK] Todo subido correctamente (DCO aplicado)"
call :LOG "Log guardado en: %LOG%"
call :LOG "=========================================="
echo.
pause
endlocal
exit /b 0

:END_ERR
call :LOG ""
call :LOG "=========================================="
call :LOG "[ERROR] Hubo problemas durante el proceso."
call :LOG "Revisa el log: %LOG%"
call :LOG "=========================================="
echo.
pause
endlocal
exit /b 1

REM ======== helpers de logging ========
:LOG
set "L=%~1"
echo %~1
>> "%LOG%" echo %~1
exit /b 0

:OK
set "L=%~1"
echo [OK] %~1
>> "%LOG%" echo [OK] %~1
exit /b 0

:STEP
set "L=%~1"
echo [Paso] %~1
>> "%LOG%" echo [Paso] %~1
exit /b 0

:WARN
set "L=%~1"
echo [AVISO] %~1
>> "%LOG%" echo [AVISO] %~1
exit /b 0

:INFO
set "L=%~1"
echo [Info] %~1
>> "%LOG%" echo [Info] %~1
exit /b 0

:ERR
set "L=%~1"
echo [ERROR] %~1
>> "%LOG%" echo [ERROR] %~1
exit /b 0

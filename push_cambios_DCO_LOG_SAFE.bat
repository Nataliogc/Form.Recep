@echo off
setlocal ENABLEEXTENSIONS DISABLEDELAYEDEXPANSION

REM =========================================
REM  Push a GitHub con DCO + LOG (versión segura)
REM =========================================

set "REMOTE_URL=https://github.com/Nataliogc/Form.Recep.git"
set "BRANCH=main"
set "GEN_FILE=xlsx_to_json_single_FIXED.py"

REM --- timestamp seguro vía PowerShell (sin paréntesis en cmd) ---
for /f %%I in ('powershell -NoProfile -Command "$([DateTime]::Now.ToString(\"yyyyMMdd_HHmmss\"))"') do set "TS=%%I"
if not exist "logs" mkdir "logs"
set "LOG=logs\push_log_%TS%.txt"

REM --- cabecera ---
echo(==========================================  | tee.exe 2>nul 1>>"%LOG%"
echo(  Subida de cambios a GitHub (DCO + LOG)  | tee.exe 2>nul 1>>"%LOG%"
echo(==========================================  | tee.exe 2>nul 1>>"%LOG%"
echo(Repo remoto: %REMOTE_URL%                  | tee.exe 2>nul 1>>"%LOG%"
echo(Rama: %BRANCH%                             | tee.exe 2>nul 1>>"%LOG%"
echo(Log: %LOG%                                 | tee.exe 2>nul 1>>"%LOG%"

REM --- 0) Git ---
where git >nul 2>&1
if errorlevel 1 (
  echo([ERROR] Git no esta en el PATH. Instala Git y vuelve a intentar. | tee.exe 2>nul 1>>"%LOG%"
  goto END_ERR
) else (
  for /f "tokens=2 delims= " %%v in ('git --version') do set "GVER=%%v"
  echo([OK] Git encontrado (v%GVER%). | tee.exe 2>nul 1>>"%LOG%"
)

REM --- 1) Generar /data ---
if exist "%GEN_FILE%" (
  where python >nul 2>&1
  if errorlevel 1 (
    echo([AVISO] Python no encontrado. Omito la generacion de /data. | tee.exe 2>nul 1>>"%LOG%"
  ) else (
    echo([Paso] Ejecutando generador Excel->JSON: %GEN_FILE% | tee.exe 2>nul 1>>"%LOG%"
    python "%GEN_FILE%" >>"%LOG%" 2>&1
    if errorlevel 1 (
      echo([AVISO] El generador devolvio error. (Se continua igualmente) | tee.exe 2>nul 1>>"%LOG%"
    ) else (
      echo([OK] Datos generados en /data. | tee.exe 2>nul 1>>"%LOG%"
    )
  )
) else (
  echo([Info] No hay generador %GEN_FILE% (omito este paso). | tee.exe 2>nul 1>>"%LOG%"
)

REM --- 2) Repo Git ---
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo([Paso] Inicializando repositorio Git... | tee.exe 2>nul 1>>"%LOG%"
  git init >>"%LOG%" 2>&1 || ( echo([ERROR] git init fallo | tee.exe 2>nul 1>>"%LOG%" & goto END_ERR )
  git branch -M "%BRANCH%" >>"%LOG%" 2>&1 || ( echo([ERROR] git branch -M fallo | tee.exe 2>nul 1>>"%LOG%" & goto END_ERR )
  echo([OK] Repositorio inicializado. | tee.exe 2>nul 1>>"%LOG%"
) else (
  echo([OK] Repositorio Git detectado. | tee.exe 2>nul 1>>"%LOG%"
)

REM --- 3) Remoto ---
git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo([Paso] Configurando remote origin: %REMOTE_URL% | tee.exe 2>nul 1>>"%LOG%"
  git remote add origin "%REMOTE_URL%" >>"%LOG%" 2>&1 || ( echo([ERROR] No se pudo configurar origin | tee.exe 2>nul 1>>"%LOG%" & goto END_ERR )
  echo([OK] Remote origin configurado. | tee.exe 2>nul 1>>"%LOG%"
) else (
  for /f "usebackq tokens=*" %%R in (`git remote get-url origin`) do set "CURR_REMOTE=%%R"
  echo([OK] Remote origin ya existe: %CURR_REMOTE% | tee.exe 2>nul 1>>"%LOG%"
)

REM --- 4) .gitignore ---
if not exist ".gitignore" (
  echo([Paso] Creando .gitignore basico... | tee.exe 2>nul 1>>"%LOG%"
  > ".gitignore" (
    echo Thumbs.db
    echo ~$.xlsx
    echo __pycache__/
    echo *.pyc
    echo data/_tmp_read.xlsx
  )
  echo([OK] .gitignore creado. | tee.exe 2>nul 1>>"%LOG%"
) else (
  echo([Info] .gitignore ya existe. | tee.exe 2>nul 1>>"%LOG%"
)

REM --- 5) Autor DCO ---
for /f "usebackq tokens=*" %%A in (`git config --get user.name 2^>nul`) do set "GUSER=%%A"
for /f "usebackq tokens=*" %%A in (`git config --get user.email 2^>nul`) do set "GMAIL=%%A"
if "%GUSER%"=="" (
  echo([Paso] Configurando git user.name por defecto... | tee.exe 2>nul 1>>"%LOG%"
  git config user.name "FormRecep" >>"%LOG%" 2>&1 || ( echo([ERROR] No se pudo configurar user.name | tee.exe 2>nul 1>>"%LOG%" & goto END_ERR )
)
if "%GMAIL%"=="" (
  echo([Paso] Configurando git user.email por defecto... | tee.exe 2>nul 1>>"%LOG%"
  git config user.email "formrecep@users.noreply.github.com" >>"%LOG%" 2>&1 || ( echo([ERROR] No se pudo configurar user.email | tee.exe 2>nul 1>>"%LOG%" & goto END_ERR )
)
echo([OK] Autor Git listo para DCO. | tee.exe 2>nul 1>>"%LOG%"

REM --- 6) Conectividad ---
echo([Paso] Comprobando conectividad a github.com... | tee.exe 2>nul 1>>"%LOG%"
ping -n 1 github.com >nul 2>&1
if errorlevel 1 (
  echo([AVISO] Ping sin respuesta (no bloquea). | tee.exe 2>nul 1>>"%LOG%"
) else (
  echo([OK] Conectividad OK. | tee.exe 2>nul 1>>"%LOG%"
)

REM --- 7) Remoto accesible ---
echo([Paso] Verificando acceso al remoto (ls-remote)... | tee.exe 2>nul 1>>"%LOG%"
git ls-remote origin >>"%LOG%" 2>&1
if errorlevel 1 (
  echo([AVISO] ls-remote con advertencias (suele ser OK). | tee.exe 2>nul 1>>"%LOG%"
) else (
  echo([OK] Acceso al remoto verificado. | tee.exe 2>nul 1>>"%LOG%"
)

REM --- 8) Add + commit DCO ---
git add -A >>"%LOG%" 2>&1

set "MSG=%*"
if "%MSG%"=="" set "MSG=Auto: actualizacion"

echo([Paso] Commit con sign-off: %MSG% | tee.exe 2>nul 1>>"%LOG%"
git commit -s -m "%MSG%" >>"%LOG%" 2>&1
if errorlevel 1 (
  echo([Info] No hay cambios nuevos para commitear. | tee.exe 2>nul 1>>"%LOG%"
) else (
  echo([OK] Commit realizado con sign-off. | tee.exe 2>nul 1>>"%LOG%"
)

REM --- 9) Pull --rebase ---
echo([Paso] Sincronizando con remoto (pull --rebase)... | tee.exe 2>nul 1>>"%LOG%"
git pull --rebase origin "%BRANCH%" >>"%LOG%" 2>&1
if errorlevel 1 (
  echo([AVISO] Pull con advertencias (primer push o sin upstream). | tee.exe 2>nul 1>>"%LOG%"
) else (
  echo([OK] Pull correcto. | tee.exe 2>nul 1>>"%LOG%"
)

REM --- 10) Push ---
echo([Paso] Subiendo a GitHub... | tee.exe 2>nul 1>>"%LOG%"
git push -u origin "%BRANCH%" >>"%LOG%" 2>&1
if errorlevel 1 (
  echo([ERROR] No se pudo hacer push. Revisa el log: %LOG% | tee.exe 2>nul 1>>"%LOG%"
  goto END_ERR
) else (
  echo([OK] Push realizado a origin/%BRANCH%. | tee.exe 2>nul 1>>"%LOG%"
)

echo(                                      | tee.exe 2>nul 1>>"%LOG%"
echo(====================================== | tee.exe 2>nul 1>>"%LOG%"
echo([OK] Todo subido (DCO aplicado).      | tee.exe 2>nul 1>>"%LOG%"
echo(Log: %LOG%                             | tee.exe 2>nul 1>>"%LOG%"
echo(====================================== | tee.exe 2>nul 1>>"%LOG%"
echo.
pause
endlocal
exit /b 0

:END_ERR
echo(                                      | tee.exe 2>nul 1>>"%LOG%"
echo(====================================== | tee.exe 2>nul 1>>"%LOG%"
echo([ERROR] Hubo problemas. Ver %LOG%      | tee.exe 2>nul 1>>"%LOG%"
echo(====================================== | tee.exe 2>nul 1>>"%LOG%"
echo.
pause
endlocal
exit /b 1

@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

REM ===== Config =====
set "ROOT=%~dp0"
set "BRANCH=main"

REM ===== Version (yyyymmdd_hhmmss) =====
for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set "YY=%%c" & set "MM=%%b" & set "DD=%%a"
for /f "tokens=1-3 delims=:." %%a in ("%time%") do set "HH=%%a" & set "NN=%%b" & set "SS=%%c"
if "%HH:~1,1%"=="" set "HH=0%HH%"
set "VER=%YY%%MM%%DD%_%HH%%NN%%SS%"
echo [+] Versión: %VER%

REM ===== Actualizar ?v= en TODOS los .html de la raíz =====
pushd "%ROOT%"
for %%F in (*.html) do (
  echo [*] Procesando %%F
  powershell -NoProfile -Command "$p='\\?v=\\d{8}_\\d{6}';$f='%%F';if(Test-Path $f){$c=Get-Content $f -Raw; if($c -match $p){$c -replace $p,'?v=%VER%' | Set-Content $f -NoNewline -Encoding UTF8; '  [+] actualizado %%F'} else {'  [=] sin marcador en %%F'}}"
)

REM ===== Git add/commit/push =====
git add -A
git commit -s -m "chore: bump assets v=%VER%" 1>nul 2>nul
git push origin %BRANCH%

popd
echo [OK] Desplegado. Revisa: https://form-recep.pages.dev/?v=%VER%
pause

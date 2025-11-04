@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

REM ===== Config =====
set "ROOT=%~dp0"
set "BRANCH=main"

REM ===== Version (yyyymmdd_hhmmss) =====
for /f "tokens=1-3 delims=/ " %%a in ("%date%") do (set "DD=%%a" & set "MM=%%b" & set "YY=%%c")
for /f "tokens=1-4 delims=:,." %%a in ("%time%") do (set "HH=%%a" & set "NN=%%b" & set "SS=%%c")
if "%HH:~1,1%"=="" set "HH=0%HH%"
set "VER=%YY%%MM%%DD%_%HH%%NN%%SS%"
echo [+] Versi?n: %VER%

pushd "%ROOT%"

REM ===== En TODOS los .html: a?adir o reemplazar ?v= en src/href de (js|css|json|png|jpg|svg) =====
for %%F in (*.html) do (
  echo [*] Procesando %%F
  powershell -NoProfile -Command ^
    "$f='%%F';$c=Get-Content $f -Raw;" ^
    "$rx = '(?i)((?:src|href)=\\x22[^\\x22]+\\.(?:js|css|json|png|jpg|jpeg|svg))(?:\\?v=\\d{8}_\\d{6})?(\\x22)';" ^
    "$nc = [regex]::Replace($c,$rx,{'$1?v=%VER%$2'});" ^
    "Set-Content -Path $f -Value $nc -Encoding UTF8 -NoNewline; '  [+] refs versionadas en %%F';"
)

REM ===== Git add/commit/push =====
git add -A
git commit -s -m "chore: bump assets v=%VER%" 1>nul 2>nul
git push origin %BRANCH%

popd
echo [OK] Desplegado. Verifica: https://form-recep.pages.dev/?v=%VER%
pause

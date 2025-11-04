@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

REM ===== Config =====
set "ROOT=%~dp0"
set "BRANCH=main"
REM timestamp yyyymmdd_hhmmss
for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set "YY=%%c" & set "MM=%%b" & set "DD=%%a"
for /f "tokens=1-3 delims=:." %%a in ("%time%") do set "HH=%%a" & set "NN=%%b" & set "SS=%%c"
if "%HH:~1,1%"=="" set "HH=0%HH%"
set "VER=%YY%%MM%%DD%_%HH%%NN%%SS%"

echo [+] Versión: %VER%

REM ===== Actualizar ?v= en HTMLs si existe el patrón =====
set "FILES=index.html"
for %%F in (%FILES%) do (
  if exist "%%F" (
    powershell -NoProfile -Command "$p='\\?v=\\d{8}_\\d{6}';$f='%%F';$c=Get-Content $f -Raw;if($c -match $p){$c -replace $p,'?v=%VER%' | Set-Content $f -NoNewline -Encoding UTF8;Write-Output ('[+] actualizado ' + $f)}else{Write-Output ('[=] sin marcador en ' + $f)}"
  )
)

REM ===== Git add/commit/push =====
git -C "%ROOT%" add -A
git -C "%ROOT%" commit -s -m "chore: bump assets v=%VER%" 1>nul 2>nul
git -C "%ROOT%" push origin %BRANCH%

echo [OK] Desplegado. URL (si aplica): https://nataliogc.github.io/Form.Recep/?v=%VER%
pause

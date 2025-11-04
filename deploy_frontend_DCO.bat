@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
set "ROOT=%~dp0"
set "BRANCH=main"
set "VER=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "VER=!VER: =0!"
powershell -NoProfile -Command "(Get-Content '%ROOT%index.html') -replace '\?v=\d+','?v=%VER%' | Set-Content '%ROOT%index.html'"
git -C "%ROOT%" add -A
git -C "%ROOT%" commit -s -m "chore: bump assets v=%VER%" 1>nul 2>nul
git -C "%ROOT%" push origin %BRANCH%
echo https://nataliogc.github.io/Form.Recep/?v=%VER%
pause

:: build_and_deploy_DCO.bat
@echo off
setlocal ENABLEDELAYEDEXPANSION

:: === CONFIG ===
set "REPO=C:\Users\comun\Documents\Web Test"
set "PY=python"
set "MSG=build: regenerate pools + index.json (DCO)"

:: 0) Ir al repo (evita -C con comillas)
pushd "%REPO%" || (echo [ERR] No existe %REPO% & exit /b 1)

:: 1) Generar JSON desde Excel (opcional; comenta si no lo usas)
if exist "tools\xlsx_to_json_single_FIXED.py" (
  echo [INFO] Generando pools/index desde Excel...
  "%PY%" "tools\xlsx_to_json_single_FIXED.py" || (echo [ERR] Python fallo & popd & exit /b 1)
) else (
  echo [WARN] No existe tools\xlsx_to_json_single_FIXED.py, salto paso Python
)

:: 2) Git: asegurar repo OK
git rev-parse --is-inside-work-tree >NUL 2>&1 || (echo [ERR] No es un repo Git & popd & exit /b 1)

:: Limpiar bloqueos anteriores
if exist ".git\index.lock" del /q ".git\index.lock"
if exist ".git\rebase-apply" rmdir /s /q ".git\rebase-apply"
if exist ".git\rebase-merge" rmdir /s /q ".git\rebase-merge"

:: 3) Traer remoto y quedar en main actualizada
git fetch origin || (echo [ERR] fetch & popd & exit /b 1)
git switch main || git switch -c main origin/main || (echo [ERR] switch main & popd & exit /b 1)
git pull --rebase origin main || (echo [ERR] pull --rebase & popd & exit /b 1)

:: 4) Añadir cambios y commitear con DCO
git add -A
git diff --cached --quiet && (
  echo [INFO] No hay cambios que subir.
) || (
  git commit -s -m "%MSG%" || (echo [ERR] commit & popd & exit /b 1)
)

:: 5) Publicar
git push origin main || (echo [ERR] push & popd & exit /b 1)

echo [OK] Deploy a GitHub Pages lanzado. Forzar recarga con Ctrl+F5 en:
echo      https://nataliogc.github.io/Form.Recep/?v=%DATE:~6,4%%DATE:~3,2%%DATE:~0,2%_%TIME:~0,2%%TIME:~3,2%
popd
exit /b 0

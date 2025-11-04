@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0"
set "TOOLS=%ROOT%tools"
set "EXCEL=%ROOT%plantilla_preguntas_unica.xlsx"
set "BRANCH=main"

REM Detecta Python
set "PYCMD=py -3"
%PYCMD% -c "print('ok')" 1>nul 2>nul || ( set "PYCMD=python" )
%PYCMD% -c "print('ok')" 1>nul 2>nul || ( echo Python no encontrado & exit /b 1 )

REM Generar data/ si hay Excel
if exist "%EXCEL%" (
  pushd "%TOOLS%"
  %PYCMD% "xlsx_to_json_single_FIXED.py" --xlsx "%EXCEL%"
  if errorlevel 1 ( echo Error generando JSON & popd & exit /b 1 )
  popd
)

REM Commit + push (DCO)
git -C "%ROOT%" fetch origin
git -C "%ROOT%" checkout %BRANCH% 2>nul
git -C "%ROOT%" pull --rebase origin %BRANCH%
git -C "%ROOT%" add -A
git -C "%ROOT%" commit -s -m "chore: publish (%date% %time%)" 1>nul 2>nul
git -C "%ROOT%" push origin %BRANCH%

echo Hecho. Revisa GitHub Pages.
exit /b 0

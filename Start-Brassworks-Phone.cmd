@echo off
setlocal
cd /d "%~dp0"
set "BRASSWORKS_NODE="
for /d %%D in ("%~dp0.tools\node-v24.*-win-*") do if exist "%%D\node.exe" set "BRASSWORKS_NODE=%%D\node.exe"
if not defined BRASSWORKS_NODE (
  echo Run scripts\setup-local.ps1 in PowerShell first.
  pause
  exit /b 1
)
"%BRASSWORKS_NODE%" "%~dp0scripts\local-run.mjs" --lan --open
if errorlevel 1 pause

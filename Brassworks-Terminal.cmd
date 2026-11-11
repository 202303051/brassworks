@echo off
setlocal
cd /d "%~dp0"
set "BRASSWORKS_RUNTIME="
for /d %%D in ("%~dp0.tools\node-v24.*-win-*") do if exist "%%D\npm.cmd" set "BRASSWORKS_RUNTIME=%%D"
if not defined BRASSWORKS_RUNTIME (
  echo Run scripts\setup-local.ps1 in PowerShell first.
  pause
  exit /b 1
)
set "PATH=%BRASSWORKS_RUNTIME%;%PATH%"
set "NODE_USE_SYSTEM_CA=1"
echo Brassworks terminal. Use npm run dev, npm run check, or npm run build.
cmd /k

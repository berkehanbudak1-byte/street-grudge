@echo off
setlocal EnableExtensions DisableDelayedExpansion
title STREET GRUDGE — Baslatiliyor...
set "SCRIPT_DIR=%~dp0"
set "TARGET_FILE=%SCRIPT_DIR%index.html"
if not exist "%TARGET_FILE%" (
  echo Error: index.html not found.
  exit /b 1
)
start "" "%TARGET_FILE%"
endlocal
exit /b 0

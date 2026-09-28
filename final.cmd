@echo off
rem The full local gate: verify.cmd (format, lint, typecheck, test, build) plus the
rem live smoke test in smoke.ps1. All artifacts go to %TEMP%\todo-app-smoke.
cd /d "%~dp0"
call "%~dp0verify.cmd"
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0smoke.ps1"
echo PIPELINE_DONE

@echo off
rem Local verification pipeline: format, format:check, typecheck, lint, test, build
rem (see AGENTS.md -> Workflow and definition of done).
rem The log lives in %TEMP% so the repository root stays clean.
cd /d "%~dp0"
set "OUTDIR=%TEMP%\todo-app-smoke"
if not exist "%OUTDIR%" mkdir "%OUTDIR%"
set "LOG=%OUTDIR%\verify.log"
echo === format === > "%LOG%"
call npm run format >> "%LOG%" 2>&1
echo EXIT=%ERRORLEVEL% >> "%LOG%"
echo === format:check === >> "%LOG%"
call npm run format:check >> "%LOG%" 2>&1
echo EXIT=%ERRORLEVEL% >> "%LOG%"
echo === typecheck === >> "%LOG%"
call npm run typecheck >> "%LOG%" 2>&1
echo EXIT=%ERRORLEVEL% >> "%LOG%"
echo === lint === >> "%LOG%"
call npm run lint >> "%LOG%" 2>&1
echo EXIT=%ERRORLEVEL% >> "%LOG%"
echo === test === >> "%LOG%"
call npm test >> "%LOG%" 2>&1
echo EXIT=%ERRORLEVEL% >> "%LOG%"
echo === build === >> "%LOG%"
call npm run build >> "%LOG%" 2>&1
echo EXIT=%ERRORLEVEL% >> "%LOG%"
echo ALL_DONE >> "%LOG%"
echo log: %LOG%
type "%LOG%"

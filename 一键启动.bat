@echo off
title Totoro Paradise

echo Starting Totoro Paradise...

if not exist "node_modules" pnpm install

start /B pnpm dev

timeout /t 6 /nobreak >nul

start http://localhost:3000

echo.
echo Server running at: http://localhost:3000
echo Close this window to stop the server
echo.

pause >nul
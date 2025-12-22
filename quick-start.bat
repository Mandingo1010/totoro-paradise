@echo off
chcp 65001 >nul
title Totoro Paradise

echo Starting Totoro Paradise...

REM Check and install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    pnpm install
)

REM Start server and open browser
echo Starting server...
start /B pnpm dev

REM Wait for server to start
echo Waiting for server to start...
timeout /t 6 /nobreak >nul

REM Open browser
echo Opening browser...
start http://localhost:3000

REM Display info
echo.
echo Server started successfully!
echo Access URL: http://localhost:3000
echo Close this window to stop the server
echo.

REM Keep window open
:loop
timeout /t 30 /nobreak >nul
goto loop
@echo off
title Totoro Paradise

if not exist "node_modules" (
    echo Installing dependencies...
    pnpm install
)

echo Starting server...
start /B cmd /c "pnpm dev"

echo Waiting for server...
timeout /t 6 /nobreak >nul

echo Opening browser...
start http://localhost:3000

echo.
echo Server is running at: http://localhost:3000
echo Close this window to stop the server
echo.
pause
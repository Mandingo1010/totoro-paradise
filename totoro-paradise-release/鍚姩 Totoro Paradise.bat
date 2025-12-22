@echo off
chcp 65001 >nul
title Totoro Paradise - 闃冲厜璺戞鍔╂墜

echo.
echo 鈺斺晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晽
echo 鈺?                   馃Λ Totoro Paradise                        鈺?
echo 鈺?                    闃冲厜璺戞鍔╂墜                              鈺?
echo 鈺?                   渚挎惡鐗?v2.0.4                             鈺?
echo 鈺氣晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨暆
echo.

echo 馃殌 鍚姩鏈嶅姟鍣?..

REM 妫€鏌?Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo 鉂?閿欒: 鏈娴嬪埌 Node.js
    echo.
    echo 馃挕 璇峰厛瀹夎 Node.js:
    echo    1. 璁块棶 https://nodejs.org
    echo    2. 涓嬭浇骞跺畨瑁?LTS 鐗堟湰
    echo    3. 閲嶆柊杩愯姝ょ▼搴?
    echo.
    pause
    exit /b 1
)

echo 鉁?Node.js 宸插畨瑁?

REM 鍚姩鏈嶅姟鍣?
echo 馃寪 鍚姩 Totoro Paradise...
start /B node .output/server/index.mjs

REM 绛夊緟鏈嶅姟鍣ㄥ惎鍔?
echo 鈴?绛夊緟鏈嶅姟鍣ㄥ惎鍔?..
timeout /t 3 /nobreak >nul

REM 鎵撳紑娴忚鍣?
echo 馃寪 鎵撳紑娴忚鍣?..
start http://localhost:3000

echo.
echo 鉁?鍚姩瀹屾垚锛?
echo 馃搷 璁块棶鍦板潃: http://localhost:3000
echo 鈿狅笍  鍏抽棴姝ょ獥鍙ｅ皢鍋滄鏈嶅姟鍣?
echo.
echo 馃挕 浣跨敤璇存槑:
echo    - 闃冲厜璺? 鍥哄畾璺嚎璺戞妯℃嫙
echo    - 鑷敱璺? 鑷畾涔夎窛绂诲拰鏃堕棿
echo    - 璁板綍鏌ョ湅: 鏌ョ湅鍘嗗彶璺戞璁板綍
echo.

REM 淇濇寔绐楀彛鎵撳紑
:loop
timeout /t 30 /nobreak >nul
goto loop

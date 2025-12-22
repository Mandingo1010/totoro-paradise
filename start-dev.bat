@echo off
chcp 65001 >nul
title Totoro Paradise 开发服务器

echo 🦫 启动 Totoro Paradise 开发服务器...

REM 检查 pnpm 是否安装
pnpm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: pnpm 未安装
    echo 请先安装 pnpm: npm install -g pnpm
    pause
    exit /b 1
)

REM 检查依赖是否安装
if not exist "node_modules" (
    echo 📦 安装项目依赖...
    pnpm install
)

REM 启动开发服务器
echo 🚀 启动开发服务器...
echo 访问地址: http://localhost:3000
echo 按 Ctrl+C 停止服务器
echo.

REM 在后台启动服务器并等待
echo ⏳ 等待服务器启动...
start /B pnpm dev

REM 等待5秒让服务器启动
timeout /t 5 /nobreak >nul

REM 打开浏览器
echo 🌐 正在打开浏览器...
start http://localhost:3000

REM 保持窗口打开
echo.
echo 服务器正在运行中...
echo 关闭此窗口将停止服务器
pause >nul
@echo off
chcp 65001 >nul
title 🦫 Totoro Paradise - 阳光跑步助手

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    🦫 Totoro Paradise                        ║
echo ║                     阳光跑步助手                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM 检查 pnpm 是否安装
echo [1/4] 🔍 检查环境...
pnpm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: pnpm 未安装
    echo 💡 请先安装 pnpm: npm install -g pnpm
    echo.
    pause
    exit /b 1
)
echo ✅ pnpm 已安装

REM 检查依赖是否安装
echo [2/4] 📦 检查依赖...
if not exist "node_modules" (
    echo 📥 正在安装项目依赖，请稍候...
    pnpm install
    if errorlevel 1 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
)
echo ✅ 依赖已就绪

REM 启动开发服务器
echo [3/4] 🚀 启动开发服务器...
echo.
echo 📍 本地地址: http://localhost:3000
echo 🛠️  开发工具: 按 Shift + Alt + D
echo ⚠️  停止服务: 关闭此窗口或按 Ctrl+C
echo.

REM 使用 PowerShell 启动服务器并自动打开浏览器
powershell -Command "& {
    Write-Host '[4/4] 🌐 准备打开浏览器...' -ForegroundColor Cyan;
    $job = Start-Job -ScriptBlock { 
        Set-Location '%CD%'; 
        pnpm dev --open 
    };
    Start-Sleep -Seconds 3;
    Write-Host '✅ 正在打开浏览器...' -ForegroundColor Green;
    Start-Process 'http://localhost:3000';
    Receive-Job -Job $job -Wait;
}"

echo.
echo 👋 感谢使用 Totoro Paradise！
pause
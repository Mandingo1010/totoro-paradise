@echo off
chcp 65001 >nul
title Totoro Paradise - 阳光跑步助手

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    🦫 Totoro Paradise                        ║
echo ║                     阳光跑步助手                              ║
echo ║                    v2.0.4 便携版                             ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM 检查 Node.js
echo [1/3] 🔍 检查运行环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未检测到 Node.js
    echo.
    echo 💡 请先安装 Node.js:
    echo    1. 访问 https://nodejs.org
    echo    2. 下载并安装 LTS 版本 ^(推荐 18.x 或 20.x^)
    echo    3. 重新运行此程序
    echo.
    pause
    exit /b 1
)
echo ✅ Node.js 环境正常

REM 检查依赖
echo [2/3] 📦 检查项目依赖...
if not exist "node_modules" (
    echo 📥 正在安装项目依赖，请稍候...
    pnpm install
    if errorlevel 1 (
        echo ❌ 依赖安装失败，请检查网络连接
        pause
        exit /b 1
    )
)
echo ✅ 项目依赖完整

REM 启动服务器
echo [3/3] 🚀 启动服务器...
echo.
echo 📍 本地地址: http://localhost:3000
echo 🛠️  开发工具: 按 Shift + Alt + D
echo ⚠️  停止服务: 关闭此窗口
echo.

REM 启动服务器
start /B pnpm dev

REM 等待服务器启动
echo ⏳ 等待服务器启动...
timeout /t 5 /nobreak >nul

REM 打开浏览器
echo 🌐 正在打开浏览器...
start http://localhost:3000

echo.
echo ✅ 启动完成！
echo.
echo 💡 使用说明:
echo    - 阳光跑: 固定路线跑步模拟
echo    - 自由跑: 自定义距离和时间
echo    - 记录查看: 查看历史跑步记录
echo.
echo 📞 如需帮助，请访问: https://github.com/Mandingo1010/totoro-paradise
echo.

REM 保持窗口打开
:loop
timeout /t 30 /nobreak >nul
goto loop
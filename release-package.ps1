# Totoro Paradise Release Package Creator
# 创建便携式发布包

$releaseDir = "totoro-paradise-release"
$version = "v2.0.4"

Write-Host "🦫 创建 Totoro Paradise Release 包..." -ForegroundColor Green

# 创建发布目录
if (Test-Path $releaseDir) {
    Remove-Item -Recurse -Force $releaseDir
}
New-Item -ItemType Directory -Path $releaseDir | Out-Null

# 复制必要文件
Write-Host "📦 复制文件..." -ForegroundColor Yellow

# 复制构建输出
Copy-Item -Recurse ".output" "$releaseDir/.output"

# 复制package.json (只包含运行时依赖)
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$runtimePackage = @{
    name = $packageJson.name
    version = $packageJson.version
    type = $packageJson.type
    scripts = @{
        start = $packageJson.scripts.start
    }
}
$runtimePackage | ConvertTo-Json -Depth 10 | Out-File "$releaseDir/package.json" -Encoding UTF8

# 复制其他必要文件
Copy-Item "README.md" "$releaseDir/"
Copy-Item "LICENSE" "$releaseDir/"

# 创建启动脚本
Write-Host "🚀 创建启动脚本..." -ForegroundColor Cyan

# Windows 批处理启动脚本
$startBat = @'
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

REM 启动服务器
echo [2/3] 🚀 启动服务器...
echo.
echo 📍 本地地址: http://localhost:3000
echo 🛠️  开发工具: 按 Shift + Alt + D
echo ⚠️  停止服务: 关闭此窗口
echo.

REM 启动服务器
start /B node .output/server/index.mjs

REM 等待服务器启动
echo [3/3] ⏳ 等待服务器启动...
timeout /t 3 /nobreak >nul

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
'@

$startBat | Out-File "$releaseDir/启动 Totoro Paradise.bat" -Encoding UTF8

# 创建使用说明
$readme = @'
# 🦫 Totoro Paradise - 阳光跑步助手 (便携版)

## 📖 快速开始

### 1️⃣ 系统要求
- Windows 10/11
- Node.js 16+ (如未安装，程序会提示下载)

### 2️⃣ 启动方法
双击 `启动 Totoro Paradise.bat` 文件即可！

### 3️⃣ 使用步骤
1. 双击启动文件
2. 等待浏览器自动打开
3. 在网页中使用各项功能

## 🎯 主要功能

### 🏃‍♂️ 阳光跑 (Sun Run)
- 适用于学校固定路线的跑步要求
- 自动生成符合要求的跑步轨迹
- 支持多种学校和路线

### 🆓 自由跑 (Free Run)
- **自定义距离**: 0.5-20公里任意设置
- **灵活配速**: 3-25公里/小时速度范围
- **预设模板**: 
  - 🚶 轻松跑 (3公里, 6-8km/h)
  - 🏃 标准跑 (5公里, 8-12km/h)  
  - 🏃‍♂️ 挑战跑 (10公里, 10-15km/h)
- **批量执行**: 支持1-10次连续提交
- **智能间隔**: 1-60分钟自定义间隔时间

### 📊 记录管理
- 查看所有跑步历史记录
- 按日期、类型筛选
- 导出记录数据

## 🔧 常见问题

### Q: 提示"未检测到 Node.js"怎么办？
A: 
1. 访问 https://nodejs.org
2. 下载 LTS 版本 (推荐 18.x 或 20.x)
3. 安装后重新启动程序

### Q: 浏览器没有自动打开？
A: 手动打开浏览器访问 http://localhost:3000

### Q: 端口被占用怎么办？
A: 重启电脑或结束占用 3000 端口的其他程序

### Q: 如何停止程序？
A: 关闭黑色命令行窗口即可

## ⚠️ 重要提醒

1. **仅供学习研究**: 本工具仅用于技术学习和研究
2. **合规使用**: 请遵守学校相关规定，不要用于作弊
3. **风险自担**: 使用本工具的任何后果由用户自行承担

## 📞 技术支持

如遇问题，请访问项目主页获取帮助：
https://github.com/Mandingo1010/totoro-paradise

---
💝 感谢使用 Totoro Paradise！
'@

$readme | Out-File "$releaseDir/使用说明.md" -Encoding UTF8

Write-Host "✅ Release 包创建完成: $releaseDir" -ForegroundColor Green

# 创建压缩包
Write-Host "📦 创建压缩包..." -ForegroundColor Yellow
$zipPath = "totoro-paradise-$version-windows.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath
}

Compress-Archive -Path "$releaseDir/*" -DestinationPath $zipPath
Write-Host "✅ 压缩包已创建: $zipPath" -ForegroundColor Green

$zipSize = (Get-Item $zipPath).Length / 1MB
Write-Host "📊 压缩包大小: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Cyan
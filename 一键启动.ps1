#!/usr/bin/env pwsh
# Totoro Paradise 一键启动脚本

$Host.UI.RawUI.WindowTitle = "Totoro Paradise"

Write-Host "🦫 启动 Totoro Paradise..." -ForegroundColor Green

# 检查依赖
if (!(Test-Path "node_modules")) {
    Write-Host "📦 安装依赖..." -ForegroundColor Yellow
    pnpm install
}

# 启动服务器
Write-Host "🚀 启动服务器..." -ForegroundColor Cyan
$process = Start-Process -FilePath "pnpm" -ArgumentList "dev" -PassThru -WindowStyle Hidden

# 等待服务器启动
Write-Host "⏳ 等待服务器启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 6

# 打开浏览器
Write-Host "🌐 打开浏览器..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "✅ 启动完成！" -ForegroundColor Green
Write-Host "📍 访问地址: http://localhost:3000" -ForegroundColor Cyan
Write-Host "⚠️  按任意键停止服务器..." -ForegroundColor Yellow

# 等待用户输入
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# 停止服务器
Write-Host "🛑 正在停止服务器..." -ForegroundColor Red
Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
Write-Host "👋 服务器已停止" -ForegroundColor Green
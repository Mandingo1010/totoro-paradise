#!/usr/bin/env pwsh
# Totoro Paradise 开发服务器启动脚本

Write-Host "🦫 启动 Totoro Paradise 开发服务器..." -ForegroundColor Green

# 检查 pnpm 是否安装
if (!(Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 错误: pnpm 未安装" -ForegroundColor Red
    Write-Host "请先安装 pnpm: npm install -g pnpm" -ForegroundColor Yellow
    Read-Host "按回车键退出"
    exit 1
}

# 检查依赖是否安装
if (!(Test-Path "node_modules")) {
    Write-Host "📦 安装项目依赖..." -ForegroundColor Yellow
    pnpm install
}

# 启动开发服务器
Write-Host "🚀 启动开发服务器..." -ForegroundColor Cyan
Write-Host "访问地址: http://localhost:3000" -ForegroundColor Green
Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Yellow
Write-Host ""

# 在后台启动开发服务器
$job = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    pnpm dev
}

# 等待服务器启动（等待5秒）
Write-Host "⏳ 等待服务器启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 打开浏览器
Write-Host "🌐 正在打开浏览器..." -ForegroundColor Cyan
Start-Process "http://localhost:3000"

# 显示服务器输出
Receive-Job -Job $job -Wait
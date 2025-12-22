# Totoro Paradise 一键启动脚本

$Host.UI.RawUI.WindowTitle = "Totoro Paradise"

Write-Host "Starting Totoro Paradise..." -ForegroundColor Green

# 检查依赖
if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    pnpm install
}

# 启动服务器
Write-Host "Starting server..." -ForegroundColor Cyan

# 使用后台作业启动服务器
$job = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    pnpm dev
}

# 等待服务器启动
Write-Host "Waiting for server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 6

# 打开浏览器
Write-Host "Opening browser..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "Server started successfully!" -ForegroundColor Green
Write-Host "Access URL: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Press any key to stop the server..." -ForegroundColor Yellow

# 等待用户输入
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# 停止服务器
Write-Host "Stopping server..." -ForegroundColor Red
Stop-Job -Job $job -PassThru | Remove-Job -Force
Write-Host "Server stopped" -ForegroundColor Green
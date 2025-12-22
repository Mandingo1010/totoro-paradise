# Totoro Paradise 部署脚本 (Windows PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "🚀 开始部署 Totoro Paradise..." -ForegroundColor Green

# 检查 Docker 是否安装
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker 未安装，请先安装 Docker Desktop" -ForegroundColor Red
    exit 1
}

# 检查 Docker Compose 是否可用
if (!(Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker Compose 未安装，请先安装 Docker Compose" -ForegroundColor Red
    exit 1
}

# 停止现有容器
Write-Host "🛑 停止现有容器..." -ForegroundColor Yellow
docker-compose down 2>$null

# 清理旧镜像（可选）
$cleanOld = Read-Host "是否清理旧镜像？(y/N)"
if ($cleanOld -eq 'y' -or $cleanOld -eq 'Y') {
    Write-Host "🧹 清理旧镜像..." -ForegroundColor Yellow
    docker image prune -f
    docker rmi totoro-paradise:latest 2>$null
}

# 构建新镜像
Write-Host "🔨 构建 Docker 镜像..." -ForegroundColor Cyan
docker-compose build --no-cache

# 启动服务
Write-Host "🚀 启动服务..." -ForegroundColor Green
docker-compose up -d

# 等待服务启动
Write-Host "⏳ 等待服务启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 检查服务状态
Write-Host "🔍 检查服务状态..." -ForegroundColor Cyan
docker-compose ps

# 检查健康状态
Write-Host "❤️ 检查应用健康状态..." -ForegroundColor Magenta
$maxAttempts = 30
$success = $false

for ($i = 1; $i -le $maxAttempts; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/" -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ 应用启动成功！" -ForegroundColor Green
            Write-Host "🌐 访问地址: http://localhost:3000" -ForegroundColor Cyan
            $success = $true
            break
        }
    }
    catch {
        Write-Host "等待应用启动... ($i/$maxAttempts)" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

if (-not $success) {
    Write-Host "❌ 应用启动失败，请检查日志:" -ForegroundColor Red
    Write-Host "docker-compose logs totoro-paradise" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🎉 部署完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📋 常用命令:" -ForegroundColor Cyan
Write-Host "  查看日志: docker-compose logs -f totoro-paradise"
Write-Host "  停止服务: docker-compose down"
Write-Host "  重启服务: docker-compose restart"
Write-Host "  查看状态: docker-compose ps"
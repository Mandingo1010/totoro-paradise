#!/bin/bash

# Totoro Paradise 部署脚本
set -e

echo "🚀 开始部署 Totoro Paradise..."

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 停止现有容器
echo "🛑 停止现有容器..."
docker-compose down || true

# 清理旧镜像（可选）
read -p "是否清理旧镜像？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 清理旧镜像..."
    docker image prune -f
    docker rmi totoro-paradise:latest || true
fi

# 构建新镜像
echo "🔨 构建 Docker 镜像..."
docker-compose build --no-cache

# 启动服务
echo "🚀 启动服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose ps

# 检查健康状态
echo "❤️ 检查应用健康状态..."
for i in {1..30}; do
    if curl -f http://localhost:3000/ > /dev/null 2>&1; then
        echo "✅ 应用启动成功！"
        echo "🌐 访问地址: http://localhost:3000"
        break
    else
        echo "等待应用启动... ($i/30)"
        sleep 2
    fi
done

if ! curl -f http://localhost:3000/ > /dev/null 2>&1; then
    echo "❌ 应用启动失败，请检查日志:"
    echo "docker-compose logs totoro-paradise"
    exit 1
fi

echo "🎉 部署完成！"
echo ""
echo "📋 常用命令:"
echo "  查看日志: docker-compose logs -f totoro-paradise"
echo "  停止服务: docker-compose down"
echo "  重启服务: docker-compose restart"
echo "  查看状态: docker-compose ps"
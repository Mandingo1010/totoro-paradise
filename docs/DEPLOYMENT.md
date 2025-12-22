# Totoro Paradise 部署指南

本文档提供了 Totoro Paradise 项目的完整部署指南，包括 Docker 部署和手动部署两种方式。

## 目录

- [前置要求](#前置要求)
- [Docker 部署（推荐）](#docker-部署推荐)
- [手动部署](#手动部署)
- [环境变量配置](#环境变量配置)
- [常见问题](#常见问题)

## 前置要求

### Docker 部署
- Docker 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用内存
- 至少 5GB 可用磁盘空间

### 手动部署
- Node.js 18+ (LTS 版本)
- pnpm 8.15.5+
- 至少 2GB 可用内存

## Docker 部署（推荐）

### 方式一：使用部署脚本（最简单）

#### Windows (PowerShell)
```powershell
# 运行部署脚本
.\deploy.ps1
```

#### Linux/macOS
```bash
# 添加执行权限
chmod +x deploy.sh

# 运行部署脚本
./deploy.sh
```

### 方式二：使用 Docker Compose

```bash
# 1. 构建镜像
docker-compose build

# 2. 启动服务
docker-compose up -d

# 3. 查看日志
docker-compose logs -f totoro-paradise

# 4. 检查状态
docker-compose ps
```

### 方式三：使用 Docker 命令

```bash
# 1. 构建镜像
docker build -t totoro-paradise:latest .

# 2. 运行容器
docker run -d \
  --name totoro-paradise \
  -p 3000:3000 \
  --restart unless-stopped \
  totoro-paradise:latest

# 3. 查看日志
docker logs -f totoro-paradise

# 4. 停止容器
docker stop totoro-paradise

# 5. 删除容器
docker rm totoro-paradise
```

## 手动部署

### 1. 安装依赖

```bash
# 启用 pnpm
corepack enable pnpm

# 安装依赖
pnpm install --frozen-lockfile
```

### 2. 构建项目

```bash
# 构建生产版本
pnpm run build
```

### 3. 启动服务

```bash
# 启动生产服务器
pnpm start
```

### 4. 使用 PM2 管理进程（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 使用 PM2 启动
pm2 start ecosystem.config.cjs

# 查看状态
pm2 status

# 查看日志
pm2 logs totoro-paradise

# 重启服务
pm2 restart totoro-paradise

# 停止服务
pm2 stop totoro-paradise

# 设置开机自启
pm2 startup
pm2 save
```

## 环境变量配置

创建 `.env.production` 文件并配置以下变量：

```env
# 基础配置
NODE_ENV=production
NUXT_HOST=0.0.0.0
NUXT_PORT=3000

# 如果需要，添加其他环境变量
# DATABASE_URL=your_database_url
# API_BASE_URL=your_api_url
# SECRET_KEY=your_secret_key
```

## Docker 常用命令

### 查看日志
```bash
# 实时查看日志
docker-compose logs -f totoro-paradise

# 查看最近 100 行日志
docker-compose logs --tail=100 totoro-paradise
```

### 重启服务
```bash
# 重启容器
docker-compose restart totoro-paradise

# 重新构建并重启
docker-compose up -d --build
```

### 停止和删除
```bash
# 停止服务
docker-compose stop

# 停止并删除容器
docker-compose down

# 停止并删除容器、网络、卷
docker-compose down -v
```

### 进入容器
```bash
# 进入容器 shell
docker-compose exec totoro-paradise sh

# 或使用 docker 命令
docker exec -it totoro-paradise sh
```

### 清理资源
```bash
# 清理未使用的镜像
docker image prune -f

# 清理所有未使用的资源
docker system prune -a
```

## 性能优化

### 1. 内存限制

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  totoro-paradise:
    # ... 其他配置
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

### 2. 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. 启用 HTTPS

使用 Let's Encrypt 和 Certbot：

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com
```

## 监控和日志

### 健康检查

应用提供了健康检查端点：

```bash
# 检查应用是否运行
curl http://localhost:3000/

# 使用 Docker 健康检查
docker inspect --format='{{.State.Health.Status}}' totoro-paradise
```

### 日志管理

```bash
# 查看实时日志
docker-compose logs -f

# 导出日志到文件
docker-compose logs > logs.txt

# 使用 PM2 查看日志（手动部署）
pm2 logs totoro-paradise
```

## 常见问题

### 1. 端口被占用

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/macOS
lsof -i :3000
kill -9 <PID>
```

### 2. Docker 构建失败

```bash
# 清理 Docker 缓存
docker builder prune -a

# 重新构建（不使用缓存）
docker-compose build --no-cache
```

### 3. 容器无法启动

```bash
# 查看详细日志
docker-compose logs totoro-paradise

# 检查容器状态
docker-compose ps

# 进入容器调试
docker-compose exec totoro-paradise sh
```

### 4. 内存不足

```bash
# 增加 Docker 内存限制
# 在 Docker Desktop 设置中调整内存分配

# 或在 docker-compose.yml 中调整资源限制
```

### 5. 应用无法访问

- 检查防火墙设置
- 确认端口映射正确
- 检查容器是否正常运行
- 查看应用日志

## 更新部署

### 使用 Docker

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建并部署
docker-compose up -d --build

# 3. 清理旧镜像
docker image prune -f
```

### 手动部署

```bash
# 1. 拉取最新代码
git pull

# 2. 安装新依赖
pnpm install

# 3. 重新构建
pnpm run build

# 4. 重启服务
pm2 restart totoro-paradise
```

## 备份和恢复

### 备份数据

```bash
# 备份容器数据
docker-compose exec totoro-paradise tar czf /tmp/backup.tar.gz /app/data

# 复制到主机
docker cp totoro-paradise:/tmp/backup.tar.gz ./backup.tar.gz
```

### 恢复数据

```bash
# 复制到容器
docker cp ./backup.tar.gz totoro-paradise:/tmp/

# 解压
docker-compose exec totoro-paradise tar xzf /tmp/backup.tar.gz -C /
```

## 安全建议

1. 使用环境变量管理敏感信息
2. 定期更新依赖包
3. 启用 HTTPS
4. 配置防火墙规则
5. 定期备份数据
6. 监控应用日志
7. 使用非 root 用户运行容器（已在 Dockerfile 中配置）

## 生产环境检查清单

- [ ] 已配置所有必需的环境变量
- [ ] 已设置合适的资源限制
- [ ] 已配置 HTTPS
- [ ] 已设置日志轮转
- [ ] 已配置监控和告警
- [ ] 已设置自动备份
- [ ] 已测试健康检查
- [ ] 已配置防火墙规则
- [ ] 已设置容器自动重启
- [ ] 已准备回滚方案

## 支持

如有问题，请查看：
- [项目 README](../README.md)
- [API 逆向工程文档](./API-REVERSE-ENGINEERING.md)
- [测试检查清单](./TESTING-CHECKLIST.md)
- [GitHub Issues](https://github.com/your-repo/issues)

---

最后更新：2024-12-21
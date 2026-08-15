# PromptForge Docker Compose 部署

当前部署方案把前端、后端和 Nginx 放在同一台 Ubuntu 24.04 ECS 上：只有 Nginx 发布宿主机的 80/443 端口，前端和后端只通过 Compose 内部网络通信。

## 1. 服务器准备

在服务器上安装 Docker Engine 和 Docker Compose Plugin，然后确认：

```bash
docker --version
docker compose version
```

安全组只需要保留：

- TCP 22：SSH
- TCP 80：HTTP / ACME 验证
- TCP 443：HTTPS

不要把 3000、7001 或数据库端口发布到公网。

## 2. 上传项目并配置环境变量

把整个仓库上传到服务器，例如 `/opt/promptforge`，然后执行：

```bash
cd /opt/promptforge
cp backend/.env.example backend/.env
nano backend/.env
```

至少需要根据实际使用的模型填写：

- `MAIN_MODEL_PROVIDER=gpt` 时填写 `OPENAI_API_KEY`、`OPENAI_MODEL`，必要时调整 `OPENAI_BASE_URL`。
- `MAIN_MODEL_PROVIDER=deepseek` 时填写 `DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL`，必要时调整 `DEEPSEEK_BASE_URL`。

真实 API Key 只放在服务器上的 `backend/.env`，不要提交到 Git、不要写入 Dockerfile，也不要把它复制到聊天中。若只想验证页面和容器连通性，可临时设置 `MOCK_MODE=true`；正式使用模型时改回 `false`。

## 3. 域名解析

在阿里云域名解析中添加：

```text
记录类型：A
主机记录：promptforge
记录值：47.97.98.39
```

解析生效后，`promptforge.pjhao.xyz` 会指向这台 ECS。当前方案不需要 Sites 的 CNAME 或 TXT 记录。

## 4. 本地构建镜像并上传到 ECS

这台 ECS 只有 2 vCPU 和约 2 GiB 内存，推荐在本地 Docker Desktop 构建镜像，服务器只负责加载镜像和运行容器。下面的命令在 Windows PowerShell 中执行。

先启动 Docker Desktop，然后在项目根目录执行：

```powershell
Set-Location "C:\path\to\promptFormat"

docker compose build backend frontend nginx

docker save --output .\promptforge-images.tar `
  promptforge-backend:latest `
  promptforge-frontend:latest `
  promptforge-nginx:latest

scp .\promptforge-images.tar root@47.97.98.39:/opt/promptforge/
```

`docker compose build` 默认使用中国大陆可访问性更好的 npm 镜像；需要切换 registry 时，可以在构建前设置：

```powershell
$env:NPM_REGISTRY = "https://registry.npmjs.org"
docker compose build backend frontend nginx
```

上传完成后，在 ECS 上执行：

```bash
cd /opt/promptforge
docker load --input ./promptforge-images.tar
docker image ls --filter=reference='promptforge-*'
docker compose up -d --no-build
docker compose ps
```

`docker compose up -d --no-build` 会直接使用刚刚加载的三个镜像，不会在服务器上执行 `pnpm install` 或重新构建。确认启动成功后，可以删除服务器上的导出包释放空间：

```bash
rm -- ./promptforge-images.tar
```

不要把 `backend/.env` 放进压缩包或上传包，也不要把 `promptforge-images*.tar` 提交到 Git；导出包通常很大，根目录 `.gitignore` 已经忽略了这类文件。服务器仍需要单独配置 `backend/.env`，具体见第 2 节。

如果仓库中的 Compose 配置还没有同步到服务器，先执行：

```bash
cd /opt/promptforge
git pull --ff-only origin main
```

注意：`git pull` 只同步 Compose 和 Nginx 等配置，不会替代镜像上传；服务器必须先执行 `docker load`。

## 5. 构建依赖源与启动 HTTP 版本

Docker 构建默认使用中国大陆可访问性更好的 npm 镜像：

```text
https://registry.npmmirror.com
```

前端和后端的所有 `pnpm install` 都会使用这个源。需要切换到其他 registry 时，在构建时覆盖 `NPM_REGISTRY` 即可，例如：

```bash
NPM_REGISTRY=https://registry.npmjs.org docker compose build
```

也可以只构建单个服务：

```bash
NPM_REGISTRY=https://registry.npmjs.org docker compose build frontend
```

不设置 `NPM_REGISTRY` 时，会回退到 Dockerfile 和 Compose 中声明的默认镜像源。

如果改为在服务器本地构建，首次启动前端和后端可以执行：

```bash
docker compose build
docker compose up -d
docker compose ps
```

没有证书文件时，Nginx 自动使用 HTTP 配置；此时可以先访问：

```text
http://promptforge.pjhao.xyz
```

Nginx 的 `/api/` 请求会转发到 `backend:7001`，其他请求会转发到 `frontend:3000`。前端浏览器请求默认使用同源 `/api`，不会暴露后端容器地址。

查看日志：

```bash
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
docker compose logs --tail=100 nginx
```

## 6. 启用 HTTPS

可以使用阿里云 SSL 证书或 ACME 工具申请证书。将证书文件放到服务器上的以下路径：

```text
deploy/nginx/certs/fullchain.pem
deploy/nginx/certs/privkey.pem
```

文件只保存在服务器，不要提交到仓库。然后重新创建 Nginx 容器：

```bash
chmod 600 deploy/nginx/certs/privkey.pem
docker compose up -d --force-recreate nginx
```

检测到两个非空证书文件后，Nginx 会自动加载 HTTPS 配置：80 重定向到 443，SSE 的 `/api/chat` 保持 HTTP/1.1、关闭代理缓冲，并允许较长的读取时间。

证书续期后重新执行 `docker compose up -d --force-recreate nginx` 即可加载新证书。

## 7. 更新版本

推荐的手动更新流程仍然是在本地重新构建并导出三个同名镜像，然后上传到服务器：

```powershell
docker compose build backend frontend nginx
docker save --output .\promptforge-images.tar `
  promptforge-backend:latest `
  promptforge-frontend:latest `
  promptforge-nginx:latest
scp .\promptforge-images.tar root@47.97.98.39:/opt/promptforge/
```

服务器上执行：

```bash
cd /opt/promptforge
git pull --ff-only origin main
docker load --input ./promptforge-images.tar
docker compose up -d --no-build
docker image prune -f
rm -- ./promptforge-images.tar
```

`docker image prune -f` 只清理未被容器使用的悬空镜像；执行前仍建议确认服务器上没有其他重要的 Docker 工作负载依赖这些镜像。更新过程中不会覆盖服务器上的 `backend/.env`。

## 8. 本地开发

本地默认仍使用 Next rewrite：浏览器请求 `/api`，Next 将其转发到 `http://localhost:7001`。如需让浏览器直接访问其他 API 地址，可在前端构建/开发环境设置：

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:7001/api
```

这个变量会进入浏览器端代码，只能填写公开地址，不能填写 API Key。

## 9. 公开接口保护

`POST /api/chat` 默认每个 IP 在 10 分钟内最多 5 次，同时限制每个 IP 只有 1 个生成请求在运行；单次请求还限制消息数量、提示词长度、JSON 体积，并在 SSE 长时间没有模型事件时发送心跳。限流状态只存在于当前后端进程，重启后会清空，不依赖数据库。

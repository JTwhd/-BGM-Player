# BGM Player 内测部署

当前推荐方式：一台香港或海外 Linux VPS，使用 Docker Compose 同时运行 API 和 MongoDB。

## 1. 服务器准备

在服务器安装 Docker 和 Docker Compose，然后上传整个项目，至少保留：

```text
backend/
deploy/
```

## 2. 配置环境变量

进入 `deploy` 目录：

```bash
cp .env.example .env
```

编辑 `.env`：

- `MONGO_ROOT_PASSWORD`：数据库密码，使用较长随机字符串。
- `JWT_SECRET`：至少 32 个字符的随机字符串。
- `PUBLIC_BASE_URL`：暂时填写 `http://服务器IP`。
- `CORS_ORIGINS`：保留 Tauri 客户端来源。以后增加官网时再追加官网域名。

数据库密码如果包含 `@`、`:`、`/` 等 URL 特殊字符，需要先进行 URL 编码。内测阶段可使用字母、数字、下划线和短横线组成的长密码。

## 3. 启动服务

```bash
cd deploy
docker compose up -d --build
docker compose ps
curl http://127.0.0.1/api/health
```

健康检查返回 `status: ok` 后，API 已可使用。

MongoDB 不映射公网端口，数据保存在 Docker 卷 `mongo-data` 中。上传音频保存在 `uploads-data` 卷中。

## 4. 构建内测客户端

在开发电脑的项目根目录执行：

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\build-client.ps1 `
  -ApiBaseUrl "http://服务器IP/api" `
  -Installer
```

安装包会由 Tauri 生成。将安装包通过网盘或群文件发送给内测用户即可。

## 5. 后续升级

公开邀请用户之前，应增加域名、HTTPS 和服务器防火墙规则。在线音频数量增加后，再把 `uploads-data` 迁移到对象存储。

## 管理员账号

用户完成注册后，可在服务器终端中将指定邮箱设为管理员：

```bash
cd /root/bgm-player/deploy
docker compose exec api node src/scripts/setAdmin.js your-email@example.com
```

管理员重新登录客户端后，侧边栏会显示“后台管理”入口。不要在客户端中写死后台密码。

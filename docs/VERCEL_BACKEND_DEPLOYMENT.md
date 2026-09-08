# Vercel 前后端部署

GitHub Pages 仅运行前端。Vercel 运行前端和 `api/index.py` 中的 Django 函数，两个网站共用 Vercel 后端和 PostgreSQL。

## 1. 数据库和 Vercel 项目

1. 登录 Vercel，认领已有临时部署或导入 `zl2626/farmeasy` 仓库。
2. Root Directory 必须是仓库根目录 `.`，不是 `farmeasy-frontend`。根目录的 `vercel.json` 同时构建前端和 Python 函数。单独部署前端目录不会部署后端。
3. 在项目 Storage/Marketplace 连接 PostgreSQL（例如 Neon 的免费计划，以页面实际条款为准），取得 `DATABASE_URL`。
4. 添加下表环境变量并应用到要部署的环境。密钥只配置到 Vercel 服务端，不能使用 `VITE_` 前缀。

| 变量 | 值 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 连接串，包含 SSL 配置 |
| `DJANGO_SECRET_KEY` | 随机生成的长期密钥，不能每次部署变更 |
| `DJANGO_DEBUG` | `false` |
| `DJANGO_ALLOWED_HOSTS` | 实际 Vercel 域名，多个域名用逗号分隔，不带协议 |
| `DJANGO_CORS_ALLOWED_ORIGINS` | `https://zl2626.github.io,https://实际Vercel域名` |
| `FRONTEND_BASE_URL` | `https://实际Vercel域名` |
| `DEEPSEEK_API_KEY` | 已有 DeepSeek 密钥 |
| `DEEPSEEK_TEXT_MODEL` | 默认 `deepseek-v4-flash-vision-exp`，需有该模型权限 |
| `DEEPSEEK_VISION_MODEL` | 默认同上 |

Vercel 前端的 `VITE_API_BASE_URL` 留空时使用同域 `/api`。删除旧的 localhost 配置。额外预览域名会从 Vercel 系统环境变量加入允许列表。

## 2. 初始化数据库

在已安装根目录 `requirements.txt` 依赖的 Python 环境中，将同一 `DATABASE_URL` 安全地设置为环境变量，然后在仓库根目录运行：

```powershell
backend/venv/Scripts/python.exe -m pip install -r requirements.txt
backend/venv/Scripts/python.exe backend/manage.py migrate --noinput
```

迁移完成后从仓库根目录部署。函数启动时不会自动执行数据库迁移。缺少数据库或 Django 密钥时，线上启动会明确失败，不会回退到临时 SQLite。

本机 SQLite 中已有的账号和聊天记录不会自动进入新的 PostgreSQL。需要保留旧数据时，先备份，再使用 Django `dumpdata` / `loaddata` 做单独的数据迁移；不要覆盖原 SQLite 文件，也不要将导出数据提交到 Git。

## 3. 连接 GitHub Pages

在 GitHub 仓库 Settings → Secrets and variables → Actions → Variables 中设置：

```text
VITE_API_BASE_URL=https://实际Vercel域名/api
VITE_MEDIA_ORIGIN=https://实际Vercel域名
```

重新运行 Pages workflow。工作流已经读取这两个变量，并拒绝缺少 HTTPS 后端地址的构建。

## 4. 验收

- 请求 `/api/auth/login/`：GET 应返回 JSON 405；错误密码的 POST 应返回 JSON 401，而不是 Vercel 404 或 HTML。
- 注册测试账号后登录，确认用户资料可以加载。
- 发送农业问题并确认得到回答，再刷新页面检查历史记录。
- 在 GitHub Pages 重复登录和问答，确认没有 localhost 请求和 CORS 错误。

两个站点的浏览器登录状态彼此独立，需要分别登录；共用数据库后账号和聊天记录相同。

## 当前范围和限制

- Vercel 使用根目录轻量依赖和内置作物知识库，不安装 Torch/FAISS；本机有向量索引时仍可继续使用向量检索。
- PostgreSQL 持久化账号和文字聊天。上传图片暂存在函数 `/tmp`，不保证后续实例能读取，历史图片还需要接入对象存储；当前配置不提供持久化媒体托管。
- 找回密码邮件还需要配置 SMTP 环境变量。
- 此配置已做本地构建和接口测试；真正的云端验收必须在数据库连接、迁移和 Vercel 部署完成后进行。

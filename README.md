# 智农（FarmEasy）

智农是面向中国农业场景的知识查询与农事答疑平台。项目保留原有页面 URL，提供作物百科、惠农政策、市场行情快照、疑问管理、用户中心、后台管理和知识库问答。

> 行情页当前使用项目内置的非官方、非实时演示快照，仅用于展示查询与筛选能力，不可作为生产经营决策依据。正式数据接口可在 `backend/education/market/providers.py` 中按现有 Provider 接口接入。

## 技术架构

- 前端：React 19、Vite、React Router，生产环境由 Nginx 托管。
- 后端：Django、Django REST Framework、Simple JWT。
- 数据：SQLite（本地及当前容器默认）、农业知识 JSON 种子数据。
- AI：RAG 与外部模型通过后端调用；错误响应不向浏览器暴露密钥或供应商异常。
- 上传：PDF 最大 10MB、100 页且禁止加密；图片最大 8MB、2500 万像素，仅支持 JPG、PNG、WebP。

浏览器统一请求同源 `/api` 和 `/media`。开发环境由 Vite 代理到 Django，Docker 环境由 Nginx 代理到后端服务。

## 本地启动

环境要求：Python 3.12+、Node.js 22+。

```powershell
cd backend
Copy-Item .env.example .env
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-lite.txt
python manage.py migrate
python manage.py seed_agriculture_data
python manage.py runserver
```

另开终端：

```powershell
cd farmeasy-frontend
npm ci
npm run dev
```

访问 `http://localhost:5173`。开发代理默认连接 `http://127.0.0.1:8000`。

## 环境变量

完整模板见 `backend/.env.example`。部署时至少设置：

- `DJANGO_SECRET_KEY`：随机高强度密钥。
- `DJANGO_DEBUG=false`
- `DJANGO_ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`
- `FRONTEND_URL`
- 模型、邮件服务所需的 API Key 或 SMTP 凭据。

不要提交 `.env`、数据库、上传文件、向量索引或密钥。

## 数据迁移

```powershell
cd backend
python manage.py migrate
python manage.py seed_agriculture_data
python manage.py makemigrations --check --dry-run
```

`seed_agriculture_data` 可重复执行：以 `crop_id` 和政策名称更新或创建记录，不重复堆积数据。当前导入 100 条作物资料和 22 条政策资料。

作物照片只有同时满足图片内容、作物物种、来源 URL 和许可均已人工核验，并将 `image_status` 设为 `verified` 后，才会在作物页公开显示。

## 测试与检查

```powershell
cd backend
python manage.py test
python manage.py check
python manage.py check --deploy

cd ..\farmeasy-frontend
npm test -- --run
npm run lint
npm run build
```

`check --deploy` 需要使用生产环境变量运行；开发环境关闭 HTTPS 重定向属于预期配置。

## Docker

```powershell
$env:DJANGO_SECRET_KEY = "请替换为随机长密钥"
docker compose up --build
```

访问 `http://localhost:8080`。容器首次启动会自动迁移并幂等导入农业资料；SQLite 与上传文件分别存入命名卷。正式公网部署应在反向代理或负载均衡层启用 HTTPS，并将 Django 的安全 Cookie、HSTS 和 SSL 重定向环境变量设为 `true`。

## 安全与故障处理

- 登录、注册、找回密码、AI、反馈和抓取端点均有限流。
- 找回密码不透露邮箱是否存在；重置令牌无效时拒绝修改密码。
- Web 补充检索只允许 HTTPS 和预设权威农业域名，外部内容作为不可信文本隔离。
- 图片与 PDF 同时验证大小、文件签名和解析结果，不信任扩展名或 MIME 声明。
- AI 或外部服务不可用时返回稳定中文错误码，不把供应商异常、路径或凭据发给前端。
- 官方行情接口未接入时保持演示快照和醒目标识，不伪装实时数据。

## 图片来源

首页球形图库使用可核验地点与许可的中国农业实景。逐张作者、地点、许可和 Commons 原始页面记录在 `farmeasy-frontend/src/data/imageManifest.js`，页面底部也可直接查看。作物百科不复用这些场景图冒充作物实物图。

## 已知边界

- 当前行情不是官方实时数据，正式接口待取得授权后接入。
- AI 输出只作辅助参考，病虫害、农药使用和重大经营决策应由当地农技人员复核。
- 本版本不包含真实农户试用指标、国赛证据链、软著材料或路演演示资产。

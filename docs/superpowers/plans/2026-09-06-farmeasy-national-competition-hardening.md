# 智农平台国赛级工程加固实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留现有功能、URL 与 `/home` 首屏球形图库的前提下，完成安全、数据、API、前端视觉、响应式、无障碍、测试与部署加固。

**Architecture:** Django 是业务数据唯一来源，行情通过可替换 provider 暴露带来源元数据的历史快照；React 通过统一 API 客户端访问后端并按路由懒加载。视觉层保留球形图库，用核验后的真实中国农业照片、统一设计令牌和任务型业务页面提升质感。

**Tech Stack:** Django REST Framework、SimpleJWT、SQLite、React 19、Vite、Vitest、Testing Library、Lucide、Docker。

**Spec:** `docs/superpowers/specs/2026-09-06-farmeasy-national-competition-hardening-design.md`

## Global Constraints

- 不做 AI 指标评测、真实用户试用、软著或答辩材料。
- 没有中国官方行情 API 前，不宣称实时行情。
- 保留现有核心功能、URL、启动页和 `/home` 首屏球形图库。
- 全站采用自然简体中文与核验准确的真实中国农业图片。
- 无法确认作物照片物种或许可时显示中性占位，不用错误图片或 AI 合成图冒充。
- 目标视口为 375×812、768×1024、1440×900。

---

### Task 1: 本地版本基线与测试框架

**Files:**
- Create: `.gitignore`
- Modify: `farmeasy-frontend/package.json`
- Create: `farmeasy-frontend/src/test/setup.js`

**Interfaces:**
- Produces: `npm test`、Django test runner、本地 Git 基线。

- [ ] 创建根级 `.gitignore`，排除 `.env`、`venv/`、`node_modules/`、`dist/`、`db.sqlite3`、`media/`、`__pycache__/`、FAISS/pickle 产物。
- [ ] 初始化本地 Git 并提交 `chore: preserve pre-hardening baseline`，不配置远端。
- [ ] 安装 Vitest、jsdom 和 Testing Library，配置 `"test": "vitest run"`。
- [ ] 创建一个最小前端测试并先验证测试命令可运行。

### Task 2: 后端配置与认证安全

**Files:**
- Modify: `backend/farmeasy/settings.py`
- Modify: `backend/farm_app/views.py`
- Modify: `backend/farm_app/serializers.py`
- Create: `backend/farm_app/throttles.py`
- Create: `backend/farm_app/tests/test_auth.py`
- Create: `backend/.env.example`

**Interfaces:**
- Produces: `env_bool(name, default)`、通用密码找回响应、严格 token 校验。

- [ ] 先写测试：未知邮箱与已知邮箱返回相同状态/消息；无效 token 返回 400 且密码不变；弱密码被拒绝。
- [ ] 运行定向测试，确认分别因账号枚举、token 未校验和未调用密码验证而失败。
- [ ] 将密钥、邮件、CORS、前端地址、主机、HTTPS 和 Cookie 配置迁移到环境变量；开发默认值不得包含真实凭据。
- [ ] 使用 `default_token_generator.check_token(user, token)` 的布尔结果阻止无效重置，并调用 `validate_password`。
- [ ] 对外只返回通用找回响应，内部用日志记录邮件发送失败。
- [ ] 配置 DRF 匿名/用户节流并覆盖认证、反馈、AI 和抓取接口。
- [ ] 运行认证测试和 `manage.py check --deploy`。

### Task 3: 迁移、模型与幂等数据导入

**Files:**
- Modify: `backend/education/models.py`
- Create: `backend/education/migrations/0005_*.py`
- Create: `backend/education/management/commands/seed_agriculture_data.py`
- Create: `backend/education/tests/test_seed_data.py`

**Interfaces:**
- Produces: `python manage.py seed_agriculture_data`，来源字段与图片元数据字段。

- [ ] 写测试：空库执行导入后存在作物/政策，第二次执行数量不增长，来源字段非空。
- [ ] 运行测试并确认因命令不存在而失败。
- [ ] 补齐 `Doubt`、`Feedback`、来源、适用地区、发布机构、日期、图片核验字段及统一 `BigAutoField` 迁移。
- [ ] 从现有中文 JSON/JS 数据解析并 `update_or_create`，确保命令幂等。
- [ ] 运行测试、迁移和 `makemigrations --check --dry-run`。

### Task 4: 可替换行情 Provider

**Files:**
- Create: `backend/education/market/providers.py`
- Create: `backend/education/market/snapshot.py`
- Modify: `backend/education/views.py`
- Modify: `backend/education/urls.py`
- Create: `backend/education/tests/test_market.py`

**Interfaces:**
- Produces: `get_market_snapshot(filters) -> {records, meta}`，`meta.data_mode="historical_snapshot"`。

- [ ] 写测试：接口返回来源、快照日期、历史模式；支持省份/城市/品类筛选；不返回印度数据。
- [ ] 运行测试并确认现有接口缺少元数据且数据地域错误。
- [ ] 将当前中国演示行情移到后端快照模块，移除随机价格生成和印度 CSV 隐式回退。
- [ ] 添加 `MARKET_DATA_PROVIDER` 配置边界，为将来官方 API 保留接口但不实现假实时。
- [ ] 运行行情测试。

### Task 5: 上传、异常与 RAG 安全

**Files:**
- Create: `backend/rag/upload_validation.py`
- Modify: `backend/rag/views.py`
- Modify: `backend/rag/rag_pipeline.py`
- Modify: `backend/rag/web_search.py`
- Create: `backend/rag/tests/test_uploads.py`
- Create: `backend/rag/tests/test_rag_safety.py`

**Interfaces:**
- Produces: `validate_pdf(upload)`、`validate_image(upload)`、可解释资料状态。

- [ ] 写上传失败测试：超限、错误签名、损坏文件、超大像素；写外部服务失败返回 JSON 的测试。
- [ ] 运行测试并确认现有实现接受伪造 MIME/扩展名或泄露异常。
- [ ] 限制 PDF 10MB/100 页、图片 8MB/25MP，使用解析器验证实际内容并统一错误码。
- [ ] 删除关键词命中即 `HIGH` 的逻辑，返回 `LOCAL_SOURCES`、`WEB_SUPPLEMENTED`、`INSUFFICIENT_SOURCES`。
- [ ] 联网抓取执行真实域名白名单校验，并在提示中隔离外部不可信文本。
- [ ] 全部第三方异常记录服务端日志，对客户端返回稳定中文 JSON。
- [ ] 运行 RAG 与上传测试。

### Task 6: 统一前端 API、认证与路由加载

**Files:**
- Rewrite: `farmeasy-frontend/src/services/api.js`
- Modify: `farmeasy-frontend/src/context/AuthContext.jsx`
- Modify: `farmeasy-frontend/src/App.jsx`
- Modify: all pages with hard-coded API roots
- Create: `farmeasy-frontend/src/components/ProtectedRoute.jsx`
- Create: `farmeasy-frontend/src/services/api.test.js`

**Interfaces:**
- Produces: `api.get/post/patch/delete`、`mediaUrl(path)`、`ProtectedRoute`。

- [ ] 写测试：环境 API 地址、401 刷新单次重试、刷新失败清理状态、受保护路由保留目标路径。
- [ ] 运行测试并确认硬编码地址与直接跳转使测试失败。
- [ ] 实现统一 `fetch` 客户端和认证状态恢复，移除页面级 axios 拦截器与所有 localhost 拼接。
- [ ] 使用 `React.lazy` 和 `Suspense` 拆分路由，保留全部现有 URL。
- [ ] 修复现有 ESLint 错误并运行测试、Lint、构建。

### Task 7: 首页、导航与球形图库美化

**Files:**
- Modify: `farmeasy-frontend/src/pages/LandingPage.jsx`
- Modify: `farmeasy-frontend/src/pages/Homepage.jsx`
- Modify: `farmeasy-frontend/src/components/Navbar.jsx`
- Modify: `farmeasy-frontend/src/components/DomeGallery.jsx`
- Modify: `farmeasy-frontend/src/components/DomeGallery.css`
- Create: `farmeasy-frontend/src/data/imageManifest.js`
- Modify: `farmeasy-frontend/src/index.css`

**Interfaces:**
- Produces: 真实中国农业图库清单、首屏快捷入口、无重复焦点图库。

- [ ] 为首页入口和图库可访问项数量编写组件测试并确认现状失败。
- [ ] 保留球形图库满首屏布局，将克制的品牌与任务入口放在不遮挡主体的位置。
- [ ] 将视觉克隆标记 `aria-hidden`，只保留一组可交互内容；支持 reduced motion。
- [ ] 使用现有梯田、茶园、稻田、油菜花、竹林和乡村集市真实照片，补充来源清单。
- [ ] 统一导航高度、间距、焦点和移动菜单，保留现有导航名称。
- [ ] 运行首页测试、Lint 和构建。

### Task 8: 行情、作物、政策和 AI 业务页升级

**Files:**
- Modify: `farmeasy-frontend/src/pages/MarketPrices.jsx`
- Modify: `farmeasy-frontend/src/pages/CropList.jsx`
- Modify: `farmeasy-frontend/src/pages/AgriSchemes.jsx`
- Modify: `farmeasy-frontend/src/pages/Chatbot.jsx`
- Modify: `farmeasy-frontend/src/pages/Login.jsx`
- Create: `farmeasy-frontend/src/components/PageState.jsx`

**Interfaces:**
- Consumes: unified `api`、后端行情 `meta`、来源和图片核验字段。
- Produces: 统一加载/空/失败状态、任务型业务页面。

- [ ] 写测试：API 失败不显示静态伪数据；行情标注历史模式；作物只显示 verified 真实照片；AI 上下文字段进入请求。
- [ ] 运行测试并确认现状失败。
- [ ] 行情改为紧凑表格/移动列表，展示来源、日期和历史参考提示。
- [ ] 作物卡片移除结构性 Emoji，优先使用核验照片，无照片显示中性占位。
- [ ] 政策突出地区、机构、发布日期、状态和官方链接。
- [ ] AI 增加地区/作物/生育阶段选择器、来源状态和失败重试，不增加发送步骤。
- [ ] 优化登录与错误文案并增加真实 label。
- [ ] 运行页面测试、Lint 和构建。

### Task 9: 响应式与无障碍回归

**Files:**
- Modify: affected JSX/CSS files from Tasks 7–8
- Create: `farmeasy-frontend/src/styles/tokens.css`

**Interfaces:**
- Produces: 无水平溢出、可见焦点、44px 点击区域、弹窗焦点管理。

- [ ] 添加样式令牌，统一颜色、间距、圆角、阴影、文字层级和动效。
- [ ] 为图标按钮补充 `aria-label`，表单关联 label/error，弹窗支持 Escape 与焦点恢复。
- [ ] 为 375、768、1440 断点修复网格、导航、图库、筛选器和对话布局。
- [ ] 使用浏览器检查 `scrollWidth <= clientWidth`、键盘顺序和目标视口截图。
- [ ] 运行全部前端测试、Lint 和构建。

### Task 10: Docker、文档和最终验证

**Files:**
- Create: `backend/Dockerfile`
- Create: `farmeasy-frontend/Dockerfile`
- Create: `docker-compose.yml`
- Create: `README.md`
- Update: `backend/requirements.txt`
- Update: `.gitignore`

**Interfaces:**
- Produces: 一键构建/启动说明和可复现环境。

- [ ] 锁定实际兼容依赖并加入 Gunicorn/Waitress 生产服务。
- [ ] 编写前后端 Dockerfile 和 Compose，启动时执行迁移与数据导入。
- [ ] 编写中文 README：架构、环境变量、安装、导入、运行、测试、Docker、行情限制和图片来源。
- [ ] 运行后端测试、前端测试、Lint、构建、迁移检查、部署检查、依赖审计。
- [ ] 启动本地服务，逐页检查核心 URL 与三类目标视口。
- [ ] 提交最终本地版本并记录剩余外部依赖仅为官方行情 API。

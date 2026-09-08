# FarmEasy GitHub Pages 部署说明

## 适用范围

GitHub Pages 只能托管**静态网站**。本项目可以部署：

- React/Vite 前端
- 前端内置的静态数据、图片、页面和导航
- 不依赖 Django 后端的展示型功能

GitHub Pages **不能运行**：

- Django 后端
- SQLite 数据库
- 登录/注册接口
- 病虫害诊断上传接口
- 补贴匹配接口
- 翻译 API
- 其他 `/api/*` 动态接口

如果这些功能必须公网可用，请另行部署 Django 后端到 Render、Railway、Fly.io、Hugging Face Spaces、云服务器等平台，并在前端构建时设置 `VITE_API_BASE_URL`。

## 一次性配置

1. 在 GitHub 创建名为 `farmeasy` 的公开仓库。
2. 推送本项目：

   ```bash
   git remote add origin https://github.com/<你的用户名>/farmeasy.git
   git push -u origin baseline/pre-hardening:main
   ```

   如果本地已有 `main` 分支，可直接推送 `main`。

3. 打开仓库页面：`Settings -> Pages`。
4. `Build and deployment` 选择 `GitHub Actions`。
5. 工作流会自动运行并部署。

部署完成后访问：

```text
https://<你的用户名>.github.io/farmeasy/
```

## 自动部署

- 每次推送到 `main` 分支自动部署
- 也可以在 `Actions -> Deploy FarmEasy frontend to GitHub Pages -> Run workflow` 手动部署

## 构建路径

`farmeasy-frontend/vite.config.js` 默认设置：

```js
const base = process.env.VITE_BASE_PATH || "/farmeasy/";
```

如果仓库名不是 `farmeasy`，请改这里的默认值，或在 GitHub Actions 中添加：

```yaml
env:
  VITE_BASE_PATH: /你的仓库名/
```

如果部署到 `<用户名>.github.io` 仓库，应设置为 `/`。

## 后续连接公网后端（可选）

在 GitHub 仓库中添加 Pages 构建变量：

```text
Settings -> Secrets and variables -> Actions -> Variables
VITE_API_BASE_URL = https://你的后端域名/api
VITE_MEDIA_ORIGIN = https://你的后端域名
```

然后修改工作流的 build job：

```yaml
      - name: Build site
        working-directory: farmeasy-frontend
        env:
          VITE_API_BASE_URL: ${{ vars.VITE_API_BASE_URL }}
          VITE_MEDIA_ORIGIN: ${{ vars.VITE_MEDIA_ORIGIN }}
        run: npm run build
```

后端还需要在 Django `settings.py` 中把前端 Pages 域名加入 `CSRF_TRUSTED_ORIGINS` 和 CORS 配置。

## 常见问题

### 页面空白

通常是资源路径不匹配。检查仓库实际名称，并确认 `VITE_BASE_PATH` 以 `/` 开头和结尾。

### 登录、翻译、上传等功能失败

这是预期行为，因为这些功能依赖 Django 后端；GitHub Pages 不提供后端服务。

### 首页可打开但刷新某个页面 404

本项目已切换为 `HashRouter`，页面链接形如 `/#/home`，刷新不会 404。若改回 `BrowserRouter`，则需要配置 Pages 的 404 重定向。

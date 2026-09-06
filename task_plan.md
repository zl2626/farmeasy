# 智农平台工程加固任务

## Goal

执行 `docs/superpowers/plans/2026-09-06-farmeasy-national-competition-hardening.md`，保留球形图库与全部核心功能，完成工程加固和前端美化。

## Phases

| Phase | Status | Scope |
|---|---|---|
| 1 | in_progress | 基线、忽略规则、测试框架 |
| 2 | pending | 后端配置与认证安全 |
| 3 | pending | 迁移、模型、数据导入 |
| 4 | pending | 行情 provider |
| 5 | pending | 上传、异常、RAG 安全 |
| 6 | pending | 前端 API、认证、路由、Lint |
| 7 | pending | 首页、导航、球形图库 |
| 8 | pending | 业务页面视觉升级 |
| 9 | pending | 响应式与无障碍 |
| 10 | pending | Docker、文档、总回归 |

## Constraints

- 不做 AI 指标和 P4 证据链。
- 不接入尚未取得的官方行情 API。
- 不移除 `/home` 首屏球形图库。
- 保留现有功能和 URL。
- 农作物图片必须真实、准确且可核验。

## Errors Encountered

| Error | Attempt | Resolution |
|---|---:|---|
| 仓库当前无 Git 元数据 | 1 | Phase 1 初始化本地仓库并创建基线 |
| ESLint 40 errors / 1 warning | 1 | Phase 6 系统修复 |
| Django tests = 0 | 1 | Phase 2 起按 TDD 补测试 |
| education 存在未生成迁移 | 1 | Phase 3 创建并验证迁移 |
| 作物抓取超时返回 HTML 500 | 1 | Phase 5 统一 JSON 错误与超时处理 |


# GuGeeGoo 学生主页

静态站点（Vite），部署到 **Cloudflare Pages** 项目 `gugeegoo`（https://gugeegoo.pages.dev）。

当前首页为 **Hello World**（紫色渐变卡片 + 挥手动画），源码在 `index.html` 与 `src/style.css`，与维护者首次手动 `wrangler pages deploy` 上线的页面一致。后续可在 `src/main.js` 中接入 COS 练习链接等。

## 开发

在仓库根目录：

```bash
npm install
npm run web:dev
```

浏览器打开 http://localhost:5173

## 构建

```bash
npm run web:build
```

产物：`apps/web/dist/`

## 部署

| 方式 | 命令 / 触发 |
|------|-------------|
| GitHub Actions | push `main`（需仓库 Secret `CLOUDFLARE_API_TOKEN`） |
| 本地 | `npm run deploy:pages`（根目录 `.env`，见 `infra/cloudflare/env.example`） |

Wrangler 与账号配置见 [`../../infra/cloudflare/pages.md`](../../infra/cloudflare/pages.md)。

## 环境变量

| 变量 | 说明 |
|------|------|
| `VITE_COS_PUBLIC_BASE_URL` | 腾讯云 COS/CDN 上 `public/` 的根 URL（构建时由 Vite 注入；**当前 Hello World 未使用**，保留供后续学科入口） |

GitHub 可在 **Settings → Variables** 配置同名变量供 CI 构建。

`public/config/site.json` 为旧骨架预留配置，当前首页不读取；日后扩展时可再用。

## 隐私

本应用 **不包含** `学习档案/`。规划 MD 仅通过 COS `private/planning/` 同步，由后续 Access + Worker 提供家长访问。

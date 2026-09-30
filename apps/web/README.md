# GuGeeGoo 学生主页

静态站点（Vite），部署到 **Cloudflare Pages** 项目 `gugeegoo`（https://gugeegoo.pages.dev）。

## 开发

在仓库根目录：

```bash
npm install
npm run web:dev
```

浏览器打开 http://localhost:5173

本地调试 COS 链接时可临时导出：

```bash
export VITE_COS_PUBLIC_BASE_URL=https://你的公开CDN根路径
npm run web:dev
```

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
| `VITE_COS_PUBLIC_BASE_URL` | 腾讯云 COS/CDN 上 `public/` 的根 URL（构建时注入） |

GitHub 可在 **Settings → Variables** 配置同名变量供 CI 构建。

## 隐私

本应用 **不包含** `学习档案/`。规划 MD 仅通过 COS `private/planning/` 同步，由后续 Access + Worker 提供家长访问。

# GuGeeGoo 学生主页

静态站点（Vite），部署到 **Cloudflare Pages** 项目 `gugeegoo`（https://gugeegoo.pages.dev）。

## 页面

| 路径 | 说明 |
|------|------|
| `/` | **游戏导航页** — 列出可选游戏（卡片入口，不会自动跳进某个游戏） |
| `/snake/` | **贪吃蛇** 关卡模式（键盘 / 滑动画布 / 画布内十字方向键） |

新增游戏：在 `src/games.js` 的 `GAMES` 数组加一条，并增加对应 HTML 入口（多页构建）。

源码：`index.html`（导航页）、`snake/index.html`；样式与逻辑在 `src/`；API 在 `functions/`（Pages Functions + KV）。

## 开发

在仓库根目录：

```bash
npm install
npm run web:dev
```

- 导航页：http://localhost:5173/
- 游戏：http://localhost:5173/snake/

本地 Vite **不会**运行 Pages Functions；分数与排行榜使用 **localStorage**，与线上 KV 逻辑一致，API 失败时同样回退本地。

## 构建

```bash
npm run web:build
```

产物：`apps/web/dist/`（多页：`index.html`、`snake/index.html` 及对应 JS/CSS）。

验证 Functions 打包（可选）：

```bash
npx wrangler pages functions build apps/web/functions --project-directory apps/web --build-output-directory dist --config infra/cloudflare/wrangler.toml
```

## 部署

| 方式 | 命令 / 触发 |
|------|-------------|
| GitHub Actions | push `main`（需仓库 Secret `CLOUDFLARE_API_TOKEN`） |
| 本地 | `npm run deploy:pages`（根目录 `.env`，见 `infra/cloudflare/env.example`） |

`wrangler pages deploy` 会上传 `apps/web/dist`，并自动带上同级的 `apps/web/functions/`。

Wrangler、KV 绑定与免费额度见 [`../../infra/cloudflare/pages.md`](../../infra/cloudflare/pages.md)。

## 环境变量

| 变量 | 说明 |
|------|------|
| `VITE_COS_PUBLIC_BASE_URL` | 腾讯云 COS/CDN 上 `public/` 的根 URL（构建时注入；当前导航页未使用，保留供后续学科入口） |

GitHub 可在 **Settings → Variables** 配置同名变量供 CI 构建。

`public/config/site.json` 为旧骨架预留配置，当前未读取。

## 隐私

本应用 **不包含** `学习档案/`。规划 MD 仅通过 COS `private/planning/` 同步，由后续 Access + Worker 提供家长访问。

# Cloudflare Pages — GuGeeGoo 学生主页

## 当前线上配置（仓库为真源）

| 项 | 值 |
|----|-----|
| Pages 项目名 | `gugeegoo` |
| 创建方式 | **Direct Upload**（未使用 Cloudflare 控制台连接 GitHub） |
| Production branch | `main` |
| 默认域名 | https://gugeegoo.pages.dev |
| Account ID | `15b1233497d3363a2240f8a54f900fe2`（已写入 [`wrangler.toml`](./wrangler.toml)） |
| Wrangler 配置 | [`infra/cloudflare/wrangler.toml`](./wrangler.toml) |
| 构建产物 | `apps/web/dist/`（`npm run web:build`） |
| 根路径 `/` | **游戏导航页**（`apps/web/index.html`，选游戏入口） |
| 小游戏 | https://gugeegoo.pages.dev/snake/ |

**首次上线（2026-09）：** 维护者曾用 `wrangler pages deploy` 手动 Direct Upload 到项目 `gugeegoo`（branch `main`），发布上述 Hello World 页。合并本仓库 CI 配置并 push `main` 后，GitHub Actions 将构建同一页面并覆盖部署，避免回退到旧骨架页。

发布路径二选一（或同时使用）：

1. **GitHub Actions**（推荐）：push `main` → 生产部署；Pull Request → 预览部署（需已配置 Secret）。
2. **本地**：`npm run deploy:pages`（需本机 `.env` 或环境变量）。

两者均执行 `wrangler pages deploy`，**不会**把 `学习档案/` 打进静态站。

---

## 一次性手动步骤（仓库维护者）

### 1. GitHub Actions Secret / Variable

在 GitHub 仓库 **Settings → Secrets and variables → Actions**：

| 名称 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `CLOUDFLARE_API_TOKEN` | Secret | **是**（否则 CI 跳过部署） | Cloudflare API Token |
| `CLOUDFLARE_ACCOUNT_ID` | Variable | 否 | 默认与 `wrangler.toml` 相同，可不填 |
| `VITE_COS_PUBLIC_BASE_URL` | Variable | 否 | 构建时注入 Vite；当前游戏导航页未使用，后续学科/COS 入口再启用 |

**Token 权限（创建 Token 时勾选）：**

- Account → **Cloudflare Pages**：Edit
- Account → **Workers Scripts**：Edit（当前仅 Pages 也可先只开 Pages；后续部署 Worker 时需要）

不要将 Token 写入仓库或提交到 `.env` 的历史记录。

### 2. 自定义域名（强烈建议，尤其大陆访问）

`*.pages.dev` 在大陆可能较慢或不稳定。可在 Cloudflare 控制台 **Workers & Pages → gugeegoo → Custom domains** 绑定自有域名（如 `www.example.com`），DNS 清单见 [`dns-checklist.md`](./dns-checklist.md)。

### 3. COS 公开资源（与 Pages 独立）

学生主页通过 `VITE_COS_PUBLIC_BASE_URL` 指向 COS/CDN 上的公开 PDF。桶与 CORS 见 [`../cos/`](../cos/)。

---

## GitHub Actions 工作流

文件：[`.github/workflows/deploy-pages.yml`](../../.github/workflows/deploy-pages.yml)

- **触发**：`main` push、相关路径的 PR、`workflow_dispatch`
- **无 `CLOUDFLARE_API_TOKEN`**：job `check-secrets` 输出 Notice，**跳过部署**（workflow 仍为成功，便于 fork/未配置 Secret 时不误报失败）
- **push `main`**：部署到 Pages **生产**环境
- **pull_request**：带 `--branch=<head ref>` 的**预览**部署（wrangler-action 可配合 `GITHUB_TOKEN` 评论预览 URL）

构建命令与本地一致：`npm ci` → `npm run web:build`。  
部署命令会同时上传 **`apps/web/functions/`**（Pages Functions，与 `dist/` 同级）。

---

## Pages Functions 与 KV（贪吃蛇）

| 项 | 说明 |
|----|------|
| 函数目录 | `apps/web/functions/` |
| API 路径 | `GET /api/game/stats`、`POST /api/game/save`、`GET /api/game/leaderboard` |
| KV 绑定名 | **`GAME_KV`**（必须在 Pages 项目与 `wrangler.toml` 中一致） |
| 写入时机 | 仅 **过关** 或 **游戏结束** 时 POST，不每帧写 |

### 配置 KV（家长一次性）

1. Cloudflare 控制台 → **Workers & Pages → KV** → Create namespace（如 `gugeegoo-game`）。
2. **Workers & Pages → gugeegoo → Settings → Functions → KV namespace bindings** → 添加 Variable name `GAME_KV`，选择该 namespace。
3. 仓库 [`wrangler.toml`](./wrangler.toml) 中取消注释 `[[kv_namespaces]]`，填入 namespace **id**（与控制台一致），以便本地 `wrangler pages deploy` 与 CI 使用同一绑定。

未配置 KV 时：Functions 仍部署，接口返回空数据 / `kv: false`；浏览器端 **localStorage** 照常保存最高分与进度。

### 免费额度（KV + Functions）

- **Workers/Pages Functions 请求**：约 **100 000 次/天**（Free）
- **KV 读取**：约 **100 000 次/天**；**KV 写入**：约 **1 000 次/天**（Free）  
  本游戏每次结束约 1 次写入 + 排行榜更新 1 次，正常使用远低于限额。

---

## 本地部署

```bash
# 1. 复制环境变量示例
cp infra/cloudflare/env.example .env
# 编辑 .env，填入 CLOUDFLARE_API_TOKEN；可选 VITE_COS_PUBLIC_BASE_URL

npm install
npm run deploy:pages
```

等价于：加载根目录 `.env` → `npm run web:build` →  
`wrangler pages deploy apps/web/dist --project-name=gugeegoo --config infra/cloudflare/wrangler.toml`。

仅构建、不上传：

```bash
npm run web:build
```

---

## 免费额度（与本项目相关）

**Cloudflare Pages（Free）**

- 静态请求 / 带宽：不限（Fair Use）
- **构建次数**：500 次/月（GitHub Actions 每次 deploy 计 1 次；Direct Upload 上传也受项目限制）
- 单文件最大 **25 MB**；整站最多约 **20 000** 个文件

**Cloudflare Workers / Pages Functions（Free）**

- **100 000** 次请求/天（含 `/api/game/*`）
- **KV**：读 100 000/天，写 1 000/天（贪吃蛇仅在结束局时写入）

---

## 预留独立 Worker（COS 等）

- 模板：[`wrangler.worker.toml.example`](./wrangler.worker.toml.example)
- 用途设想：COS 预签名 URL、家长区 API
- 与 Pages Functions **分开部署**；勿与 Pages 的 `functions/` 混在同一 Worker 项目

## 家长区（后续）

- 路径前缀建议：`/parent/*`
- **Cloudflare Access** 限制家长邮箱 / PIN
- 规划 MD 从 COS `private/planning/` 经 Worker 读取，**不要**放进 Pages 静态资源

## 相关文件

- [`wrangler.toml`](./wrangler.toml) — Pages 项目（已启用）
- [`wrangler.worker.toml.example`](./wrangler.worker.toml.example) — 未来 Worker 示例
- [`env.example`](./env.example) — 本地 `.env` 键名
- [`dns-checklist.md`](./dns-checklist.md) — DNS 记录清单

# GuGeeGoo 部署基础设施

> 主页：**Cloudflare Pages**（前端）  
> 文件：**腾讯云 COS**（公开 PDF + 私有规划 MD）

## 目录

| 路径 | 用途 |
|------|------|
| [`cloudflare/`](./cloudflare/) | Pages（wrangler + GitHub Actions）、DNS、Access 说明 |
| [`cos/`](./cos/) | 桶结构、CORS、环境变量示例 |

## Cloudflare Pages（学生主页）

- 项目 **`gugeegoo`**（Direct Upload），默认 URL：https://gugeegoo.pages.dev  
- 配置真源：[`cloudflare/wrangler.toml`](./cloudflare/wrangler.toml)  
- **CI**：push `main` 自动部署（需 GitHub Secret `CLOUDFLARE_API_TOKEN`）  
- **本地**：`npm run deploy:pages`（见 [`cloudflare/env.example`](./cloudflare/env.example)）

完整步骤、Token 权限、免费额度、自定义域名说明 → [`cloudflare/pages.md`](./cloudflare/pages.md)。

```bash
npm install
npm run web:build          # 仅构建 apps/web/dist
npm run deploy:pages       # 构建 + wrangler 上传（需 Token）
```

## COS 同步（学习材料 PDF / 私有规划）

```bash
# 1. 刷新待上传快照（含 学习档案/*.md → private/planning/）
npm run stage:deploy

# 2. 核对 deploy/staging/
ls -la deploy/staging/private/planning/

# 3. 配置 infra/cos/env.example → 根目录 .env 或 infra/cos/.env 后上传
npm run sync:cos -- --dry-run
npm run sync:cos
```

Cloudflare 与 COS 的环境变量示例分开存放：

- Pages：`infra/cloudflare/env.example`
- COS：`infra/cos/env.example`

均可复制为仓库根 `.env`（已在 `.gitignore`）。

## 安全

- `deploy/staging/private/` 与 COS `private/` 前缀：**禁止公有读**
- 学生主页（`apps/web`）**不得**打包 `学习档案/` 或 WP/MP 编码
- 家长查看规划：Cloudflare Access + 私有桶或后续 Worker 预签名

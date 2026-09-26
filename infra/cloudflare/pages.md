# Cloudflare Pages — GuGeeGoo 主页

## 推荐流程（过两天启动时）

1. **域名**（可选）：在 Cloudflare Registrar 购买，或将已有域名 NS 指到 Cloudflare。
2. **创建 Pages 项目**
   - 连接 GitHub 仓库 `GuGeeGoo`
   - **Production branch**：`main`（合并 scaffold PR 后）
   - **Root directory**：`/apps/web`
   - **Build command**：`npm ci && npm run build`
   - **Build output directory**：`dist`
3. **环境变量**（Pages → Settings → Environment variables）
   - `VITE_COS_PUBLIC_BASE_URL`：公开 PDF 的 CDN 根 URL（COS 或自定义域名），未配置时主页显示「待配置」
4. **自定义域名**：Pages → Custom domains → 绑定 `www` 或 apex。

## 构建说明

Monorepo 若从仓库根构建，可改为：

- Root directory：`/`（仓库根）
- Build command：`npm ci && npm run web:build`
- Output：`apps/web/dist`

本仓库根 `package.json` 已提供 `npm run web:build`。

## 家长区（后续）

- 路径前缀建议：`/parent/*`
- 使用 **Cloudflare Access** 限制为家长邮箱 / 一次性 PIN
- 规划 MD 从 COS `private/planning/` 经 Worker 读取，**不要**放进 Pages 静态资源

## 相关文件

- [`wrangler.toml.example`](./wrangler.toml.example) — 可选 Workers（API / 签名 URL）
- [`dns-checklist.md`](./dns-checklist.md) — DNS 记录清单

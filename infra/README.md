# GuGeeGoo 部署基础设施

> 主页：**Cloudflare Pages**（前端）  
> 文件：**腾讯云 COS**（公开 PDF + 私有规划 MD）

## 目录

| 路径 | 用途 |
|------|------|
| [`cloudflare/`](./cloudflare/) | Pages 构建、DNS、Access 说明 |
| [`cos/`](./cos/) | 桶结构、CORS、环境变量示例 |

## 本地准备（启动前）

```bash
# 1. 刷新待上传快照（含 学习档案/*.md → private/planning/）
npm run stage:deploy

# 2. 核对 deploy/staging/
ls -la deploy/staging/private/planning/

# 3. 配置 infra/cos/.env 后上传（过两天正式开 COS 时）
npm run sync:cos -- --dry-run
npm run sync:cos
```

## 安全

- `deploy/staging/private/` 与 COS `private/` 前缀：**禁止公有读**
- 学生主页（`apps/web`）**不得**打包 `学习档案/` 或 WP/MP 编码
- 家长查看规划：Cloudflare Access + 私有桶或后续 Worker 预签名

## 前端构建与发布

```bash
npm install
npm run web:build
# Cloudflare Pages：根目录 apps/web，构建命令 npm run web:build，输出 dist
```

详见 [`cloudflare/pages.md`](./cloudflare/pages.md)。

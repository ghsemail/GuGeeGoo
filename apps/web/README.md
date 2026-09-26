# GuGeeGoo 学生主页

静态站点，部署到 **Cloudflare Pages**。

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

## 环境变量

| 变量 | 说明 |
|------|------|
| `VITE_COS_PUBLIC_BASE_URL` | 腾讯云 COS/CDN 上 `public/` 的根 URL |

## 隐私

本应用 **不包含** `学习档案/`。规划 MD 仅通过 COS `private/planning/` 同步，由后续 Access + Worker 提供家长访问。

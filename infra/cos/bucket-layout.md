# COS 桶目录约定

| 前缀 | 内容 | ACL / 访问 |
|------|------|------------|
| `public/exercises/` | 学生练习 PDF（不含 answers） | 公有读 + CDN |
| `public/memo/` | 复习备忘 PDF | 公有读 |
| `private/planning/` | `学习档案/` 同步的 MD | **私有** |
| `private/answers/` | 答案 PDF（后续可选） | **私有** |

同步来源：`npm run stage:deploy` → `deploy/staging/`，再 `npm run sync:cos`。

## 桶策略要点

- `public/*`：允许匿名 `GetObject`（或通过 CDN）
- `private/*`：拒绝匿名；仅 CAM 用户 / 预签名 URL
- 不要将 `private/planning` 绑定到公有 CDN 域名

## CORS

上传 `cors.json` 时把 `AllowedOrigin` 改成你的 Cloudflare Pages 域名。

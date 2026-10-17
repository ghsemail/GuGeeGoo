# COS 桶目录约定

| 前缀 | 内容 | ACL / 访问 |
|------|------|------------|
| `public/exercises/` | 学生练习 PDF（不含 answers） | 公有读 + CDN |
| `public/memo/` | 复习备忘 PDF | 公有读 |
| `private/planning/` | `学习档案/` 同步的 MD | **私有** |
| `private/answers/` | 答案 PDF（后续可选） | **私有** |
| `private/photos/` | 家长批改/作业拍照（按学科·课程·作业名） | **私有** |

同步来源：
- 练习 / 备忘 / 学习档案：`npm run stage:deploy` → `deploy/staging/`，再 `npm run sync:cos`
- 批改拍照：`npm run sync:cos:photos`（固定清单 → `private/photos/…`）

## private/photos/ · 数学 · 学而思五年级秋（仅两大类）

```
private/photos/数学/学而思五年级秋/每日三题/第1周/lesson01-day1-graded.jpg
private/photos/数学/学而思五年级秋/每日三题/第1周/lesson01-yuanti-p1.jpg
private/photos/数学/学而思五年级秋/日积月累/第1讲/lecture01-p1.jpg
private/photos/数学/学校学习/第三单元综合素养评价/第三单元综合素养评价-第1-2页.jpg
```

- **学有所得讲义截图不进 COS**：留在仓库 `学科学习/…/课程资料/第N讲/第N讲讲义截图.*`
- 英语以后：`private/photos/英语/<单元-练习名>/<filename>`（本次不迁）

仓库内引用写法：`cos://gugeegoo-1256042904/<key>`（密钥不入库；读文件需 CAM / 预签名）。

## 桶策略要点

- `public/*`：允许匿名 `GetObject`（或通过 CDN）
- `private/*`：拒绝匿名；仅 CAM 用户 / 预签名 URL
- 不要将 `private/planning` 或 `private/photos` 绑定到公有 CDN 域名

## CORS

上传 `cors.json` 时把 `AllowedOrigin` 改成你的 Cloudflare Pages 域名。

# DNS 清单（示例）

按实际域名替换 `example.com`。

| 类型 | 名称 | 目标 | 说明 |
|------|------|------|------|
| CNAME | `www` | `<pages-project>.pages.dev` 或 Pages 提供的 target | 学生主页 |
| CNAME / 平铺 | `@` | Cloudflare Pages（apex） | 可选 |
| CNAME | `files` 或 `cdn` | COS 静态网站 / CDN 域名 | 公开 PDF |
| — | — | — | 私有桶 **不要** 绑公共 CDN |

COS 自定义源站若走 Cloudflare 代理：注意缓存规则，PDF 建议较长 `Cache-Control`。

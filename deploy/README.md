# deploy/

| 路径 | 说明 |
|------|------|
| `staging/` | `npm run stage:deploy` 生成的上传快照（可提交 Git，便于启动前核对） |
| `staging/private/planning/` | 来自 `学习档案/*.md`，对应 COS `private/planning/` |
| `staging/public/` | 学生可见 PDF 快照 |
| `staging/manifest.json` | 最近一次 staging 统计 |

**注意**：`private/` 含进度与错题，仓库若公开 GitHub，请保持仓库私有，或勿提交 `private/`（当前为家庭私有仓库，默认提交以便你「过两天直接 sync」）。

更新流程：改 `学习档案/` → `npm run stage:deploy` → `npm run sync:cos`。

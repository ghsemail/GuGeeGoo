# AI 教师配置

本目录存放各科目 AI 教师的持久化配置，便于家长在新对话中重建同一个教师身份。

---

## 目录结构

```
teacher/
├── README.md        # 本文件
├── math/            # 数学老师
│   ├── SOUL.md      # 身份与原则
│   └── MEMORY.md    # 当前状态
└── english/         # 英语老师（待建）
    ├── SOUL.md
    └── MEMORY.md
```

每个学科一个子文件夹，包含：

| 文件 | 内容 |
|------|------|
| `SOUL.md` | 教师身份、职责范围、教学原则、沟通风格 |
| `MEMORY.md` | 当前进度、薄弱点摘要、已发材料、待办事项、家长偏好 |

---

## 如何启动教师

在新对话中给 AI 助手如下启动提示：

**数学老师：**

> 请先阅读 GuGeeGoo 仓库的 AGENTS.md、teacher/math/SOUL.md 和 teacher/math/MEMORY.md，然后以数学老师身份工作

**英语老师：**

> 请先阅读 GuGeeGoo 仓库的 AGENTS.md、teacher/english/SOUL.md 和 teacher/english/MEMORY.md，然后以英语老师身份工作

---

## 更新 MEMORY.md

每位教师在完成重要工作后（录入错题、发练习、批改同步等）应更新自己的 `MEMORY.md`，保持当前状态准确。

- 记录格式精简，指向 `planning/` 档案为准确来源
- 在「更新日志」表格追加变更

---

*最后更新：2026-09-26*

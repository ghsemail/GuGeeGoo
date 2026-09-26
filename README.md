# GuGeeGoo — 顾景源的学习项目

这是为顾景源小朋友设计的学习项目，由家长规划内容、准备材料，景源以观看、互动、动手改参数等方式学习。

> **AI 协作约定**见 [`AGENTS.md`](./AGENTS.md)

## 目录结构

一级按 **功能** 分类，内部再按 **学科 → 年级** 组织：

```
GuGeeGoo/
├── 规划-planning/                    # 家长端：路线图、进度、档案
│   ├── roadmap.md                    # 学习路线图（总览，双学科）
│   ├── progress.md                   # 进度记录（按日期，双学科）
│   ├── english-profile.md            # 英语薄弱点档案
│   ├── english-mistake-book.md       # 英语错题本
│   ├── math-profile.md               # 数学薄弱点档案
│   └── math-mistake-book.md          # 数学错题本
│
├── 资料-materials/                   # 给景源看的学习材料
│   ├── 英语-english/五年级-grade5/
│   │   ├── 讲义-lessons/             # 知识点（Unit 1–6）
│   │   └── 练习-exercises/           # 练习（按单元分文件夹）
│   │       ├── 第N单元-unitN/        # 单元 PDF
│   │       │   └── 源文件-source/    # 单元源文件（MD）
│   │       └── 脚本-scripts/         # PDF 生成脚本
│   └── 数学-math/五年级-grade5/学而思五年级秋-xueersi-grade5-fall/
│       ├── 讲义-lessons/             # 讲次知识点
│       ├── 练习-exercises/           # 练习 PDF
│       │   └── 源文件-source/        # 练习 MD 源文件
│       └── 备忘-memo/                # 复习备忘
│
├── assets/images/                    # 插图、讲义扫描件
├── scripts/                          # PDF 生成工具
├── 老师-teacher/                     # AI 教师配置（各学科子文件夹，每次工作后更新 MEMORY.md）
├── AGENTS.md                         # AI 协作约定
└── README.md                         # 本文件
```

## 使用方式

1. 在 `规划-planning/` 查看总路线图、进度和档案
2. 学习材料放入 `资料-materials/<学科-subject>/<年级-grade>/`
3. 新学科或新年级按需新建子目录

## 材料格式

| 类型 | Markdown 源文件 | PDF 打印版 |
|------|-----------------|------------|
| 英语练习 | `资料-materials/英语-english/.../练习-exercises/第N单元-unitN/源文件-source/` | `资料-materials/英语-english/.../练习-exercises/第N单元-unitN/*.pdf` |
| 数学练习 | `资料-materials/数学-math/.../练习-exercises/源文件-source/` | `资料-materials/数学-math/.../练习-exercises/*.pdf` |
| 英语复习备忘 | `资料-materials/英语-english/.../练习-exercises/第N单元-unitN/源文件-source/unitN-memo.md` | `练习-exercises/第N单元-unitN/unitN-memo.pdf` |
| 数学复习备忘 | `资料-materials/数学-math/.../备忘-memo/` | 同目录 |

**不输出 HTML**，统一使用 MD + PDF。

## PDF 生成

```bash
# 英语（在 脚本-scripts/ 目录下执行）
cd 资料-materials/英语-english/五年级-grade5/练习-exercises/脚本-scripts
npm install
npm run unit1     # 生成 Unit 1 全部 PDF
npm run unit2     # 生成 Unit 2 全部 PDF
npm run memo1     # 生成 Unit 1 Memo PDF

# 数学（在仓库根目录执行）
npm run pdf -- 资料-materials/数学-math/五年级-grade5/学而思五年级秋-xueersi-grade5-fall/练习-exercises/源文件-source/xes-grade5-autumn-lesson01-practice1.md --answers xes-grade5-autumn-lesson01-practice1-answers.md
```

## 当前内容

### 英语（五年级上）

- `资料-materials/英语-english/五年级-grade5/讲义-lessons/english-grade5-sem1-unit*.md` — Unit 1–6 知识点
- `资料-materials/英语-english/五年级-grade5/练习-exercises/第1单元-unit1/` — Unit 1 练习 PDF（practice、quiz、weakpoint-review、memo、baseline）
- `资料-materials/英语-english/五年级-grade5/练习-exercises/第2单元-unit2/` — Unit 2 练习 PDF（practice + answers）
- `规划-planning/english-profile.md` — 英语薄弱点档案

### 数学（学而思五年级秋）

- `资料-materials/数学-math/五年级-grade5/学而思五年级秋-xueersi-grade5-fall/讲义-lessons/xes-grade5-autumn-index.md` — 讲次索引
- `资料-materials/数学-math/五年级-grade5/学而思五年级秋-xueersi-grade5-fall/讲义-lessons/xes-grade5-autumn-lesson01.md` — 第 1 讲知识点
- `资料-materials/数学-math/五年级-grade5/学而思五年级秋-xueersi-grade5-fall/练习-exercises/源文件-source/` — 第 1 讲练习（草稿）
- `规划-planning/math-profile.md` — 数学薄弱点档案

### 规划与追踪

- `规划-planning/roadmap.md` — 学习路线图（双学科）
- `规划-planning/progress.md` — 学习进度（双学科）
- `规划-planning/english-mistake-book.md` — 英语错题本
- `规划-planning/math-mistake-book.md` — 数学错题本

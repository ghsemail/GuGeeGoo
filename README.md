# GuGeeGoo — 顾景源的学习项目

这是为顾景源小朋友设计的学习项目，由家长规划内容、准备材料，景源以观看、互动、动手改参数等方式学习。

> **AI 协作约定**见 [`AGENTS.md`](./AGENTS.md)

## 目录结构

一级按 **功能** 分类，内部再按 **学科 → 年级** 组织：

```
GuGeeGoo/
├── 学习档案/                         # 家长端：路线图、进度、档案
│   ├── roadmap.md                    # 学习路线图（总览，双学科）
│   ├── progress.md                   # 进度记录（按日期，双学科）
│   ├── english-profile.md            # 英语薄弱点档案
│   ├── english-mistake-book.md       # 英语错题本
│   ├── math-profile.md               # 数学薄弱点档案
│   └── math-mistake-book.md          # 数学错题本
│
├── 学科学习/                         # 给景源看的学习材料
│   ├── 英语/五年级/
│   │   ├── 讲义/                     # 知识点（Unit 1–6）
│   │   └── 练习/                     # 练习（按单元分文件夹）
│   │       ├── 第N单元/              # 单元 PDF
│   │       │   └── 源文件/           # 单元源文件（MD）
│   │       └── 脚本/                 # PDF 生成脚本
│   └── 数学/五年级/学而思五年级秋/
│       ├── 讲义/                     # 讲次知识点
│       ├── 练习/                     # 练习 PDF
│       │   └── 源文件/               # 练习 MD 源文件
│       └── 备忘/                     # 复习备忘
│
├── assets/images/                    # 插图、讲义扫描件
├── scripts/                          # PDF 生成工具
├── 老师/                             # AI 教师配置（各学科子文件夹，每次工作后更新 MEMORY.md）
├── AGENTS.md                         # AI 协作约定
└── README.md                         # 本文件
```

## 使用方式

1. 在 `学习档案/` 查看总路线图、进度和档案
2. 学习材料放入 `学科学习/<学科>/<年级>/`
3. 新学科或新年级按需新建子目录

## 材料格式

| 类型 | Markdown 源文件 | PDF 打印版 |
|------|-----------------|------------|
| 英语练习 | `学科学习/英语/.../练习/第N单元/源文件/` | `学科学习/英语/.../练习/第N单元/*.pdf` |
| 数学练习 | `学科学习/数学/.../练习/源文件/` | `学科学习/数学/.../练习/*.pdf` |
| 英语复习备忘 | `学科学习/英语/.../练习/第N单元/源文件/unitN-memo.md` | `练习/第N单元/unitN-memo.pdf` |
| 数学复习备忘 | `学科学习/数学/.../备忘/` | 同目录 |

**不输出 HTML**，统一使用 MD + PDF。

## PDF 生成

```bash
# 英语（在 脚本/ 目录下执行）
cd 学科学习/英语/五年级/练习/脚本
npm install
npm run unit1     # 生成 Unit 1 全部 PDF
npm run unit2     # 生成 Unit 2 全部 PDF
npm run memo1     # 生成 Unit 1 Memo PDF

# 数学（在仓库根目录执行）
npm run pdf -- 学科学习/数学/五年级/学而思五年级秋/练习/源文件/xes-grade5-autumn-lesson01-practice1.md --answers xes-grade5-autumn-lesson01-practice1-answers.md
```

## 当前内容

### 英语（五年级上）

- `学科学习/英语/五年级/讲义/english-grade5-sem1-unit*.md` — Unit 1–6 知识点
- `学科学习/英语/五年级/练习/第1单元/` — Unit 1 练习 PDF（practice、quiz、weakpoint-review、memo、baseline）
- `学科学习/英语/五年级/练习/第2单元/` — Unit 2 练习 PDF（practice + answers）
- `学习档案/english-profile.md` — 英语薄弱点档案

### 数学（学而思五年级秋）

- `学科学习/数学/五年级/学而思五年级秋/讲义/xes-grade5-autumn-index.md` — 讲次索引
- `学科学习/数学/五年级/学而思五年级秋/讲义/xes-grade5-autumn-lesson01.md` — 第 1 讲知识点
- `学科学习/数学/五年级/学而思五年级秋/练习/源文件/` — 第 1 讲练习（草稿）
- `学习档案/math-profile.md` — 数学薄弱点档案

### 规划与追踪

- `学习档案/roadmap.md` — 学习路线图（双学科）
- `学习档案/progress.md` — 学习进度（双学科）
- `学习档案/english-mistake-book.md` — 英语错题本
- `学习档案/math-mistake-book.md` — 数学错题本

# GuGeeGoo — 顾景源的学习项目

这是为顾景源小朋友设计的学习项目，由家长规划内容、准备材料，景源以观看、互动、动手改参数等方式学习。

## 目录结构

一级按 **功能** 分类，内部再按 **学科 → 年级** 组织：

```
GuGeeGoo/
├── planning/                    # 家长端：教案、路线图、进度
│   ├── roadmap.md
│   ├── progress.md
│   └── lesson-plans/
│       └── 英语/五年级/...
│
├── materials/                   # 给景源看的学习材料
│   └── 英语/五年级/
│       ├── lessons/             # 知识点
│       ├── exercises/           # 练习 PDF
│       │   └── source/          # 练习 MD 源文件与生成脚本
│       └── memo/                # 复习备忘（MD + PDF）
│
└── assets/                      # 插图、模板等素材
    ├── images/
    └── templates/
```

> `code/` 目录暂不创建，需要时再添加。

## 使用方式

1. 在 `planning/` 查看总路线图和进度
2. 教案放入 `planning/lesson-plans/<学科>/<年级>/`
3. 学习材料放入 `materials/<学科>/<年级>/`
4. 新学科或新年级按需新建子目录，不预建空壳

## 材料格式

| 类型 | Markdown 源文件 | PDF 打印版 |
|------|-----------------|------------|
| 练习 | `materials/英语/五年级/exercises/source/` | `materials/英语/五年级/exercises/*.pdf` |
| 复习备忘 | `materials/英语/五年级/memo/` | 同目录 |

不输出 HTML。练习 PDF：在 `exercises/source/` 运行 `node generate-pdfs.mjs`。备忘 PDF：在 `memo/` 运行 `node generate-pdf.mjs`（可选：在 `exercises/source/` 安装 puppeteer）。

## 当前内容

- `materials/英语/五年级/lessons/english-grade5-sem1-unit1.md` — 英语五年级上 Unit 1
- `planning/roadmap.md` — 学习路线图
- `planning/progress.md` — 学习进度
- `planning/mistake-book.md` — 错题本
- `materials/英语/五年级/memo/unit1-review-memo.pdf` — Unit 1 易错点复习备忘（课后用）

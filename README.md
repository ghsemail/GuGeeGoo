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
│       ├── lessons/
│       ├── exercises/
│       └── printables/
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

## 当前内容

- `materials/英语/五年级/lessons/english-grade5-sem1-unit1.md` — 英语五年级上 Unit 1
- `planning/roadmap.md` — 学习路线图
- `planning/progress.md` — 学习进度

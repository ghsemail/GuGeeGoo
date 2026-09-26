# 英语 · 每单元出题原则

> 汇总本仓库已有的英语出题约定，仅整理现有规则，未新增内容。
>
> **来源文件**：
> - `资料-materials/英语-english/五年级-grade5/练习-exercises/UNIT-STANDARD.md`
> - `AGENTS.md` §6、§11
> - `老师-teacher/英语-english/SOUL.md`
> - `老师-teacher/英语-english/MEMORY.md`

---

## 1. 每单元 4 类材料

> 来源：`资料-materials/英语-english/五年级-grade5/练习-exercises/UNIT-STANDARD.md`

| 类型 | 命名 | 说明 |
|------|------|------|
| 四天巩固 | `unitN-practice.pdf` + `unitN-practice-answers.pdf` | 4 页练习，答案合订不分页 |
| Memo | `memo/unitN-memo.pdf` | 易错点备忘，课后看，**不是**测验 |
| 单元小测 | `unitN-quiz.pdf` + `unitN-quiz-answers.pdf` | 整单元短测（约 5～8 题） |
| 薄弱点回顾训练 | `unitN-weakpoint-review.pdf` + 答案 | 针对档案薄弱点，可大字 |

### 源文件（`练习-exercises/第N单元-unitN/源文件-source/`）

- `english-grade5-sem1-unitN-day1.md` … `day4.md`
- `english-grade5-sem1-unitN-practice-answers.md`
- `english-grade5-sem1-unitN-quiz.md` + `-answers.md`
- `english-grade5-sem1-unitN-weakpoint-review.md` + `-answers.md`
- `english-grade5-sem1-unitN-index.md`
- `unitN-memo.md`（Memo 源文件）

### 生成脚本（`练习-exercises/脚本-scripts/`）

- `generate-unit1-pdfs.mjs`、`generate-unit2-pdfs.mjs`
- `generate-memo-pdf.mjs`
- `pdf-theme.mjs`、`package.json`

### 不含在本标准内

- 首次基线作业（Unit 1 已存档为 `unit1-baseline`）
- 独立的「记忆曲线」间隔测（若以后需要再增第五类）

---

## 2. 题量与字号

> 来源：`AGENTS.md` §6、§11 + `UNIT-STANDARD.md`

| 类型 | 题量 | 字号 | 备注 |
|------|------|------|------|
| 每日巩固练 | 7–10 题 | 17–20px | A4 每日一页，覆盖多个知识点 |
| 单元小测 | **5–8 题** ¹ | 20px+ | 聚焦 1–2 个薄弱点 |
| 复习备忘 | — | — | 单页卡片式 |
| 薄弱点回顾 | — | 可大字 | 针对档案薄弱点 |

**¹ 文档差异说明**：`UNIT-STANDARD.md` 写「约 5～8 题」，`AGENTS.md` §11 写「小测 5 题」；两条规则并存，暂不统一。

---

## 3. 出题依据

### 知识点来源

> 来源：`资料-materials/英语-english/五年级-grade5/讲义-lessons/english-grade5-sem1-unitN.md`

每单元知识点文件包含：
- 课文原文与翻译
- 核心词块
- 重点短语
- 语法点
- 重点句型

### 薄弱点来源

> 来源：`规划-planning/english-profile.md`

按「当前关注」表格中的 WP-xxx 编号出题，覆盖当前薄弱点。

### 教材版本

牛津沪教版五年级上册

---

## 4. 家长判分 / 作答要求

> 来源：`老师-teacher/英语-english/MEMORY.md` 家长偏好

| 项目 | 要求 |
|------|------|
| 短语完整性 | 动词短语必须写完整（只写 Take 不写 Take off **算错**）；题目说明要明确要求写完整短语 |
| 祈使句大写 | 句首大写的祈使句动词算对（Try / try 都对） |
| 判分严格度 | 偏严格，培养写完整短语的习惯 |

---

## 5. 卷面格式

> 来源：`老师-teacher/英语-english/SOUL.md`

### 练习卷

| 项目 | 格式 |
|------|------|
| 标题 | 「Unit X 主题名 巩固练习」 |
| 内部序号 | **不带**（不写「练习 1」「练习 2」） |
| 副标题行 | 左「顾景源 · 五年级英语 · 牛津沪教版」，右「日期：________」 |
| 姓名栏 | **不要** |

### 答案卷

| 项目 | 格式 |
|------|------|
| 标注 | 「家长专用」 |
| 日期栏 | **无** |

### 学生可见内容禁止包含

- WP-xxx / MP-xxx 编码
- 知识点标签
- 内部来源标注（如「Day 3 Q9」）

### 输出格式

**只用 MD + PDF，绝不输出 HTML**

---

## 6. 流程

> 来源：`AGENTS.md` §7

```
草稿 → roadmap/index 标「待家长确认」→ 生成 PDF → 批改后四档同步
```

1. **草稿**：创建 `源文件-source/english-grade5-sem1-unitN-*.md` 及 `-answers.md`
2. **家长确认**：在 roadmap 或 index 标注「待家长确认」
3. **生成 PDF**：确认后执行 `npm run pdf`
4. **批改 → 四档同步**（见 AGENTS.md §5）

---

## 7. 各单元完成情况

> 检查日期：2026-09-26

| 单元 | 四天巩固 | Memo | 单元小测 | 薄弱点回顾 | 状态 |
|------|----------|------|----------|------------|------|
| Unit 1 | ✓ | ✓ | ✓ | ✓ | **完成** |
| Unit 2 | ✓ | ✗ | ✗ | ✗ | 进行中 |
| Unit 3 | ✗ | ✗ | ✗ | ✗ | 未开始 |
| Unit 4 | ✗ | ✗ | ✗ | ✗ | 未开始 |
| Unit 5 | ✗ | ✗ | ✗ | ✗ | 未开始 |
| Unit 6 | ✗ | ✗ | ✗ | ✗ | 未开始 |

**验证文件**：
- Unit 1：`第1单元-unit1/unit1-practice.pdf`、`第1单元-unit1/unit1-memo.pdf`、`第1单元-unit1/unit1-quiz.pdf`、`第1单元-unit1/unit1-weakpoint-review.pdf`（均有对应答案）
- Unit 2：`第2单元-unit2/unit2-practice.pdf`（有答案）

---

*最后更新：2026-09-26*

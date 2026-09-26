# 已弃用脚本

本目录下的以下脚本已被统一的 PDF 生成器取代：

- `generate-pdfs.mjs` — 原 Unit 1 PDF 生成
- `generate-unit2-pdfs.mjs` — 原 Unit 2 PDF 生成
- `generate-quiz-pdf.mjs` — 原小测 PDF 生成
- `generate-answers-pdf.mjs` — 原答案 PDF 生成
- `pdf-theme.mjs` — 原样式定义

## 新的生成方式

请在仓库根目录使用统一生成器：

```bash
# 生成练习 PDF
npm run pdf -- materials/英语/五年级/exercises/source/<文件名>.md

# 同时生成答案 PDF
npm run pdf -- materials/英语/五年级/exercises/source/<文件名>.md --answers <答案文件名>.md
```

详见 `README.md` 和 `AGENTS.md`。

## 保留原因

这些脚本暂时保留，以便：
1. 查阅原有实现方式
2. 需要时参考特定的多页合并逻辑

如需删除，请确保现有 PDF 可通过新生成器复现。

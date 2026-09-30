#!/usr/bin/env node
/**
 * 从 学习资料/WY五上测试卷.pdf 按单元切出题目页 / 答案页（扫描版，保留原页）。
 * A4 重排版请用：npm run pdf -- …/第N单元-综合素养练.md --answers …-答案.md
 *
 * 用法：node scripts/split-wy-test-pdf.mjs [单元号，默认 1]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(
  ROOT,
  "学科学习/英语/五年级/学习资料/WY五上测试卷.pdf"
);

/** @type {Record<number, { questionPages: number[]; answerPage: number; answerCropWidthRatio?: number }>} */
const UNIT_MAP = {
  1: { questionPages: [1, 2], answerPage: 17, answerCropWidthRatio: 0.52 },
  2: { questionPages: [3, 4], answerPage: 17, answerCropWidthRatio: 0.38, answerCropXRatio: 0.62 },
  // 3–6 等家长确认后再补 crop 参数
};

const unitNum = Number(process.argv[2] || "1");
const cfg = UNIT_MAP[unitNum];
if (!cfg) {
  console.error("未配置单元", unitNum);
  process.exit(1);
}

async function buildQuestionPdf(srcDoc, pageNumbers1Based) {
  const out = await PDFDocument.create();
  const indices = pageNumbers1Based.map((n) => n - 1);
  const copied = await out.copyPages(srcDoc, indices);
  for (const p of copied) out.addPage(p);
  return out;
}

async function buildAnswerPdf(srcDoc, page1Based, crop) {
  const out = await PDFDocument.create();
  const [page] = await out.copyPages(srcDoc, [page1Based - 1]);
  const { width, height } = page.getSize();
  if (crop?.widthRatio && crop.widthRatio < 1) {
    const x = (crop.xRatio || 0) * width;
    const w = crop.widthRatio * width;
    page.setCropBox(x, 0, x + w, height);
    page.setMediaBox(x, 0, x + w, height);
  }
  out.addPage(page);
  return out;
}

const name = "综合素养练";
const bytes = await fs.readFile(SRC);
const srcDoc = await PDFDocument.load(bytes);

const unitDir = path.join(
  ROOT,
  `学科学习/英语/五年级/练习/第${unitNum}单元`
);
const srcDir = path.join(unitDir, "源文件");
await fs.mkdir(srcDir, { recursive: true });

const qDoc = await buildQuestionPdf(srcDoc, cfg.questionPages);
const qPdf = path.join(unitDir, `第${unitNum}单元-${name}.pdf`);
await fs.writeFile(qPdf, await qDoc.save());

const crop =
  cfg.answerCropWidthRatio != null
    ? {
        xRatio: cfg.answerCropXRatio || 0,
        widthRatio: cfg.answerCropWidthRatio,
      }
    : null;
const aDoc = await buildAnswerPdf(srcDoc, cfg.answerPage, crop);
const aPdf = path.join(unitDir, `第${unitNum}单元-${name}-答案.pdf`);
await fs.writeFile(aPdf, await aDoc.save());

const qMd = `# 第${unitNum}单元 · ${name}

> 顾景源 · 五年级英语 · 外研五上  
> **来源：** \`学习资料/WY五上测试卷.pdf\` 第 ${cfg.questionPages.join("、")} 页  
> **打印版：** \`第${unitNum}单元-${name}.pdf\`

---

题目为扫描页，完整版见同目录 PDF。
`;
const aMd = `# 第${unitNum}单元 · ${name} · 参考答案

> 家长专用  
> **来源：** \`学习资料/WY五上测试卷.pdf\` 第 ${cfg.answerPage} 页（Unit ${unitNum} 答案区）  
> **打印版：** \`第${unitNum}单元-${name}-答案.pdf\`

---

答案为扫描页，完整版见同目录 PDF。
`;

await fs.writeFile(
  path.join(srcDir, `第${unitNum}单元-${name}.md`),
  qMd,
  "utf8"
);
await fs.writeFile(
  path.join(srcDir, `第${unitNum}单元-${name}-答案.md`),
  aMd,
  "utf8"
);

console.log("OK", qPdf);
console.log("OK", aPdf);

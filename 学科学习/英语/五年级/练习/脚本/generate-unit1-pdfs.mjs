import { createRequire } from "node:module";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { answersCss, quizCss, worksheetCss } from "./pdf-theme.mjs";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer");

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(scriptDir, "../第1单元/源文件");
const outDir = path.join(scriptDir, "../第1单元");
const U1 = "第1单元";

const answersCssWithTable = `${answersCss}
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px;
    font-size: 16px;
  }
  th, td {
    border: 1px solid #333;
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
  }
  th { background: #f0f0f0; font-weight: 700; }
`;

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function blanksToUnderline(text) {
  return text
    .replace(/_{20,}/g, "<u>　　　　　　　　　　　</u>")
    .replace(/_{10,}/g, "<u>　　　　　　　</u>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function mdWorksheetBody(md) {
  const lines = md.split(/\r?\n/);
  const body = [];

  for (const line of lines) {
    if (line.startsWith("# ")) continue;
    if (line.startsWith("> ")) continue;
    if (line === "---") continue;
    if (line.trim() === "") continue;

    if (line.startsWith("## ")) {
      body.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith("*") && line.endsWith("*") && !line.startsWith("**")) {
      body.push(`<p class="hint"><em>${escapeHtml(line.slice(1, -1))}</em></p>`);
      continue;
    }

    body.push(`<p>${blanksToUnderline(escapeHtml(line))}</p>`);
  }

  return body.join("\n");
}

function mdWorksheetSection(md, { title, meta }) {
  return `
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">${escapeHtml(meta)}</div>
  ${mdWorksheetBody(md)}`;
}

function mdMultiDayWorksheetToHtml(dayFiles, css) {
  const sections = dayFiles.map((file, i) => {
    const md = readFileSync(path.join(dir, file), "utf8");
    const titleMatch = md.match(/^# (.+)/m);
    const title = titleMatch ? titleMatch[1] : `Unit 1 · Day ${i + 1}`;
    const inner = mdWorksheetSection(md, {
      title,
      meta: "顾景源 · 五年级英语",
    });
    const cls = i === 0 ? "sheet" : "sheet page-break";
    return `<section class="${cls}">${inner}</section>`;
  });

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><style>${css}</style></head>
<body>${sections.join("\n")}</body></html>`;
}

function mdSingleWorksheetToHtml(md, { title, meta, css }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><style>${css}</style></head>
<body>${mdWorksheetSection(md, { title, meta })}</body></html>`;
}

function parseTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function isTableSeparator(line) {
  return /^\|[\s\-:|]+\|$/.test(line.trim());
}

function mdTableToHtml(rows) {
  if (rows.length === 0) return "";
  const [header, ...dataRows] = rows;
  const head = header.map((c) => `<th>${blanksToUnderline(escapeHtml(c))}</th>`).join("");
  const tbody = dataRows
    .map(
      (row) =>
        `<tr>${row.map((c) => `<td>${blanksToUnderline(escapeHtml(c))}</td>`).join("")}</tr>`
    )
    .join("\n");
  return `<table><thead><tr>${head}</tr></thead><tbody>${tbody}</tbody></table>`;
}

function mdAnswersToHtml(md, { title, meta, css }) {
  const lines = md.split(/\r?\n/);
  const body = [];

  for (let i = 0; i < lines.length; ) {
    const line = lines[i];

    if (line.startsWith("# ")) {
      i++;
      continue;
    }
    if (line.startsWith("> ")) {
      i++;
      continue;
    }
    if (line === "---") {
      i++;
      continue;
    }
    if (line.trim() === "") {
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      body.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      body.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
      i++;
      continue;
    }

    if (line.trim().startsWith("|")) {
      const tableRows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        if (!isTableSeparator(lines[i])) {
          tableRows.push(parseTableRow(lines[i]));
        }
        i++;
      }
      body.push(mdTableToHtml(tableRows));
      continue;
    }

    body.push(`<p>${blanksToUnderline(escapeHtml(line))}</p>`);
    i++;
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><style>${css}</style></head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">${escapeHtml(meta)}</div>
  ${body.join("\n")}
</body></html>`;
}

async function buildPdf(html, pdfPath, tmpName) {
  const tmp = path.join(scriptDir, tmpName);
  writeFileSync(tmp, html, "utf8");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.goto(`file://${tmp}`, { waitUntil: "networkidle0" });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "16mm", right: "18mm", bottom: "16mm", left: "18mm" },
  });
  await browser.close();
  unlinkSync(tmp);
  console.log("Generated", pdfPath);
}

const practiceDays = [1, 2, 3, 4].map((n) => `${U1}-四天巩固-第${n}天.md`);

await buildPdf(
  mdMultiDayWorksheetToHtml(practiceDays, worksheetCss),
  path.join(outDir, `${U1}-四天巩固.pdf`),
  ".tmp-unit1-practice.html"
);

await buildPdf(
  mdAnswersToHtml(
    readFileSync(path.join(dir, `${U1}-四天巩固-答案.md`), "utf8"),
    {
      title: "Unit 1 · 四天巩固 · 参考答案",
      meta: "家长专用 · 合订不分页",
      css: answersCssWithTable,
    }
  ),
  path.join(outDir, `${U1}-四天巩固-答案.pdf`),
  ".tmp-unit1-practice-answers.html"
);

const quizMd = readFileSync(path.join(dir, `${U1}-单元小测.md`), "utf8");
await buildPdf(
  mdSingleWorksheetToHtml(quizMd, {
    title: "Unit 1 · 单元小测",
    meta: "顾景源 · 五年级英语",
    css: worksheetCss,
  }),
  path.join(outDir, `${U1}-单元小测.pdf`),
  ".tmp-unit1-quiz.html"
);

await buildPdf(
  mdAnswersToHtml(
    readFileSync(path.join(dir, `${U1}-单元小测-答案.md`), "utf8"),
    {
      title: "Unit 1 · 单元小测 · 参考答案",
      meta: "家长专用",
      css: answersCssWithTable,
    }
  ),
  path.join(outDir, `${U1}-单元小测-答案.pdf`),
  ".tmp-unit1-quiz-answers.html"
);

const weakMd = readFileSync(path.join(dir, `${U1}-薄弱点回顾训练.md`), "utf8");
await buildPdf(
  mdSingleWorksheetToHtml(weakMd, {
    title: "Unit 1 · 薄弱点回顾训练",
    meta: "顾景源 · 五年级英语 · WP-001 / WP-002",
    css: quizCss,
  }),
  path.join(outDir, `${U1}-薄弱点回顾训练.pdf`),
  ".tmp-unit1-weakpoint.html"
);

await buildPdf(
  mdAnswersToHtml(
    readFileSync(path.join(dir, `${U1}-薄弱点回顾训练-答案.md`), "utf8"),
    {
      title: "Unit 1 · 薄弱点回顾训练 · 参考答案",
      meta: "家长专用",
      css: quizCss,
    }
  ),
  path.join(outDir, `${U1}-薄弱点回顾训练-答案.pdf`),
  ".tmp-unit1-weakpoint-answers.html"
);

const baselineMd = readFileSync(path.join(dir, `${U1}-基线测评-存档.md`), "utf8");
await buildPdf(
  mdSingleWorksheetToHtml(baselineMd, {
    title: "Unit 1 · 基线测评（存档）",
    meta: "顾景源 · 五年级英语 · 2026-09-05",
    css: worksheetCss,
  }),
  path.join(outDir, `${U1}-基线测评-存档.pdf`),
  ".tmp-unit1-baseline.html"
);

await buildPdf(
  mdAnswersToHtml(
    readFileSync(path.join(dir, `${U1}-基线测评-存档-答案.md`), "utf8"),
    {
      title: "Unit 1 · 基线测评 · 参考答案",
      meta: "家长专用 · 存档",
      css: answersCss,
    }
  ),
  path.join(outDir, `${U1}-基线测评-存档-答案.pdf`),
  ".tmp-unit1-baseline-answers.html"
);

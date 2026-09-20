import { createRequire } from "node:module";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { answersCss, quizCss } from "./pdf-theme.mjs";

const require = createRequire(import.meta.url);
const puppeteer = require("../../../../exercises/node_modules/puppeteer");

const dir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(dir, "..");

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

function mdWorksheetToHtml(md, { title, meta, css }) {
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

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><style>${css}</style></head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">${escapeHtml(meta)}</div>
  ${body.join("\n")}
</body></html>`;
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
  const body = dataRows
    .map(
      (row) =>
        `<tr>${row.map((c) => `<td>${blanksToUnderline(escapeHtml(c))}</td>`).join("")}</tr>`
    )
    .join("\n");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
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
  const tmp = path.join(dir, tmpName);
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

const quizMd = readFileSync(
  path.join(dir, "english-grade5-sem1-unit1-quiz-wp001-wp002.md"),
  "utf8"
);
const answersMd = readFileSync(
  path.join(dir, "english-grade5-sem1-unit1-quiz-wp001-wp002-answers.md"),
  "utf8"
);

await buildPdf(
  mdWorksheetToHtml(quizMd, {
    title: "Unit 1 · 薄弱点小测",
    meta: "顾景源 · 五年级英语 · WP-001 复数 · WP-002 a lot of",
    css: quizCss,
  }),
  path.join(outDir, "unit1-quiz-wp001-wp002.pdf"),
  ".tmp-quiz.html"
);

await buildPdf(
  mdAnswersToHtml(answersMd, {
    title: "Unit 1 · 薄弱点小测 · 参考答案",
    meta: "家长专用",
    css: quizCss,
  }),
  path.join(outDir, "unit1-quiz-wp001-wp002-answers.pdf"),
  ".tmp-quiz-answers.html"
);

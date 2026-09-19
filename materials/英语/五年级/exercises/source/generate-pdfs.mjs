import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { answersCss, worksheetCss } from "./pdf-theme.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(dir, "..");
const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

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

function mdWorksheetToHtml(md, { title, meta }) {
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
      body.push(`<p><em>${escapeHtml(line.slice(1, -1))}</em></p>`);
      continue;
    }

    body.push(`<p>${blanksToUnderline(escapeHtml(line))}</p>`);
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><style>${worksheetCss}</style></head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">${escapeHtml(meta)}</div>
  ${body.join("\n")}
</body></html>`;
}

function mdAnswersToHtml(md, { title, meta }) {
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
    if (line.startsWith("### ")) {
      body.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
      continue;
    }

    body.push(`<p>${blanksToUnderline(escapeHtml(line))}</p>`);
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><style>${answersCss}</style></head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">${escapeHtml(meta)}</div>
  ${body.join("\n")}
</body></html>`;
}

function mdDay2MultiPageToHtml(parts) {
  const sections = parts.map((part, i) => {
    const md = readFileSync(part.path, "utf8");
    const titleMatch = md.match(/^# (.+)/);
    const title = titleMatch ? titleMatch[1] : `Day 2-${i + 1}`;
    const inner = mdWorksheetToHtml(md, {
      title,
      meta: "顾景源 · 五年级英语",
    })
      .replace(/^[\s\S]*<body>/, "")
      .replace(/<\/body>[\s\S]*$/, "");
    const cls = i === 0 ? "sheet" : "sheet page-break";
    return `<section class="${cls}">${inner}</section>`;
  });

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><style>${worksheetCss}</style></head>
<body>${sections.join("\n")}</body></html>`;
}

function printPdf(htmlPath, pdfPath) {
  const url = `file:///${htmlPath.replace(/\\/g, "/")}`;
  execFileSync(CHROME, [
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--print-to-pdf=${pdfPath}`,
    url,
  ]);
}

function buildPdf(html, pdfPath) {
  const tmp = path.join(dir, `.tmp-${path.basename(pdfPath)}.html`);
  writeFileSync(tmp, html, "utf8");
  printPdf(tmp, pdfPath);
  unlinkSync(tmp);
  console.log("Generated", pdfPath);
}

// Day 1
buildPdf(
  mdWorksheetToHtml(
    readFileSync(path.join(dir, "english-grade5-sem1-unit1-day1.md"), "utf8"),
    { title: "Unit 1 · Day 1", meta: "顾景源 · 五年级英语" }
  ),
  path.join(outDir, "unit1-day1.pdf")
);

buildPdf(
  mdAnswersToHtml(
    readFileSync(path.join(dir, "english-grade5-sem1-unit1-day1-answers.md"), "utf8"),
    { title: "Unit 1 · Day 1 · 参考答案", meta: "家长专用" }
  ),
  path.join(outDir, "unit1-day1-answers.pdf")
);

// Day 2 (4 pages)
const day2Parts = [1, 2, 3, 4].map((n) => ({
  path: path.join(dir, `english-grade5-sem1-unit1-day2-part${n}.md`),
}));
buildPdf(mdDay2MultiPageToHtml(day2Parts), path.join(outDir, "unit1-day2.pdf"));

buildPdf(
  mdAnswersToHtml(
    readFileSync(path.join(dir, "english-grade5-sem1-unit1-day2-answers.md"), "utf8"),
    { title: "Unit 1 · Day 2 · 参考答案", meta: "家长专用" }
  ),
  path.join(outDir, "unit1-day2-answers.pdf")
);

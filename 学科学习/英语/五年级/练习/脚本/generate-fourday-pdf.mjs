/**
 * Generate 第N单元-四天巩固.pdf + 答案 PDF only.
 * Usage: node generate-fourday-pdf.mjs 3 [4 5 6 ...]
 */
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { answersCss, worksheetCss } from "./pdf-theme.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const units = process.argv.slice(2).map(Number).filter(Boolean);
if (units.length === 0) {
  console.error("Usage: node generate-fourday-pdf.mjs <unitNum> [...]");
  process.exit(1);
}

const answersCssWithTable = `${answersCss}
  table { width: 100%; border-collapse: collapse; margin: 10px 0 14px; font-size: 16px; }
  th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f0f0f0; font-weight: 700; }
  h2, h3 { page-break-after: avoid; }
`;

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function blanksToUnderline(text) {
  return text
    .replace(/_{20,}/g, "<u>　　　　　　　　　　　</u>")
    .replace(/_{10,}/g, "<u>　　　　　　　</u>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
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

function mdWorksheetBody(md) {
  const lines = md.split(/\r?\n/);
  const body = [];
  for (let i = 0; i < lines.length; ) {
    const line = lines[i];
    if (line.startsWith("# ") || line.startsWith("> ") || line === "---" || line.trim() === "") {
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      body.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
      i++;
      continue;
    }
    if (line.startsWith("*") && line.endsWith("*") && !line.startsWith("**")) {
      body.push(`<p class="hint"><em>${escapeHtml(line.slice(1, -1))}</em></p>`);
      i++;
      continue;
    }
    if (line.startsWith("- [ ]")) {
      body.push(`<p>${escapeHtml(line.replace(/^- \[ \]\s*/, "☐ "))}</p>`);
      i++;
      continue;
    }
    if (line.trim().startsWith("|")) {
      const tableRows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        if (!isTableSeparator(lines[i])) tableRows.push(parseTableRow(lines[i]));
        i++;
      }
      body.push(mdTableToHtml(tableRows));
      continue;
    }
    body.push(`<p>${blanksToUnderline(escapeHtml(line))}</p>`);
    i++;
  }
  return body.join("\n");
}

function mdWorksheetSection(md, { title, meta }) {
  return `<h1>${escapeHtml(title)}</h1><div class="meta">${escapeHtml(meta)}</div>${mdWorksheetBody(md)}`;
}

function mdMultiDayWorksheetToHtml(dayFiles, dir, css) {
  const sections = dayFiles.map((file, i) => {
    const md = readFileSync(path.join(dir, file), "utf8");
    const titleMatch = md.match(/^# (.+)/m);
    const title = titleMatch ? titleMatch[1] : `Day ${i + 1}`;
    const inner = mdWorksheetSection(md, { title, meta: "顾景源 · 五年级英语" });
    const cls = i === 0 ? "sheet" : "sheet page-break";
    return `<section class="${cls}">${inner}</section>`;
  });
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><style>${css}</style></head><body>${sections.join("\n")}</body></html>`;
}

function mdAnswersToHtml(md, { title, meta, css }) {
  const lines = md.split(/\r?\n/);
  const body = [];
  for (let i = 0; i < lines.length; ) {
    const line = lines[i];
    if (line.startsWith("# ") || line.startsWith("> ") || line === "---" || line.trim() === "") {
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
        if (!isTableSeparator(lines[i])) tableRows.push(parseTableRow(lines[i]));
        i++;
      }
      body.push(mdTableToHtml(tableRows));
      continue;
    }
    body.push(`<p>${blanksToUnderline(escapeHtml(line))}</p>`);
    i++;
  }
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><style>${css}</style></head><body><h1>${escapeHtml(title)}</h1><div class="meta">${escapeHtml(meta)}</div>${body.join("\n")}</body></html>`;
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

for (const n of units) {
  const U = `第${n}单元`;
  const dir = path.join(scriptDir, `../${U}/源文件`);
  const outDir = path.join(scriptDir, `../${U}`);
  const dayFiles = [1, 2, 3, 4].map((d) => `${U}-四天巩固-第${d}天.md`);
  await buildPdf(
    mdMultiDayWorksheetToHtml(dayFiles, dir, worksheetCss),
    path.join(outDir, `${U}-四天巩固.pdf`),
    `.tmp-u${n}-fourday.html`
  );
  const answersMd = readFileSync(path.join(dir, `${U}-四天巩固-答案.md`), "utf8");
  await buildPdf(
    mdAnswersToHtml(answersMd, {
      title: `Unit ${n} · 四天练习 · 参考答案`,
      meta: "家长专用 · 合订不分页",
      css: answersCssWithTable,
    }),
    path.join(outDir, `${U}-四天巩固-答案.pdf`),
    `.tmp-u${n}-fourday-ans.html`
  );
}

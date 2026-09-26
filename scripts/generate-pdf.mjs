#!/usr/bin/env node
/**
 * 统一 PDF 生成器
 * 
 * 用法：
 *   npm run pdf -- <练习MD路径> [选项]
 * 
 * 选项：
 *   --answers <答案MD路径>   同时生成答案 PDF
 *   --out <输出目录>         指定输出目录（默认：MD 文件的上级目录）
 *   --type <类型>            worksheet | quiz | answers | memo（默认自动检测）
 *   --title <标题>           覆盖 MD 中的标题
 *   --meta <元信息>          覆盖 MD 中的元信息
 *   --multi <文件1,文件2>    多页练习模式，逗号分隔文件名
 * 
 * 示例：
 *   npm run pdf -- materials/英语/五年级/exercises/source/english-grade5-sem1-unit2-day1.md
 *   npm run pdf -- materials/数学/五年级/学而思五年级秋/exercises/source/xes-grade5-autumn-lesson01-practice1.md --answers xes-grade5-autumn-lesson01-practice1-answers.md
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { worksheetCss, quizCss, answersCss, memoCss } from "./pdf-theme.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(args) {
  const result = { files: [], options: {} };
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      result.options[key] = args[++i] || true;
    } else {
      result.files.push(arg);
    }
    i++;
  }
  return result;
}

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

function extractMeta(md) {
  const titleMatch = md.match(/^# (.+)/m);
  const metaMatch = md.match(/^> (.+?)(?:\n|$)/m);
  return {
    title: titleMatch ? titleMatch[1] : "练习",
    meta: metaMatch ? metaMatch[1].replace(/\*\*/g, "") : "",
  };
}

function detectType(filename, md) {
  const lower = filename.toLowerCase();
  if (lower.includes("quiz")) return "quiz";
  if (lower.includes("answers") || lower.includes("answer")) return "answers";
  if (lower.includes("memo")) return "memo";
  if (md.includes("家长专用")) return "answers";
  return "worksheet";
}

function getCss(type) {
  switch (type) {
    case "quiz": return quizCss;
    case "answers": return answersCss;
    case "memo": return memoCss;
    default: return worksheetCss;
  }
}

function mdToHtmlBody(md) {
  const lines = md.split(/\r?\n/);
  const body = [];

  for (let i = 0; i < lines.length; ) {
    const line = lines[i];

    if (line.startsWith("# ")) { i++; continue; }
    if (line.startsWith("> ")) { i++; continue; }
    if (line === "---") { i++; continue; }
    if (line.trim() === "") { i++; continue; }

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
        if (!isTableSeparator(lines[i])) {
          tableRows.push(parseTableRow(lines[i]));
        }
        i++;
      }
      body.push(mdTableToHtml(tableRows));
      continue;
    }

    let processedLine = blanksToUnderline(escapeHtml(line));
    processedLine = processedLine.replace(/<!--.*?-->/g, "");
    body.push(`<p>${processedLine}</p>`);
    i++;
  }

  return body.join("\n");
}

function mdToHtml(md, { title, meta, css }) {
  const body = mdToHtmlBody(md);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><style>${css}</style></head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">${escapeHtml(meta)}</div>
  ${body}
</body></html>`;
}

function mdMultiToHtml(files, css, baseMeta) {
  const sections = files.map((file, i) => {
    const md = readFileSync(file, "utf8");
    const { title, meta } = extractMeta(md);
    const body = mdToHtmlBody(md);
    const cls = i === 0 ? "sheet" : "sheet page-break";
    return `<section class="${cls}">
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">${escapeHtml(meta || baseMeta)}</div>
  ${body}
</section>`;
  });

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><style>${css}</style></head>
<body>${sections.join("\n")}</body></html>`;
}

async function generatePdf(html, pdfPath) {
  const tmpHtml = pdfPath.replace(/\.pdf$/, ".tmp.html");
  writeFileSync(tmpHtml, html, "utf8");
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  
  const page = await browser.newPage();
  await page.goto(`file://${path.resolve(tmpHtml)}`, { waitUntil: "networkidle0" });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "16mm", right: "18mm", bottom: "16mm", left: "18mm" },
  });
  
  await browser.close();
  unlinkSync(tmpHtml);
  console.log(`✓ 已生成 ${pdfPath}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(`
用法: npm run pdf -- <练习MD路径> [选项]

选项:
  --answers <答案MD路径>   同时生成答案 PDF
  --out <输出目录>         指定输出目录（默认：MD 文件的上级目录）
  --type <类型>            worksheet | quiz | answers | memo
  --title <标题>           覆盖标题
  --meta <元信息>          覆盖元信息
  --multi <文件列表>       多页模式，逗号分隔

示例:
  npm run pdf -- materials/英语/五年级/exercises/source/english-grade5-sem1-unit2-day1.md
  npm run pdf -- materials/数学/五年级/学而思五年级秋/exercises/source/xes-grade5-autumn-lesson01-practice1.md --answers xes-grade5-autumn-lesson01-practice1-answers.md
`);
    process.exit(0);
  }

  const { files, options } = parseArgs(args);
  
  if (files.length === 0) {
    console.error("错误：请指定 MD 文件路径");
    process.exit(1);
  }

  const inputPath = path.resolve(files[0]);
  if (!existsSync(inputPath)) {
    console.error(`错误：文件不存在 ${inputPath}`);
    process.exit(1);
  }

  const inputDir = path.dirname(inputPath);
  const inputName = path.basename(inputPath, ".md");
  const outDir = options.out ? path.resolve(options.out) : path.join(inputDir, "..");

  if (options.multi) {
    const multiFiles = options.multi.split(",").map(f => 
      path.isAbsolute(f.trim()) ? f.trim() : path.join(inputDir, f.trim())
    );
    const css = getCss(options.type || "worksheet");
    const html = mdMultiToHtml(multiFiles, css, options.meta || "顾景源");
    const pdfPath = path.join(outDir, `${inputName}.pdf`);
    await generatePdf(html, pdfPath);
  } else {
    const md = readFileSync(inputPath, "utf8");
    const { title: autoTitle, meta: autoMeta } = extractMeta(md);
    const type = options.type || detectType(inputPath, md);
    const css = getCss(type);

    const html = mdToHtml(md, {
      title: options.title || autoTitle,
      meta: options.meta || autoMeta,
      css,
    });

    const pdfPath = path.join(outDir, `${inputName.replace(/-answers$/, "")}.pdf`);
    await generatePdf(html, pdfPath);

    if (options.answers) {
      const answersPath = path.isAbsolute(options.answers)
        ? options.answers
        : path.join(inputDir, options.answers);
      
      if (!existsSync(answersPath)) {
        console.error(`警告：答案文件不存在 ${answersPath}`);
      } else {
        const answersMd = readFileSync(answersPath, "utf8");
        const { title: ansTitle, meta: ansMeta } = extractMeta(answersMd);
        const answersHtml = mdToHtml(answersMd, {
          title: ansTitle || `${autoTitle} · 参考答案`,
          meta: ansMeta || "家长专用",
          css: answersCss,
        });
        const answersPdfPath = path.join(outDir, `${inputName.replace(/-answers$/, "")}-answers.pdf`);
        await generatePdf(answersHtml, answersPdfPath);
      }
    }
  }
}

main().catch((err) => {
  console.error("生成失败:", err.message);
  process.exit(1);
});

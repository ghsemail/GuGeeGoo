import puppeteer from "puppeteer";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const mdPath = path.join(dir, "english-grade5-sem1-unit1-day2-answers.md");
const pdfPath = path.join(dir, "../英语/五年级/exercises/unit1-day2-answers.pdf");
const tmpHtml = path.join(dir, ".tmp-answers.html");

const md = readFileSync(mdPath, "utf8");
const body = md
  .replace(/^# .+\n/m, "")
  .replace(/^> .+\n/mg, "")
  .replace(/^---\n/mg, "")
  .replace(/^## Day 2-(\d)\n/gm, "<h2>Day 2-$1</h2>\n")
  .replace(/^### (.+)\n/gm, "<h3>$1</h3>\n")
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/^(\d+\. .+)\n/gm, "<p>$1</p>\n");

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 18mm 20mm; }
    body {
      font-family: "Noto Sans CJK SC", "Microsoft YaHei", sans-serif;
      font-size: 15px;
      line-height: 1.75;
      color: #000;
      margin: 0;
    }
    h1 { font-size: 22px; margin: 0 0 8px; }
    h2 { font-size: 17px; margin: 18px 0 8px; }
    h3 { font-size: 15px; margin: 10px 0 6px; }
    p { margin: 4px 0; }
    .meta { font-size: 14px; color: #333; margin-bottom: 16px; }
  </style>
</head>
<body>
  <h1>Unit 1 · Day 2 · 参考答案</h1>
  <div class="meta">家长专用</div>
  ${body}
</body>
</html>`;

writeFileSync(tmpHtml, html);

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.goto(`file://${tmpHtml}`, { waitUntil: "networkidle0" });
await page.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
});
await browser.close();
unlinkSync(tmpHtml);
console.log(`Generated ${pdfPath}`);

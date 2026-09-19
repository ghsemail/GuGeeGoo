import puppeteer from "puppeteer";
import { unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const pdfPath = path.join(dir, "../英语/五年级/exercises/unit1-review-memo.pdf");
const tmpHtml = path.join(dir, ".tmp-review-memo.html");

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 14mm 16mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Noto Sans CJK SC", "Microsoft YaHei", sans-serif;
      font-size: 14px;
      line-height: 1.55;
      color: #111;
      margin: 0;
    }
    h1 { font-size: 21px; margin: 0 0 4px; }
    .meta { font-size: 12px; color: #444; margin-bottom: 10px; }
    .note {
      font-size: 11px;
      color: #555;
      background: #f7f7f7;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 6px 10px;
      margin-bottom: 12px;
    }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .card {
      border: 1.5px solid #333;
      border-radius: 6px;
      padding: 10px 12px;
      break-inside: avoid;
    }
    .card.wide { grid-column: 1 / -1; }
    .card h2 {
      font-size: 15px;
      margin: 0 0 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #ccc;
    }
    .tag {
      display: inline-block;
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 4px;
      margin-left: 6px;
      vertical-align: middle;
    }
    .tag-warn { background: #ffe8e8; color: #a00; }
    .tag-ok { background: #e8f5e9; color: #2e7d32; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #bbb; padding: 5px 8px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    .wrong { color: #c62828; text-decoration: line-through; }
    .right { color: #1b5e20; font-weight: 700; }
    .tip { font-size: 12px; color: #333; margin: 6px 0 0; }
    .footer { margin-top: 10px; font-size: 12px; color: #555; text-align: center; }
  </style>
</head>
<body>
  <h1>Unit 1 · 易错点复习备忘</h1>
  <div class="meta">顾景源 · 五年级英语 · 错题本整理</div>
  <div class="note">用途：课后复习、做巩固练习前速查。<strong>日常练习用，考试不携带。</strong></div>

  <div class="grid">
    <div class="card">
      <h2>① 名词复数 <span class="tag tag-warn">还在练</span></h2>
      <table>
        <tr><th>记住</th><th>例子</th></tr>
        <tr><td>five → <span class="right">groups</span></td><td>five food <strong>groups</strong></td></tr>
        <tr><td>蔬菜类 → <span class="right">vegetables</span></td><td>fruit and <strong>vegetables</strong></td></tr>
      </table>
      <p class="tip"><strong>口诀：</strong>数得清（five）或很多种 → 加 <strong>s</strong></p>
    </div>

    <div class="card">
      <h2>② a lot of <span class="tag tag-warn">还在练</span></h2>
      <table>
        <tr><th>容易写错</th><th>正确写法</th></tr>
        <tr><td class="wrong">allot of</td><td class="right">a lot of</td></tr>
        <tr><td class="wrong">alot of</td><td class="right">a · lot · of</td></tr>
      </table>
      <p class="tip"><strong>口诀：</strong>三个词分开写；allot = 分配（别的词）</p>
    </div>

    <div class="card">
      <h2>③ shouldn't <span class="tag tag-ok">复习巩固</span></h2>
      <table>
        <tr><th>容易写错</th><th>正确写法</th></tr>
        <tr><td class="wrong">should'nt</td><td class="right">shouldn't</td></tr>
      </table>
      <p class="tip"><strong>口诀：</strong>撇号在 <strong>n</strong> 和 <strong>t</strong> 之间：should<strong>n't</strong></p>
    </div>

    <div class="card">
      <h2>④ take / eat <span class="tag tag-ok">复习巩固</span></h2>
      <table>
        <tr><th>场景</th><th>用</th></tr>
        <tr><td>吃糖果、吃饭</td><td class="right">eat too much</td></tr>
        <tr><td>自助餐拿食物</td><td class="right">take too much</td></tr>
      </table>
      <p class="tip">Don't <strong>eat</strong> too much candy! · Don't <strong>take</strong> too much!</p>
    </div>

    <div class="card wide">
      <h2>练习前想 3 秒</h2>
      <p>1. 要不要加 <strong>s</strong>？（groups / vegetables）</p>
      <p>2. 是 <strong>a lot of</strong> 还是 allot？</p>
      <p>3. 是吃（eat）还是拿（take）？</p>
    </div>
  </div>

  <p class="footer">Unit 1 · What's on your plate? · 复习备忘 · 2026-09-19</p>
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

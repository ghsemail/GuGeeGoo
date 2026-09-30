import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const pdfPath = path.join(
  ROOT,
  "学科学习/英语/五年级/学习资料/WY五上测试卷.pdf"
);
const outDir = path.join(ROOT, "scripts/_wy-pdf-pages");
await fs.promises.mkdir(outDir, { recursive: true });

const chromePath =
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  headless: true,
  executablePath: chromePath,
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 2000 });

const baseUrl = "file:///" + pdfPath.replace(/\\/g, "/");
const indices = process.argv.slice(2).map(Number).filter(Boolean);
const pages = indices.length ? indices : [1, 2, 3, 4];

for (const n of pages) {
  await page.goto(`${baseUrl}#page=${n}`, {
    waitUntil: "networkidle0",
    timeout: 120000,
  });
  await new Promise((r) => setTimeout(r, 800));
  const name = `page-${String(n).padStart(2, "0")}.png`;
  await page.screenshot({ path: path.join(outDir, name) });
  console.log("saved", name);
}
await browser.close();

import path from "node:path";
import puppeteer from "puppeteer";

const pdfPath = process.argv[2];
const out = process.argv[3];
if (!pdfPath || !out) process.exit(1);
const chromePath =
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  headless: true,
  executablePath: chromePath,
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 2400 });
const fileUrl =
  "file:///" +
  path.resolve(pdfPath).replace(/\\/g, "/") +
  (process.argv[4] ? `#page=${process.argv[4]}` : "");
await page.goto(fileUrl, { waitUntil: "networkidle0", timeout: 120000 });
await new Promise((r) => setTimeout(r, 900));
await page.screenshot({ path: out });
await browser.close();

import path from "node:path";
import puppeteer from "puppeteer";

const [src, out, x, y, w, h] = process.argv.slice(2).map((v, i) =>
  i === 0 || i === 1 ? v : Number(v)
);

const abs = path.resolve(src);
const chromePath =
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  headless: true,
  executablePath: chromePath,
});
const page = await browser.newPage();
const fileUrl = "file:///" + abs.replace(/\\/g, "/");
await page.goto(fileUrl, { waitUntil: "networkidle0" });
const box = await page.evaluate(() => {
  const img = document.querySelector("img");
  return { w: img.naturalWidth, h: img.naturalHeight };
});
await page.setViewport({ width: box.w, height: box.h, deviceScaleFactor: 1 });
await page.goto(fileUrl, { waitUntil: "networkidle0" });
await page.screenshot({
  path: path.resolve(out),
  clip: { x, y, width: w, height: h },
});
await browser.close();
console.log(out, box);

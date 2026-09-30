import path from "node:path";
import puppeteer from "puppeteer";

const abs = path.resolve(process.argv[2]);
const chromePath =
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  headless: true,
  executablePath: chromePath,
});
const page = await browser.newPage();
const url = "file:///" + abs.replace(/\\/g, "/");
await page.goto(url);
const d = await page.evaluate(() => {
  const img = document.querySelector("img");
  return { w: img.naturalWidth, h: img.naturalHeight };
});
console.log(d);
await browser.close();

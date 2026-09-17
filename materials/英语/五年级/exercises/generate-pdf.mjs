import puppeteer from "puppeteer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const files = [
  "unit1-day2.html",
  "unit1-day2-part1.html",
  "unit1-day2-part1-answers.html",
  "unit1-day2-part2.html",
  "unit1-day2-part2-answers.html",
  "unit1-day2-part3.html",
  "unit1-day2-part3-answers.html",
  "unit1-day2-part4.html",
  "unit1-day2-part4-answers.html",
];

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

for (const file of files) {
  const htmlPath = path.join(dir, file);
  const pdfPath = htmlPath.replace(/\.html$/, ".pdf");
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0" });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  await page.close();
  console.log(`Generated ${path.basename(pdfPath)}`);
}

await browser.close();

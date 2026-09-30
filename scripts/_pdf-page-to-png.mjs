import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfPath = path.resolve(process.argv[2]);
const pageNum = Number(process.argv[3] || 1);
const outPath = path.resolve(process.argv[4]);

const pdfBytes = await fs.readFile(pdfPath);
const b64 = pdfBytes.toString("base64");

const chromePath =
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  headless: true,
  executablePath: chromePath,
});
const page = await browser.newPage();
await page.setContent(
  `<!DOCTYPE html><html><head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  </head><body><canvas id="c"></canvas></body></html>`,
  { waitUntil: "networkidle0", timeout: 120000 }
);

await page.evaluate(
  async ({ b64, pageNum }) => {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const raw = atob(b64);
    const buf = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const pg = await pdf.getPage(pageNum);
    const scale = 2.5;
    const viewport = pg.getViewport({ scale });
    const canvas = document.getElementById("c");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await pg.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  },
  { b64, pageNum }
);

const canvas = await page.$("#c");
await canvas.screenshot({ path: outPath });
await browser.close();
console.log(outPath);

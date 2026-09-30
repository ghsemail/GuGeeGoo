import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const pdfPath = path.join(
  ROOT,
  "学科学习/英语/五年级/学习资料/WY五上测试卷.pdf"
);

const buf = fs.readFileSync(pdfPath);
const data = await pdf(buf);

const outPath = path.join(ROOT, "scripts/_wy-pdf-extract.txt");
fs.writeFileSync(outPath, data.text, "utf8");
console.log("pages", data.numpages);
console.log("written", outPath);

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(process.argv[2]);
const page = Number(process.argv[3]);
const out = path.resolve(process.argv[4]);
const bytes = await fs.readFile(src);
const doc = await PDFDocument.load(bytes);
const newDoc = await PDFDocument.create();
const [p] = await newDoc.copyPages(doc, [page - 1]);
newDoc.addPage(p);
await fs.writeFile(out, await newDoc.save());

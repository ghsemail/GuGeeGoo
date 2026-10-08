import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../../../");
const base = "学科学习/英语/五年级/练习/综合练习";

const pairs = [
  ["综合练习-第1单元.md", "综合练习-第1单元-答案.md"],
  ["综合练习-第2单元.md", "综合练习-第2单元-答案.md"],
  ["综合练习-第1-2单元.md", "综合练习-第1-2单元-答案.md"],
];

for (const [ws, ans] of pairs) {
  const wsPath = `${base}/${ws}`;
  console.log(`PDF: ${ws}`);
  execSync(`npm run pdf -- "${wsPath}" --answers "${ans}" --out "${base}"`, {
    cwd: repoRoot,
    stdio: "inherit",
  });
}

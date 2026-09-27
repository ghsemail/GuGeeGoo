/**
 * One-off / maintenance: create 练习/第N单元/第N单元-听写.md from 词汇/外研社三起五上-单词表.md
 * Skips Unit 2 if file already exists with content (use --force to overwrite).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const wordListPath = path.join(scriptDir, "../../词汇/外研社三起五上-单词表.md");
const md = readFileSync(wordListPath, "utf8");

const unitMeta = {
  1: { en: "What's on your plate?", title: "餐盘里有什么" },
  2: { en: "A green life", title: "绿色生活" },
  3: { en: "Happy together", title: "快乐相处" },
  4: { en: "A better me", title: "更好的自己" },
  5: { en: "Look into the future", title: "展望未来" },
  6: { en: "Enjoy the festivals", title: "欢庆佳节" },
};

function parseUnits(text) {
  const units = {};
  const re = /### Unit (\d) ([^\n]+)\n\n(\|[^\n]+\n\|[-| ]+\n(?:\|[^\n]+\n)+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const n = Number(m[1]);
    const rows = [];
    for (const line of m[3].split("\n")) {
      if (!line.startsWith("|") || line.includes("---")) continue;
      const cols = line
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cols[0] === "单词/短语") continue;
      rows.push({ word: cols[0], zh: cols[1] });
    }
    units[n] = rows;
  }
  return units;
}

const units = parseUnits(md);
const force = process.argv.includes("--force");

for (let n = 1; n <= 6; n++) {
  const unitDir = path.join(scriptDir, `../第${n}单元`);
  mkdirSync(unitDir, { recursive: true });
  mkdirSync(path.join(unitDir, "源文件"), { recursive: true });
  const outPath = path.join(unitDir, `第${n}单元-听写.md`);
  if (n === 2 && existsSync(outPath) && !force) {
    console.log("Skip Unit 2 (existing)", outPath);
    continue;
  }
  const rows = units[n];
  if (!rows?.length) {
    console.warn("No words for unit", n);
    continue;
  }
  const meta = unitMeta[n];
  const tableRows = rows
    .map(
      (r) =>
        `| ${r.word} | ${r.zh} | 未听写 | 0/2 | | |`
    )
    .join("\n");

  const body = `# Unit ${n} · ${meta.en} · 听写

> 顾景源 · 五年级英语  
> 规则：[听写规则.md](../../词汇/听写规则.md) · 全册汇总：[听写单词本.md](../../词汇/听写单词本.md)

---

## 本单元单词状态

状态有四种：未听写、不熟悉、巩固中、已掌握。规则见听写规则第六节。

| 单词/短语 | 中文 | 状态 | 连对 | 最近听写 | 备注 |
|-----------|------|------|------|----------|------|
${tableRows}

---

## 听写明细

每次听写加一节，最新的在最上面。

（尚未听写）

---

## 记忆卡片

写错的词；连续 2 次听写写对后标「已掌握」，卡片保留。

（暂无）
`;

  writeFileSync(outPath, body, "utf8");
  console.log("Wrote", outPath);
}

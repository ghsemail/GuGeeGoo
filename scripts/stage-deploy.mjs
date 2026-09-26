#!/usr/bin/env node
/**
 * 将待部署文件复制到 deploy/staging/（本地 staging，便于核对后再 sync:cos）。
 * 源文件仍以 学习档案/、学科学习/ 为唯一真相；此处为部署快照。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const STAGING = path.join(ROOT, 'deploy', 'staging');

/** @type {{ local: string; remotePrefix: string; glob?: string; kind: 'file' | 'dir-md' | 'dir-pdf' }[]} */
const PLANNING_COPY = [
  {
    local: '学习档案',
    remotePrefix: 'private/planning',
    kind: 'dir-md',
  },
];

/** 学生可见 PDF（不含 *answers*）— 启动后可按需扩展 */
const PUBLIC_PDF_GLOBS = [
  {
    local: '学科学习/英语/五年级/练习',
    remotePrefix: 'public/exercises/english/grade5',
    kind: 'dir-pdf',
    excludeAnswers: true,
  },
  {
    local: '学科学习/数学/五年级/学而思五年级秋/练习',
    remotePrefix: 'public/exercises/math/xes-grade5-autumn',
    kind: 'dir-pdf',
    excludeAnswers: true,
  },
  {
    local: '学科学习/数学/五年级/学而思五年级秋/备忘',
    remotePrefix: 'public/memo/math/xes-grade5-autumn',
    kind: 'dir-pdf',
    excludeAnswers: false,
  },
];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyFile(src, dest) {
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
}

async function copyMdDir(localRel, remotePrefix) {
  const srcDir = path.join(ROOT, localRel);
  const destDir = path.join(STAGING, remotePrefix);
  await fs.rm(destDir, { recursive: true, force: true });
  let entries;
  try {
    entries = await fs.readdir(srcDir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn(`[skip] 目录不存在: ${localRel}`);
      return 0;
    }
    throw err;
  }
  let count = 0;
  for (const ent of entries) {
    if (!ent.isFile() || !ent.name.endsWith('.md')) continue;
    await copyFile(path.join(srcDir, ent.name), path.join(destDir, ent.name));
    count++;
  }
  return count;
}

async function walkPdfs(dir, files = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return files;
    throw err;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === '源文件' || ent.name === '脚本') continue;
      await walkPdfs(full, files);
    } else if (ent.isFile() && ent.name.endsWith('.pdf')) {
      files.push(full);
    }
  }
  return files;
}

async function copyPublicPdfs({ local, remotePrefix, excludeAnswers }) {
  const srcRoot = path.join(ROOT, local);
  const pdfs = await walkPdfs(srcRoot);
  let count = 0;
  for (const pdf of pdfs) {
    const base = path.basename(pdf);
    if (excludeAnswers && /answers/i.test(base)) continue;
    const rel = path.relative(srcRoot, pdf);
    const dest = path.join(STAGING, remotePrefix, rel);
    await copyFile(pdf, dest);
    count++;
  }
  return count;
}

async function writeManifestFile(stats) {
  const manifest = {
    generatedAt: new Date().toISOString(),
    note: '由 npm run stage:deploy 生成；上传前请核对 private/ 勿公开读',
    stats,
    paths: {
      planning: 'private/planning',
      publicRoot: 'public',
    },
  };
  await ensureDir(STAGING);
  await fs.writeFile(
    path.join(STAGING, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
}

async function main() {
  const stats = { planningMd: 0, publicPdf: 0 };

  for (const item of PLANNING_COPY) {
    stats.planningMd += await copyMdDir(item.local, item.remotePrefix);
  }

  for (const item of PUBLIC_PDF_GLOBS) {
    stats.publicPdf += await copyPublicPdfs(item);
  }

  await writeManifestFile(stats);

  console.log(
    `[stage:deploy] 完成 → deploy/staging/（规划 MD ${stats.planningMd} 个，公开 PDF ${stats.publicPdf} 个）`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

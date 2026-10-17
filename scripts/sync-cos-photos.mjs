#!/usr/bin/env node
/**
 * 将家长批改/作业拍照上传到 COS private/photos/（photos-only）。
 * 学而思五年级秋仅两大类：每日三题 / 日积月累（不含学有所得讲义图）。
 * 密钥仅来自环境变量：TENCENT_SECRET_ID / TENCENT_SECRET_KEY / COS_BUCKET / COS_REGION
 *
 * 用法:
 *   npm run sync:cos:photos -- --dry-run
 *   npm run sync:cos:photos
 *   npm run sync:cos:photos -- --report /tmp/report.json
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const dryRun = process.argv.includes('--dry-run');
const reportIdx = process.argv.indexOf('--report');
const reportPath =
  reportIdx >= 0 && process.argv[reportIdx + 1]
    ? path.resolve(process.argv[reportIdx + 1])
    : path.resolve('/workspace/cos-photo-migration-report.json');

const MAX_ATTEMPTS = 5;
const PER_FILE_MS = 180_000;

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`缺少环境变量 ${name}，请参考 infra/cos/env.example`);
    process.exit(1);
  }
  return v;
}

/**
 * Layout:
 *   private/photos/数学/学而思五年级秋/每日三题/第N周/<filename>
 *   private/photos/数学/学而思五年级秋/日积月累/第N讲/<filename>
 *   private/photos/数学/学校学习/<试卷名>/<filename>
 * @returns {{ local: string, key: string }[]}
 */
function buildManifest() {
  /** @type {{ local: string, key: string }[]} */
  const items = [];

  const weeks = [
    {
      n: 1,
      files: [
        'lesson01-day1-graded.jpg',
        'lesson01-day2-graded.jpg',
        'lesson01-day3-graded.jpg',
        'lesson01-day4-graded.jpg',
        'lesson01-yuanti-p1.jpg',
        'lesson01-yuanti-p2.jpg',
        'lesson01-yuanti-p3.jpg',
      ],
    },
    {
      n: 2,
      files: [
        'lesson02-day1-graded.jpg',
        'lesson02-day2-graded.jpg',
        'lesson02-day3-graded.jpg',
        'lesson02-day4-graded.jpg',
      ],
    },
    {
      n: 3,
      files: [
        'lesson03-day1-graded.jpg',
        'lesson03-day2-graded.jpg',
        'lesson03-day3-graded.jpg',
        'lesson03-day4-graded.jpg',
      ],
    },
    {
      n: 4,
      files: [
        'lesson04-day1-graded.jpg',
        'lesson04-day2-graded.jpg',
        'lesson04-day3-graded.jpg',
        'lesson04-day4-graded.jpg',
      ],
    },
  ];
  for (const w of weeks) {
    for (const name of w.files) {
      items.push({
        local: `assets/images/数学/学而思五年级秋/${name}`,
        key: `private/photos/数学/学而思五年级秋/每日三题/第${w.n}周/${name}`,
      });
    }
  }

  const lectures = [
    { n: 1, files: ['lecture01-p1.jpg', 'lecture01-p2.jpg', 'lecture01-p3.jpg'] },
    { n: 2, files: ['lecture02-p1.jpg', 'lecture02-p2.jpg', 'lecture02-p3.jpg'] },
    { n: 3, files: ['lecture03-p1.jpg', 'lecture03-p2.jpg'] },
    {
      n: 4,
      files: [
        'lecture04-p1.jpg',
        'lecture04-p2.jpg',
        'lecture04-p3.jpg',
        'lecture04-p4.jpg',
        'lecture04-p5.jpg',
        'lecture04-p6.jpg',
        'lecture04-p7.jpg',
      ],
    },
  ];
  for (const lec of lectures) {
    for (const name of lec.files) {
      items.push({
        // historical local path (may already be deleted from repo; key is source of truth)
        local: `assets/images/数学/日记月累/${name}`,
        key: `private/photos/数学/学而思五年级秋/日积月累/第${lec.n}讲/${name}`,
      });
    }
  }

  for (const name of ['第三单元综合素养评价-第1-2页.jpg', '第三单元综合素养评价-第3-4页.jpg']) {
    items.push({
      local: `学科学习/数学/五年级/学校学习/images/${name}`,
      key: `private/photos/数学/学校学习/第三单元综合素养评价/${name}`,
    });
  }

  return items;
}

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`timeout ${ms}ms: ${label}`)), ms);
    }),
  ]);
}

function headObject(cos, params) {
  return new Promise((resolve, reject) => {
    cos.headObject(params, (err, data) => (err ? reject(err) : resolve(data)));
  });
}

function sliceUploadFile(cos, params) {
  return new Promise((resolve, reject) => {
    cos.sliceUploadFile(params, (err, data) => (err ? reject(err) : resolve(data)));
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function errMsg(err) {
  if (!err || typeof err !== 'object') return String(err).slice(0, 200);
  const parts = [err.message, err.error?.Message, err.code, err.statusCode]
    .filter(Boolean)
    .map(String);
  return parts.join(' | ').slice(0, 200);
}

async function remoteSizeOk(cos, Bucket, Region, key, size) {
  try {
    const head = await headObject(cos, { Bucket, Region, Key: key });
    const remoteSize = Number(head.headers?.['content-length'] ?? head.ContentLength ?? 0);
    return remoteSize === size;
  } catch {
    return false;
  }
}

async function uploadOne(cos, Bucket, Region, abs, key, size) {
  if (await remoteSizeOk(cos, Bucket, Region, key, size)) {
    return { skipped: true };
  }
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await withTimeout(
        sliceUploadFile(cos, {
          Bucket,
          Region,
          Key: key,
          FilePath: abs,
          ACL: 'private',
          SliceSize: 1024 * 1024,
        }),
        PER_FILE_MS,
        key
      );
      if (!(await remoteSizeOk(cos, Bucket, Region, key, size))) {
        throw new Error('size mismatch after upload');
      }
      return { skipped: false };
    } catch (err) {
      lastErr = err;
      console.error(`[retry ${attempt}/${MAX_ATTEMPTS}] ${key}: ${errMsg(err)}`);
      if (attempt < MAX_ATTEMPTS) await sleep(Math.min(30_000, 1500 * 2 ** (attempt - 1)));
    }
  }
  throw lastErr;
}

async function main() {
  const manifest = buildManifest();
  console.log(`manifest: ${manifest.length} files (每日三题 + 日积月累 + 学校学习; no 学有所得)`);

  if (dryRun) {
    for (const { local, key } of manifest) {
      console.log(`[dry-run] ${local} → ${key}`);
    }
    return;
  }

  const COS = (await import('cos-nodejs-sdk-v5')).default;
  const SecretId = requireEnv('TENCENT_SECRET_ID');
  const SecretKey = requireEnv('TENCENT_SECRET_KEY');
  const Bucket = requireEnv('COS_BUCKET');
  const Region = requireEnv('COS_REGION');
  const cos = new COS({ SecretId, SecretKey, Timeout: 120_000 });

  /** @type {{ local: string, key: string, size: number, ok: boolean, error?: string }[]} */
  const report = [];

  for (const { local, key } of manifest) {
    const abs = path.join(ROOT, local);
    let size = 0;
    try {
      const st = await fs.stat(abs);
      size = st.size;
      const result = await uploadOne(cos, Bucket, Region, abs, key, size);
      report.push({ local, key, size, ok: true });
      console.log(`[ok${result.skipped ? '/skip' : ''}] ${key} (${size} bytes)`);
    } catch (err) {
      report.push({ local, key, size, ok: false, error: errMsg(err) });
      console.error(`[FAIL] ${local}: ${errMsg(err)}`);
    }
  }

  await fs.writeFile(
    reportPath,
    JSON.stringify({ bucket: Bucket, region: Region, layout: 'meiri+riji+school', items: report }, null, 2),
    'utf8'
  );
  const okCount = report.filter((r) => r.ok).length;
  const failCount = report.length - okCount;
  console.log(`done: ${okCount} ok, ${failCount} failed; report → ${reportPath}`);
  if (failCount > 0) process.exit(1);
}

main().catch((err) => {
  console.error(errMsg(err));
  process.exit(1);
});

#!/usr/bin/env node
/**
 * 将家长批改/作业拍照上传到 COS private/photos/（photos-only，粗粒度作业目录）。
 * 密钥仅来自环境变量：TENCENT_SECRET_ID / TENCENT_SECRET_KEY / COS_BUCKET / COS_REGION
 *
 * 用法:
 *   npm run sync:cos:photos -- --dry-run
 *   npm run sync:cos:photos
 *   npm run sync:cos:photos -- --report /tmp/report.json
 *   npm run sync:cos:photos -- --remap-from-fine   # 旧细粒度 key → 新粗粒度（copy+校验+删旧）
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const dryRun = process.argv.includes('--dry-run');
const remapFromFine = process.argv.includes('--remap-from-fine');
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
 * Coarse layout:
 * private/photos/{学科}/{课程或来源}/{作业名}/<原文件名>
 * @returns {{ local: string, key: string, oldKey?: string }[]}
 */
function buildManifest() {
  /** @type {{ local: string, key: string, oldKey?: string }[]} */
  const items = [];

  const weeks = [
    {
      n: 1,
      graded: [
        'lesson01-day1-graded.jpg',
        'lesson01-day2-graded.jpg',
        'lesson01-day3-graded.jpg',
        'lesson01-day4-graded.jpg',
      ],
      yuanti: ['lesson01-yuanti-p1.jpg', 'lesson01-yuanti-p2.jpg', 'lesson01-yuanti-p3.jpg'],
      xueyousuode: 'lesson01-学有所得.jpg',
    },
    {
      n: 2,
      graded: [
        'lesson02-day1-graded.jpg',
        'lesson02-day2-graded.jpg',
        'lesson02-day3-graded.jpg',
        'lesson02-day4-graded.jpg',
      ],
      yuanti: [],
      xueyousuode: 'lesson02-学有所得.png',
    },
    {
      n: 3,
      graded: [
        'lesson03-day1-graded.jpg',
        'lesson03-day2-graded.jpg',
        'lesson03-day3-graded.jpg',
        'lesson03-day4-graded.jpg',
      ],
      yuanti: [],
      xueyousuode: null,
    },
    {
      n: 4,
      graded: [
        'lesson04-day1-graded.jpg',
        'lesson04-day2-graded.jpg',
        'lesson04-day3-graded.jpg',
        'lesson04-day4-graded.jpg',
      ],
      yuanti: [],
      xueyousuode: null,
    },
  ];

  for (const w of weeks) {
    const folder = `第${w.n}周-每日三题`;
    for (const name of [...w.graded, ...w.yuanti]) {
      const local = `assets/images/数学/学而思五年级秋/${name}`;
      const key = `private/photos/数学/学而思五年级秋/${folder}/${name}`;
      let oldKey;
      const ym = name.match(/^(lesson\d+-yuanti)-(p\d+)(\.[^.]+)$/);
      if (ym) {
        oldKey = `private/photos/数学/学而思五年级秋/${ym[1]}/${ym[2]}${ym[3]}`;
      } else {
        const stem = name.replace(/\.[^.]+$/, '');
        oldKey = `private/photos/数学/学而思五年级秋/${stem}/${name}`;
      }
      items.push({ local, key, oldKey });
    }
    if (w.xueyousuode) {
      const name = w.xueyousuode;
      const local = `assets/images/数学/学而思五年级秋/${name}`;
      const key = `private/photos/数学/学而思五年级秋/第${w.n}讲-学有所得/${name}`;
      const stem = name.replace(/\.[^.]+$/, '');
      const oldKey = `private/photos/数学/学而思五年级秋/${stem}/${name}`;
      items.push({ local, key, oldKey });
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
    const folder = `第${lec.n}讲-日积月累`;
    for (const name of lec.files) {
      const local = `assets/images/数学/日记月累/${name}`;
      const key = `private/photos/数学/日记月累/${folder}/${name}`;
      const m = name.match(/^(lecture\d+)-(p\d+)(\.[^.]+)$/);
      const oldKey = `private/photos/数学/日记月累/${m[1]}/${m[2]}${m[3]}`;
      items.push({ local, key, oldKey });
    }
  }

  for (const name of ['第三单元综合素养评价-第1-2页.jpg', '第三单元综合素养评价-第3-4页.jpg']) {
    const local = `学科学习/数学/五年级/学校学习/images/${name}`;
    const key = `private/photos/数学/学校学习/第三单元综合素养评价/${name}`;
    // old fine layout shortened the filename after the first dash
    const short = name.replace(/^第三单元综合素养评价-/, '');
    const oldKey = `private/photos/数学/学校学习/第三单元综合素养评价/${short}`;
    items.push({ local, key, oldKey });
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

function copyObject(cos, params) {
  return new Promise((resolve, reject) => {
    cos.putObjectCopy(params, (err, data) => (err ? reject(err) : resolve(data)));
  });
}

function deleteObject(cos, params) {
  return new Promise((resolve, reject) => {
    cos.deleteObject(params, (err, data) => (err ? reject(err) : resolve(data)));
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

async function remoteSize(cos, Bucket, Region, key) {
  try {
    const head = await headObject(cos, { Bucket, Region, Key: key });
    return Number(head.headers?.['content-length'] ?? head.ContentLength ?? 0);
  } catch {
    return null;
  }
}

async function remoteSizeOk(cos, Bucket, Region, key, size) {
  const s = await remoteSize(cos, Bucket, Region, key);
  return s === size;
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
      const wait = Math.min(30_000, 1500 * 2 ** (attempt - 1));
      console.error(`[retry ${attempt}/${MAX_ATTEMPTS}] ${key}: ${errMsg(err)}`);
      if (attempt < MAX_ATTEMPTS) await sleep(wait);
    }
  }
  throw lastErr;
}

/** Server-side copy old→new, verify, delete old. Falls back to local upload if old missing. */
async function remapOne(cos, Bucket, Region, item, abs, size) {
  const { key, oldKey } = item;
  if (await remoteSizeOk(cos, Bucket, Region, key, size)) {
    // New key already good; still clean old if different
    if (oldKey && oldKey !== key) {
      const oldSz = await remoteSize(cos, Bucket, Region, oldKey);
      if (oldSz != null) {
        await deleteObject(cos, { Bucket, Region, Key: oldKey });
        console.log(`[del-old] ${oldKey}`);
      }
    }
    return { skipped: true, via: 'already-new' };
  }

  if (oldKey && oldKey !== key) {
    const oldSz = await remoteSize(cos, Bucket, Region, oldKey);
    if (oldSz === size) {
      let lastErr;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const CopySource = `${Bucket}.cos.${Region}.myqcloud.com/${encodeURIComponent(oldKey).replace(/%2F/g, '/')}`;
          // Tencent copy source path encoding: encode each segment
          const encodedKey = oldKey
            .split('/')
            .map((s) => encodeURIComponent(s))
            .join('/');
          await withTimeout(
            copyObject(cos, {
              Bucket,
              Region,
              Key: key,
              CopySource: `${Bucket}.cos.${Region}.myqcloud.com/${encodedKey}`,
              ACL: 'private',
              MetadataDirective: 'Copy',
            }),
            PER_FILE_MS,
            `copy ${oldKey}`
          );
          if (!(await remoteSizeOk(cos, Bucket, Region, key, size))) {
            throw new Error('size mismatch after copy');
          }
          await deleteObject(cos, { Bucket, Region, Key: oldKey });
          return { skipped: false, via: 'copy' };
        } catch (err) {
          lastErr = err;
          console.error(`[copy-retry ${attempt}/${MAX_ATTEMPTS}] ${oldKey}→${key}: ${errMsg(err)}`);
          if (attempt < MAX_ATTEMPTS) await sleep(1500 * 2 ** (attempt - 1));
        }
      }
      console.error(`[copy-fail] falling back to upload: ${errMsg(lastErr)}`);
    }
  }

  const result = await uploadOne(cos, Bucket, Region, abs, key, size);
  if (oldKey && oldKey !== key) {
    const oldSz = await remoteSize(cos, Bucket, Region, oldKey);
    if (oldSz != null) {
      await deleteObject(cos, { Bucket, Region, Key: oldKey });
      console.log(`[del-old] ${oldKey}`);
    }
  }
  return { skipped: result.skipped, via: 'upload' };
}

async function main() {
  const manifest = buildManifest();
  console.log(`manifest: ${manifest.length} files (coarse layout)`);

  if (dryRun) {
    for (const { local, key, oldKey } of manifest) {
      console.log(`[dry-run] ${local}`);
      console.log(`  → ${key}`);
      if (oldKey && oldKey !== key) console.log(`  old: ${oldKey}`);
    }
    return;
  }

  const COS = (await import('cos-nodejs-sdk-v5')).default;
  const SecretId = requireEnv('TENCENT_SECRET_ID');
  const SecretKey = requireEnv('TENCENT_SECRET_KEY');
  const Bucket = requireEnv('COS_BUCKET');
  const Region = requireEnv('COS_REGION');
  const cos = new COS({ SecretId, SecretKey, Timeout: 120_000 });

  /** @type {{ local: string, key: string, size: number, ok: boolean, error?: string, via?: string }[]} */
  const report = [];

  for (const item of manifest) {
    const { local, key } = item;
    const abs = path.join(ROOT, local);
    let size = 0;
    try {
      const st = await fs.stat(abs);
      size = st.size;
      const result = remapFromFine
        ? await remapOne(cos, Bucket, Region, item, abs, size)
        : await uploadOne(cos, Bucket, Region, abs, key, size);
      report.push({ local, key, size, ok: true, via: result.via || (result.skipped ? 'skip' : 'upload') });
      console.log(`[ok/${result.via || (result.skipped ? 'skip' : 'upload')}] ${key} (${size} bytes)`);
    } catch (err) {
      report.push({ local, key, size, ok: false, error: errMsg(err) });
      console.error(`[FAIL] ${local}: ${errMsg(err)}`);
    }
  }

  await fs.writeFile(
    reportPath,
    JSON.stringify({ bucket: Bucket, region: Region, layout: 'coarse', items: report }, null, 2),
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

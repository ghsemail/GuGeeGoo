#!/usr/bin/env node
/**
 * 将 deploy/staging/ 同步到腾讯云 COS。
 * 需配置环境变量（见 infra/cos/env.example）。
 *
 * 用法:
 *   npm run stage:deploy          # 先刷新 staging
 *   npm run sync:cos -- --dry-run # 仅列出将上传的对象
 *   npm run sync:cos              # 实际上传
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STAGING = path.join(ROOT, 'deploy', 'staging');

const dryRun = process.argv.includes('--dry-run');
const skipStage = process.argv.includes('--skip-stage');

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`缺少环境变量 ${name}，请参考 infra/cos/env.example`);
    process.exit(1);
  }
  return v;
}

async function walkFiles(dir, base = dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...(await walkFiles(full, base)));
    } else if (ent.isFile()) {
      out.push({
        abs: full,
        key: path.relative(base, full).split(path.sep).join('/'),
      });
    }
  }
  return out;
}

async function uploadWithSdk() {
  const COS = (await import('cos-nodejs-sdk-v5')).default;
  const SecretId = requireEnv('TENCENT_SECRET_ID');
  const SecretKey = requireEnv('TENCENT_SECRET_KEY');
  const Bucket = requireEnv('COS_BUCKET');
  const Region = requireEnv('COS_REGION');

  const cos = new COS({ SecretId, SecretKey });
  const files = await walkFiles(STAGING);

  if (files.length === 0) {
    console.error('deploy/staging 为空，请先运行 npm run stage:deploy');
    process.exit(1);
  }

  for (const { abs, key } of files) {
    if (key === 'manifest.json') continue;
    const acl =
      key.startsWith('private/') ? 'private' : 'public-read';
    if (dryRun) {
      console.log(`[dry-run] ${key} (${acl})`);
      continue;
    }
    const body = await fs.readFile(abs);
    await new Promise((resolve, reject) => {
      cos.putObject(
        {
          Bucket,
          Region,
          Key: key,
          Body: body,
          ACL: acl,
        },
        (err, data) => (err ? reject(err) : resolve(data))
      );
    });
    console.log(`[uploaded] ${key}`);
  }

  if (!dryRun) {
    console.log(`已上传 ${files.filter((f) => f.key !== 'manifest.json').length} 个对象到 ${Bucket}`);
  }
}

async function main() {
  if (!skipStage) {
    const { spawn } = await import('node:child_process');
    await new Promise((resolve, reject) => {
      const p = spawn(process.execPath, ['scripts/stage-deploy.mjs'], {
        cwd: ROOT,
        stdio: 'inherit',
      });
      p.on('exit', (code) =>
        code === 0 ? resolve() : reject(new Error(`stage-deploy exit ${code}`))
      );
    });
  }

  if (dryRun && !process.env.TENCENT_SECRET_ID) {
    const files = await walkFiles(STAGING);
    for (const { key } of files) {
      if (key === 'manifest.json') continue;
      const acl = key.startsWith('private/') ? 'private' : 'public-read';
      console.log(`[dry-run] ${key} (${acl})`);
    }
    return;
  }

  await uploadWithSdk();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

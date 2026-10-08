#!/usr/bin/env node
/**
 * 构建 apps/web 并通过 wrangler 发布到 Cloudflare Pages 项目 gugeegoo。
 *
 * 环境变量：CLOUDFLARE_API_TOKEN（必填）、CLOUDFLARE_ACCOUNT_ID（可选）、
 *           VITE_COS_PUBLIC_BASE_URL（可选）
 * 可从仓库根 .env 加载，见 infra/cloudflare/env.example
 *
 * 用法：npm run deploy:pages
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WRANGLER_CONFIG = path.join(ROOT, 'infra/cloudflare/wrangler.toml');
const DIST = path.join(ROOT, 'apps/web/dist');
const PROJECT_NAME = 'gugeegoo';

async function loadRootEnv() {
  const envPath = path.join(ROOT, '.env');
  try {
    const text = await fs.readFile(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  } catch {
    /* 无 .env 时仅依赖 shell 环境变量 */
  }
}

function run(cmd, args, env = process.env, cwd = ROOT) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} 退出码 ${code}`));
    });
  });
}

async function main() {
  await loadRootEnv();

  if (!process.env.CLOUDFLARE_API_TOKEN) {
    console.error(
      '缺少 CLOUDFLARE_API_TOKEN。请在仓库根 .env 中配置（见 infra/cloudflare/env.example），或 export 后重试。'
    );
    process.exit(1);
  }

  console.log('[deploy:pages] 构建学生主页…');
  const buildEnv = { ...process.env };
  if (buildEnv.VITE_COS_PUBLIC_BASE_URL) {
    console.log('[deploy:pages] 使用 VITE_COS_PUBLIC_BASE_URL 构建');
  }
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  await run(npmCmd, ['run', 'web:build'], buildEnv);

  try {
    await fs.access(DIST);
  } catch {
    console.error(`构建产物不存在：${DIST}`);
    process.exit(1);
  }

  if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
    try {
      const toml = await fs.readFile(WRANGLER_CONFIG, 'utf8');
      const m = toml.match(/^account_id\s*=\s*"([^"]+)"/m);
      if (m) process.env.CLOUDFLARE_ACCOUNT_ID = m[1];
    } catch {
      /* wrangler.toml 可选 */
    }
  }

  const wranglerArgs = [
    'pages',
    'deploy',
    'dist',
    '--project-name',
    PROJECT_NAME,
    '--branch',
    'main',
  ];

  console.log(`[deploy:pages] 上传到 Cloudflare Pages「${PROJECT_NAME}」…`);
  const wranglerBin = path.join(
    ROOT,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler'
  );
  const webDir = path.join(ROOT, 'apps/web');
  await run(wranglerBin, wranglerArgs, {
    ...process.env,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
  }, webDir);
  console.log('[deploy:pages] 完成 → https://gugeegoo.pages.dev');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

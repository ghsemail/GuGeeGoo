#!/usr/bin/env node
/**
 * 养植物 3D 物种截图（成熟 + 指定 start 近景）
 */
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const REPO_ROOT = path.join(fileURLToPath(new URL('.', import.meta.url)), '..');
const BASE = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const PLANT_URL = `${BASE.replace(/\/$/, '')}/plant/`;
const OUT = process.env.PLANT_SHOT_DIR || path.join(REPO_ROOT, 'plantshots');

const SPECIES = [
  'marchantia',
  'conocephalum',
  'riccia',
  'leucobryum',
  'hypnum',
  'polytrichum',
  'funaria',
];

/** @type {import('node:child_process').ChildProcess | null} */
let previewProc = null;

async function ensurePreview() {
  try {
    const r = await fetch(PLANT_URL);
    if (r.ok) return;
  } catch {
    /* start preview */
  }
  previewProc = spawn('npm', ['run', 'preview', '-w', '@gugeegoo/web'], {
    cwd: REPO_ROOT,
    stdio: 'ignore',
  });
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    try {
      const r = await fetch(PLANT_URL);
      if (r.ok) return;
    } catch {
      /* retry */
    }
  }
  throw new Error('preview server did not start');
}

const SAVE_KEY = 'gugeegoo_plant_save';

async function setupPlant(page, speciesId, growth) {
  await page.goto(PLANT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.plant-3d-canvas', { timeout: 25000 });
  await page.waitForFunction(() => globalThis.__PLANT3D_TEST__?.getState?.(), { timeout: 25000 });
  await page.evaluate(
    (key, sid, g) => {
      const now = Date.now();
      const mature = g >= 100;
      const payload = {
        version: 1,
        savedAt: now,
        plant: {
          speciesId: sid,
          planted: true,
          status: mature ? 'mature' : 'growing',
          water: 72,
          light: 70,
          nutrient: 40,
          growth: g,
          stressSec: 0,
          matureAt: mature ? now : null,
          lastTickMs: now,
          cooldowns: { water: 0, light: 0, nutrient: 0 },
        },
        collection: mature ? [sid] : [],
      };
      localStorage.setItem(key, JSON.stringify(payload));
      window.__PLANT_TEST_RELOAD__?.();
    },
    SAVE_KEY,
    speciesId,
    growth
  );
  await sleep(900);
  await page.waitForFunction(() => globalThis.__PLANT3D_TEST__?.getMeshStats?.(), { timeout: 20000 });
  await page.evaluate(() => {
    const t = globalThis.__PLANT3D_TEST__;
    t?.resetView?.();
    if (t?.setPolarDeg) t.setPolarDeg(52);
  });
  await sleep(400);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await ensurePreview();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 700, deviceScaleFactor: 2 });

  const stats = {};
  for (const id of SPECIES) {
    await setupPlant(page, id, 100);
    const st = await page.evaluate(() => globalThis.__PLANT3D_TEST__?.getMeshStats?.());
    stats[id] = st;
    await page.screenshot({
      path: path.join(OUT, `after-${id}-mature.png`),
    });
    console.log(`${id} mature:`, st);
  }

  for (const [id, growth, tag] of [
    ['marchantia', 8, 'marchantia-start'],
    ['hypnum', 8, 'hypnum-start'],
  ]) {
    await setupPlant(page, id, growth);
    await page.evaluate(() => {
      const t = globalThis.__PLANT3D_TEST__;
      if (t?.setPolarDeg) t.setPolarDeg(42);
    });
    await sleep(300);
    const closeEl = await page.$('.plant-3d-canvas');
    if (closeEl) {
      await closeEl.screenshot({ path: path.join(OUT, `after-${tag}-close.png`) });
    }
  }

  await browser.close();
  if (previewProc) previewProc.kill();
  console.log(JSON.stringify({ stats, outDir: OUT }, null, 2));
}

main().catch((e) => {
  console.error(e);
  if (previewProc) previewProc.kill();
  process.exit(1);
});

#!/usr/bin/env node
/**
 * QA 截图：4 种 mature 近景 + 默认视图 + 叶状体覆盖估算
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
const SAVE_KEY = 'gugeegoo_plant_save';

const CLOSEUPS = [
  ['polytrichum', 100, 38],
  ['marchantia', 100, 36],
  ['conocephalum', 100, 36],
  ['riccia', 100, 36],
];

const LIVERWORTS = ['marchantia', 'conocephalum', 'riccia'];

/** @type {import('node:child_process').ChildProcess | null} */
let previewProc = null;

async function ensurePreview() {
  try {
    if ((await fetch(PLANT_URL)).ok) return;
  } catch {
    /* start */
  }
  previewProc = spawn('npm', ['run', 'preview', '-w', '@gugeegoo/web'], {
    cwd: REPO_ROOT,
    stdio: 'ignore',
  });
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    try {
      if ((await fetch(PLANT_URL)).ok) return;
    } catch {
      /* retry */
    }
  }
  throw new Error('preview failed');
}

async function setup(page, speciesId, growth) {
  await page.goto(PLANT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.plant-3d-canvas', { timeout: 25000 });
  await page.evaluate(
    (key, sid, g) => {
      const now = Date.now();
      const mature = g >= 100;
      localStorage.setItem(
        key,
        JSON.stringify({
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
        })
      );
      globalThis.__PLANT_TEST_RELOAD__?.();
    },
    SAVE_KEY,
    speciesId,
    growth
  );
  await sleep(700);
  await page.waitForFunction(() => globalThis.__PLANT3D_TEST__?.getState?.(), { timeout: 25000 });
  await page.evaluate(() => globalThis.__PLANT3D_TEST__?.resetView?.());
  await sleep(350);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await ensurePreview();
  const browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: 120000,
    args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1194, height: 834, deviceScaleFactor: 1 });

  const report = { closeup: {}, defaultView: {}, coverage: {}, pixels: {} };

  for (const [id, growth, polar] of CLOSEUPS) {
    await setup(page, id, growth);
    if (polar) {
      await page.evaluate((deg) => globalThis.__PLANT3D_TEST__?.setPolarDeg?.(deg), polar);
      await sleep(300);
    }
    const el = await page.$('.plant-3d-canvas');
    const file = path.join(OUT, `qa-v70-closeup-${id}.png`);
    if (el) await el.screenshot({ path: file });
    else await page.screenshot({ path: file });
    const stats = await page.evaluate(() => globalThis.__PLANT3D_TEST__?.getMeshStats?.());
    const px = await page.evaluate(() =>
      globalThis.__PLANT3D_TEST__?.sampleCanvasRegionMean?.({ nx: 0.5, ny: 0.52, w: 0.28, h: 0.32 })
    );
    report.closeup[id] = { file, stats, pixels: px };
    report.pixels[id] = px;
    console.log('closeup', id, stats, px);
  }

  for (const id of CLOSEUPS.map((c) => c[0])) {
    await setup(page, id, 100);
    const file = path.join(OUT, `qa-v70-mature-${id}.png`);
    await page.screenshot({ path: file });
    const stats = await page.evaluate(() => globalThis.__PLANT3D_TEST__?.getMeshStats?.());
    report.defaultView[id] = { file, stats };
    if (LIVERWORTS.includes(id)) {
      const cov = await page.evaluate(() => globalThis.__PLANT3D_TEST__?.getPlantFootprintPct?.());
      report.coverage[id] = cov;
      console.log('coverage', id, cov);
      await page.evaluate(() => globalThis.__PLANT3D_TEST__?.setPolarDeg?.(88));
      await sleep(300);
      const top = path.join(OUT, `qa-liverwort-topdown-${id}.png`);
      const el = await page.$('.plant-3d-canvas');
      if (el) await el.screenshot({ path: top });
      await page.evaluate(() => globalThis.__PLANT3D_TEST__?.resetView?.());
      await sleep(250);
    }
  }

  for (const id of LIVERWORTS) {
    await page.goto(PLANT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.plant-3d-canvas', { timeout: 25000 });
    await page.evaluate(
      (key, sid) => {
        const now = Date.now();
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            savedAt: now,
            plant: {
              speciesId: sid,
              planted: true,
              status: 'withered',
              water: 4,
              light: 70,
              nutrient: 3,
              growth: 100,
              stressSec: 999,
              matureAt: now - 86400000,
              lastTickMs: now,
              cooldowns: { water: 0, light: 0, nutrient: 0 },
            },
            collection: [sid],
          })
        );
        globalThis.__PLANT_TEST_RELOAD__?.();
      },
      SAVE_KEY,
      id
    );
    await sleep(700);
    await page.evaluate(() => globalThis.__PLANT3D_TEST__?.resetView?.());
    await sleep(350);
    const wfile = path.join(OUT, `qa-liverwort-withered-${id}.png`);
    await page.screenshot({ path: wfile });
    const px = await page.evaluate(() =>
      globalThis.__PLANT3D_TEST__?.sampleCanvasRegionMean?.({ nx: 0.5, ny: 0.52, w: 0.28, h: 0.32 })
    );
    report.pixels[`${id}-withered`] = px;
    console.log('withered', id, px);
  }

  fs.writeFileSync(path.join(OUT, 'qa-v70-report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  if (previewProc) previewProc.kill();
  console.log('done', path.join(OUT, 'qa-v70-report.json'));
}

main().catch((e) => {
  console.error(e);
  if (previewProc) previewProc.kill();
  process.exit(1);
});

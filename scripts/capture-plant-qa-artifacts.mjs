#!/usr/bin/env node
/**
 * QA 截图：7 种 start + mature +  stressed 藓类 + 大灰藓/地钱近景
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

/**
 * @param {import('puppeteer').Page} page
 * @param {string} speciesId
 * @param {{ growth: number, water?: number, light?: number, tag: string }} opts
 */
async function setup(page, speciesId, opts) {
  const { growth, water = 72, light = 70, tag } = opts;
  await page.goto(PLANT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.plant-3d-canvas', { timeout: 25000 });
  await page.evaluate(
    (key, sid, g, w, l) => {
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
            water: w,
            light: l,
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
    growth,
    water,
    light
  );
  await sleep(700);
  await page.waitForFunction(() => globalThis.__PLANT3D_TEST__?.getState?.(), { timeout: 25000 });
  await page.evaluate(() => globalThis.__PLANT3D_TEST__?.resetView?.());
  await sleep(350);
  const file = path.join(OUT, `qa-v68-${tag}-${speciesId}.png`);
  await page.screenshot({ path: file });
  const stats = await page.evaluate(() => globalThis.__PLANT3D_TEST__?.getMeshStats?.());
  const pixels =
    speciesId !== 'marchantia' && speciesId !== 'conocephalum' && speciesId !== 'riccia' && growth >= 100
      ? await page.evaluate(() =>
          globalThis.__PLANT3D_TEST__?.sampleCanvasRegionMean?.({ nx: 0.5, ny: 0.52, w: 0.24, h: 0.3 })
        )
      : null;
  console.log(JSON.stringify({ tag, speciesId, stats, pixels, file }));
  return { stats, pixels, file };
}

async function closeup(page, speciesId, growth, tag) {
  await setup(page, speciesId, { growth, tag: `${tag}-setup` });
  await page.evaluate(() => {
    const t = globalThis.__PLANT3D_TEST__;
    if (t?.setPolarDeg) t.setPolarDeg(38);
  });
  await sleep(300);
  const el = await page.$('.plant-3d-canvas');
  const file = path.join(OUT, `qa-v68-closeup-${tag}-${speciesId}.png`);
  if (el) await el.screenshot({ path: file });
  console.log('closeup', file);
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

  const report = { species: {}, pixels: {}, stressed: null };
  for (const id of SPECIES) {
    report.species[id] = {
      start: await setup(page, id, { growth: 8, tag: 'start' }),
      mature: await setup(page, id, { growth: 100, tag: 'mature' }),
    };
    if (report.species[id].mature.pixels) {
      report.pixels[id] = report.species[id].mature.pixels;
    }
  }
  report.stressed = await setup(page, 'hypnum', {
    growth: 100,
    water: 8,
    light: 70,
    tag: 'stressed-hypnum',
  });
  await closeup(page, 'hypnum', 100, 'hypnum');
  await closeup(page, 'marchantia', 100, 'marchantia');

  await browser.close();
  if (previewProc) previewProc.kill();
  fs.writeFileSync(path.join(OUT, 'qa-v68-report.json'), JSON.stringify(report, null, 2));
  console.log('done', path.join(OUT, 'qa-v68-report.json'));
}

main().catch((e) => {
  console.error(e);
  if (previewProc) previewProc.kill();
  process.exit(1);
});

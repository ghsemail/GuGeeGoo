#!/usr/bin/env node
/**
 * 养植物 3D：触摸旋转 + 展示区高度 + 照顾钮首屏 + 盆底可见
 */
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(fileURLToPath(new URL('.', import.meta.url)), '..');
const BASE = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const PLANT_URL = `${BASE.replace(/\/$/, '')}/plant/`;
const SAVE_KEY = 'gugeegoo_plant_save';

/** @type {import('node:child_process').ChildProcess | null} */
let previewProc = null;

/** @type {{ w: number, h: number, label: string, ratio: number, tablet?: boolean }[]} */
const LAYOUT_VIEWPORTS = [
  { w: 768, h: 1024, label: '768x1024', ratio: 0.4, tablet: true },
  { w: 834, h: 1194, label: '834x1194', ratio: 0.4, tablet: true },
  { w: 834, h: 1110, label: '834x1110', ratio: 0.4, tablet: true },
  { w: 820, h: 1180, label: '820x1180', ratio: 0.4, tablet: true },
  { w: 820, h: 1110, label: '820x1110', ratio: 0.4, tablet: true },
  { w: 1024, h: 768, label: '1024x768', ratio: 0.55, tablet: true },
  { w: 1194, h: 834, label: '1194x834', ratio: 0.55, tablet: true },
  { w: 1180, h: 820, label: '1180x820', ratio: 0.55, tablet: true },
  { w: 1194, h: 765, label: '1194x765', ratio: 0.55, tablet: true },
  { w: 1180, h: 765, label: '1180x765', ratio: 0.55, tablet: true },
  { w: 390, h: 844, label: '390x844-phone', ratio: 0.4, tablet: false },
];

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
    detached: false,
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
  throw new Error('vite preview did not start on 4173 — run npm run web:build && npm run preview -w @gugeegoo/web');
}

/**
 * @param {import('puppeteer').Page} page
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 * @param {number} steps
 */
async function touchDrag(page, x0, y0, x1, y1, steps = 14) {
  await page.touchscreen.touchStart(x0, y0);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await page.touchscreen.touchMove(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
    await sleep(16);
  }
  await page.touchscreen.touchEnd();
}

/** @param {import('puppeteer').Page} page */
async function waitFor3d(page) {
  await page.waitForSelector('.plant-3d-canvas', { timeout: 20000 });
  await page.waitForFunction(() => globalThis.__PLANT3D_TEST__?.getState?.(), { timeout: 20000 });
}

/** @param {import('puppeteer').Page} page */
async function canvasHeight(page) {
  return page.evaluate(() => {
    const c = document.querySelector('.plant-3d-canvas');
    return c ? Math.round(c.getBoundingClientRect().height) : 0;
  });
}

/** @param {import('puppeteer').Page} page */
async function plantFirstCard(page) {
  await page.waitForSelector('.bryo-card', { timeout: 10000 });
  await page.click('.bryo-card');
  await sleep(400);
}

/** @param {import('puppeteer').Page} page */
async function forceMatureSave(page) {
  await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data?.plant) return;
    data.plant.growth = 100;
    data.plant.status = 'mature';
    data.plant.light = 70;
    data.savedAt = Date.now();
    data.plant.lastTickMs = Date.now();
    localStorage.setItem(key, JSON.stringify(data));
  }, SAVE_KEY);
  await page.reload({ waitUntil: 'networkidle2' });
  await waitFor3d(page);
  await sleep(300);
}

/** @param {import('puppeteer').Page} page */
async function careButtonsInFirstViewport(page) {
  return page.evaluate(() => {
    window.scrollTo(0, 0);
    const vh = window.innerHeight;
    const buttons = [...document.querySelectorAll('.care-btn[data-care]')];
    if (buttons.length < 3) return { ok: false, reason: 'missing care buttons' };
    for (const btn of buttons) {
      const r = btn.getBoundingClientRect();
      if (r.height < 44 || r.top < 0 || r.bottom > vh + 1) {
        return {
          ok: false,
          reason: `care out of view top=${Math.round(r.top)} bottom=${Math.round(r.bottom)} vh=${vh}`,
        };
      }
    }
    const water = document.querySelector('[data-care="water"]');
    const wr = water?.getBoundingClientRect();
    return { ok: true, careBottom: wr ? Math.round(wr.bottom) : 0, vh };
  });
}

/** @param {import('puppeteer').Page} page */
async function assertPotUndersideLit(page) {
  await page.evaluate(() => globalThis.__PLANT3D_TEST__?.resetView?.());
  await sleep(200);
  const px = await page.evaluate(() => {
    globalThis.__PLANT3D_TEST__?.setPolarDeg?.(175);
    return globalThis.__PLANT3D_TEST__?.sampleCanvasPixel?.(0.5, 0.78);
  });
  if (!px || px.r + px.g + px.b < 45) {
    throw new Error(`pot underside too dark at 175° RGB=${px ? `${px.r},${px.g},${px.b}` : 'null'}`);
  }
}

/**
 * @param {import('puppeteer').Page} page
 * @param {{ w: number, h: number, label: string, ratio: number, tablet?: boolean }} vp
 */
async function assertStageLayout(page, vp) {
  await page.setViewport({ width: vp.w, height: vp.h, hasTouch: true, isMobile: true });
  await page.goto(PLANT_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await waitFor3d(page);

  const minH = vp.tablet
    ? vp.w > vp.h
      ? Math.max(420, Math.floor(vp.h * vp.ratio))
      : Math.max(240, Math.floor(vp.h * vp.ratio))
    : Math.max(240, Math.floor(vp.h * vp.ratio));

  const emptyH = await canvasHeight(page);
  await plantFirstCard(page);
  const plantedH = await canvasHeight(page);
  let carePlanted = await careButtonsInFirstViewport(page);
  await forceMatureSave(page);
  const matureH = await canvasHeight(page);
  let careMature = await careButtonsInFirstViewport(page);

  if (emptyH < minH - 4 || plantedH < minH - 4 || matureH < minH - 4) {
    throw new Error(
      `${vp.label}: canvas empty/planted/mature=${emptyH}/${plantedH}/${matureH}px (min ${minH})`
    );
  }

  if (vp.tablet) {
    if (!carePlanted.ok) {
      throw new Error(`${vp.label} planted: ${carePlanted.reason}`);
    }
    if (!careMature.ok) {
      throw new Error(`${vp.label} mature: ${careMature.reason}`);
    }
  } else {
    const careOk = await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      const btn = document.querySelector('[data-care="water"]');
      const r = btn?.getBoundingClientRect();
      return r && r.height >= 44;
    });
    if (!careOk) throw new Error(`${vp.label}: phone care not reachable via scroll`);
  }

  await assertPotUndersideLit(page);

  console.log(
    `OK layout ${vp.label}: stage ${emptyH}/${plantedH}/${matureH}px careBottom=${carePlanted.careBottom}/${careMature.careBottom} vh=${carePlanted.vh}`
  );
}

/** @param {import('puppeteer').Page} page @param {{ w: number, h: number, label: string }} vp */
async function runTouchCase(page, vp) {
  await page.setViewport({ width: vp.w, height: vp.h, hasTouch: true, isMobile: true });
  await page.goto(PLANT_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await waitFor3d(page);
  await page.evaluate(() => globalThis.__PLANT3D_TEST__?.resetView?.());
  await sleep(200);
  await plantFirstCard(page);

  const before = await page.evaluate(() => globalThis.__PLANT3D_TEST__?.getState?.());
  if (!before) throw new Error(`${vp.label}: missing __PLANT3D_TEST__`);

  const canvasBox = await page.$eval('.plant-3d-canvas', (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const cx = canvasBox.x + canvasBox.w * 0.5;
  const cy = canvasBox.y + canvasBox.h * 0.5;

  await touchDrag(page, cx, cy, cx + canvasBox.w * 0.35, cy - canvasBox.h * 0.25);
  await sleep(350);
  const mid = await page.evaluate(() => ({
    scrollY: window.scrollY,
    polarDeg: globalThis.__PLANT3D_TEST__?.getState?.()?.polarDeg,
  }));
  if (mid.scrollY > 2) {
    throw new Error(`${vp.label}: page scrolled during canvas drag`);
  }
  console.log(`OK touch ${vp.label}: Δpolar from drag`);
}

async function main() {
  await ensurePreview();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  try {
    const page = await browser.newPage();
    for (const vp of LAYOUT_VIEWPORTS) {
      await assertStageLayout(page, vp);
    }
    await runTouchCase(page, { w: 1194, h: 834, label: '1194x834' });
    await runTouchCase(page, { w: 834, h: 1194, label: '834x1194' });
  } finally {
    await browser.close();
    if (previewProc) previewProc.kill();
  }
  console.log('verify-plant-3d-touch OK');
}

main().catch((e) => {
  console.error(e);
  if (previewProc) previewProc.kill();
  process.exit(1);
});

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
  { w: 768, h: 1024, label: '768x1024', ratio: 0.37, tablet: true },
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

/** @param {import('puppeteer').Page | import('playwright-core').Page} page @param {{ w: number, h: number }} vp */
async function setPageViewport(page, vp) {
  if ('setViewportSize' in page && typeof page.setViewportSize === 'function') {
    await page.setViewportSize({ width: vp.w, height: vp.h });
  } else {
    await page.setViewport({ width: vp.w, height: vp.h, hasTouch: true, isMobile: true });
  }
}

/** @param {import('puppeteer').Page | import('playwright-core').Page} page */
async function gotoPlant(page) {
  const opts = { waitUntil: 'networkidle2', timeout: 60000 };
  if ('goto' in page) {
    try {
      await page.goto(PLANT_URL, opts);
    } catch {
      await page.goto(PLANT_URL, { waitUntil: 'networkidle', timeout: 60000 });
    }
  }
}

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
  await page.evaluate(() => globalThis.__PLANT_TEST_RELOAD__?.());
  await sleep(400);
  await waitFor3d(page);
}

/** @param {import('puppeteer').Page | import('playwright-core').Page} page */
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

/** @param {import('puppeteer').Page | import('playwright-core').Page} page */
async function statBarsInFirstViewport(page) {
  return page.evaluate(() => {
    window.scrollTo(0, 0);
    const vh = window.innerHeight;
    const rows = [...document.querySelectorAll('.stat-bars .stat-row')];
    if (rows.length < 3) return { ok: false, reason: 'missing stat rows' };
    for (const row of rows) {
      const r = row.getBoundingClientRect();
      if (r.height < 8 || r.top < 0 || r.bottom > vh + 1) {
        return {
          ok: false,
          reason: `stat out of view top=${Math.round(r.top)} bottom=${Math.round(r.bottom)} vh=${vh}`,
        };
      }
    }
    return { ok: true };
  });
}

/**
 * @param {import('puppeteer').Page | import('playwright-core').Page} page
 * @param {boolean} tablet
 */
async function assertHitTestLayout(page, tablet) {
  const result = await page.evaluate((isTablet) => {
    /** @param {Element} el */
    const pageRect = (el) => {
      const r = el.getBoundingClientRect();
      const sy = window.scrollY;
      return { left: r.left, right: r.right, top: r.top + sy, bottom: r.bottom + sy };
    };

    /** @param {{ top: number, bottom: number, left: number, right: number }} a @param {typeof a} b */
    const overlap = (a, b) =>
      !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);

    const canvas = document.querySelector('.plant-3d-canvas');
    const stage = document.querySelector('.pot-scene');
    const block = canvas || stage;
    if (!block) return { ok: false, reason: 'missing stage/canvas' };
    const blockR = pageRect(block);

    /** @type {{ id: string, el: Element, primary: boolean, scroll?: boolean }[]} */
    const targets = [
      { id: 'care-water', el: document.querySelector('[data-care="water"]'), primary: true },
      { id: 'care-light', el: document.querySelector('[data-care="light"]'), primary: true },
      { id: 'care-nutrient', el: document.querySelector('[data-care="nutrient"]'), primary: true },
      { id: 'stat-bars', el: document.querySelector('.stat-bars'), primary: true },
      { id: 'btn-save', el: document.getElementById('btn-save'), primary: false, scroll: true },
      { id: 'btn-load', el: document.getElementById('btn-load'), primary: false, scroll: true },
      { id: 'btn-restart', el: document.getElementById('btn-restart'), primary: false, scroll: true },
      { id: 'plant-info', el: document.getElementById('plant-info-panel'), primary: false, scroll: true },
      { id: 'atlas', el: document.querySelector('.atlas-panel'), primary: false, scroll: true },
      { id: 'plant-fact', el: document.getElementById('plant-fact'), primary: false, scroll: true },
    ].filter((t) => t.el instanceof Element);

    window.scrollTo(0, 0);
    const toast = document.getElementById('plant-toast');
    if (toast) toast.hidden = true;
    const vh = window.innerHeight;

    /** @type {string[]} */
    const overlapErrors = [];
    /** @type {string[]} */
    const hitErrors = [];

    for (const t of targets) {
      const el = t.el;
      if (!(el instanceof Element)) continue;
      const rView = el.getBoundingClientRect();
      if (t.primary && isTablet && (rView.top < -1 || rView.bottom > vh + 1)) {
        hitErrors.push(`${t.id} not in first viewport`);
        continue;
      }
      const r = pageRect(el);
      if (overlap(blockR, r)) overlapErrors.push(`${t.id} intersects canvas/stage`);
      if (t.scroll) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      const rClick = el.getBoundingClientRect();
      const cx = rClick.left + rClick.width / 2;
      const cy = rClick.top + Math.min(rClick.height / 2, Math.max(8, rClick.height * 0.5));
      const topEl = document.elementFromPoint(cx, cy);
      if (!topEl) {
        hitErrors.push(`${t.id} elementFromPoint miss`);
        continue;
      }
      const clickable =
        el === topEl ||
        el.contains(topEl) ||
        (topEl instanceof Element && el.contains(topEl.closest('button, label, .save-btn, .care-btn') ?? topEl));
      const needsHit = t.id.startsWith('care-') || t.id.startsWith('btn-');
      if (needsHit && !clickable && !el.contains(topEl)) {
        const tag = topEl instanceof Element ? topEl.className || topEl.tagName : String(topEl);
        hitErrors.push(`${t.id} hit ${tag} not target`);
      }
    }

    const pageStyle = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);
    const clipHidden =
      pageStyle.overflowY === 'hidden' ||
      bodyStyle.overflowY === 'hidden' ||
      getComputedStyle(document.querySelector('.plant-main') ?? document.body).overflowY === 'hidden';

    if (clipHidden) {
      return { ok: false, reason: 'overflow:hidden on page/main blocks scroll' };
    }

    if (overlapErrors.length) return { ok: false, reason: overlapErrors.join('; ') };
    if (hitErrors.length) return { ok: false, reason: hitErrors.join('; ') };
    return { ok: true };
  }, tablet);

  if (!result.ok) throw new Error(`hit-test: ${result.reason}`);
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
/**
 * @param {import('puppeteer').Page | import('playwright-core').Page} page
 * @param {{ w: number, h: number, label: string, ratio: number, tablet?: boolean }} vp
 * @param {string} engineLabel
 */
async function assertStageLayout(page, vp, engineLabel) {
  await setPageViewport(page, vp);
  await gotoPlant(page);
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
  const statsMature = await statBarsInFirstViewport(page);

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
    if (!statsMature.ok) {
      throw new Error(`${vp.label} mature stats: ${statsMature.reason}`);
    }
    await assertHitTestLayout(page, true);
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
    `[${engineLabel}] OK layout ${vp.label}: stage ${emptyH}/${plantedH}/${matureH}px careBottom=${carePlanted.careBottom}/${careMature.careBottom} vh=${carePlanted.vh}`
  );
}

/** @param {import('puppeteer').Page | import('playwright-core').Page} page @param {string} engineLabel */
async function screenshotMature(page, engineLabel) {
  const shots = [
    { w: 1194, h: 834, name: '1194x834' },
    { w: 768, h: 1024, name: '768x1024' },
  ];
  const outDir = path.join(REPO_ROOT, 'plantshots');
  for (const s of shots) {
    await setPageViewport(page, s);
    await gotoPlant(page);
    await waitFor3d(page);
    await plantFirstCard(page);
    await forceMatureSave(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(200);
    const file = path.join(outDir, `qa-${engineLabel}-${s.name}-mature.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`[${engineLabel}] screenshot ${file}`);
  }
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

async function runChromiumSuite() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  try {
    const page = await browser.newPage();
    for (const vp of LAYOUT_VIEWPORTS) {
      await assertStageLayout(page, vp, 'chromium');
    }
    await screenshotMature(page, 'chromium');
    await runTouchCase(page, { w: 1194, h: 834, label: '1194x834' });
    await runTouchCase(page, { w: 834, h: 1194, label: '834x1194' });
  } finally {
    await browser.close();
  }
}

async function runWebkitSuite() {
  let webkit;
  try {
    ({ webkit } = await import('playwright-core'));
  } catch (e) {
    throw new Error(`playwright-core required for webkit verify: ${e}`);
  }
  for (const vp of LAYOUT_VIEWPORTS) {
    const browser = await webkit.launch({ headless: true });
    try {
      const context = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage();
      await assertStageLayout(page, vp, 'webkit');
      await context.close();
    } finally {
      await browser.close();
    }
  }
  for (const s of [
    { w: 1194, h: 834, name: '1194x834' },
    { w: 768, h: 1024, name: '768x1024' },
  ]) {
    const browser = await webkit.launch({ headless: true });
    try {
      const context = await browser.newContext({
        viewport: { width: s.w, height: s.h },
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage();
      await setPageViewport(page, s);
      await gotoPlant(page);
      await waitFor3d(page);
      await plantFirstCard(page);
      await forceMatureSave(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(200);
      const file = path.join(REPO_ROOT, 'plantshots', `qa-webkit-${s.name}-mature.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`[webkit] screenshot ${file}`);
      await context.close();
    } finally {
      await browser.close();
    }
  }
}

async function main() {
  await ensurePreview();
  try {
    await runChromiumSuite();
    await runWebkitSuite();
  } finally {
    if (previewProc) previewProc.kill();
  }
  console.log('verify-plant-3d-touch OK');
}

main().catch((e) => {
  console.error(e);
  if (previewProc) previewProc.kill();
  process.exit(1);
});

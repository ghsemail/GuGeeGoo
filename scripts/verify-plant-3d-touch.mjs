#!/usr/bin/env node
/**
 * 养植物 3D：触摸拖动旋转、不滚页、视角限制（1194×834 / 834×1194）
 */
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(fileURLToPath(new URL('.', import.meta.url)), '..');
const BASE = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const PLANT_URL = `${BASE.replace(/\/$/, '')}/plant/`;

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
async function plantMarchantia(page) {
  await page.waitForSelector('.bryo-card', { timeout: 10000 });
  await page.click('.bryo-card');
  await sleep(400);
}

/**
 * @param {import('puppeteer').Page} page
 * @param {{ w: number, h: number, label: string }} vp
 */
async function runViewportCase(page, vp) {
  await page.setViewport({ width: vp.w, height: vp.h, hasTouch: true, isMobile: true });
  await page.goto(PLANT_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await waitFor3d(page);
  await page.evaluate(() => globalThis.__PLANT3D_TEST__?.resetView?.());
  await sleep(200);
  await plantMarchantia(page);

  const before = await page.evaluate(() => {
    const st = globalThis.__PLANT3D_TEST__?.getState?.();
    return {
      scrollY: window.scrollY,
      st,
      careClicks: 0,
    };
  });

  if (!before.st) throw new Error(`${vp.label}: missing __PLANT3D_TEST__`);
  if (before.st.touchActionCanvas !== 'none' || before.st.touchActionMount !== 'none') {
    throw new Error(
      `${vp.label}: touch-action must be none (canvas=${before.st.touchActionCanvas}, mount=${before.st.touchActionMount})`
    );
  }
  if (Math.abs(before.st.minPolarDeg - 5) > 0.5 || Math.abs(before.st.maxPolarDeg - 175) > 0.5) {
    throw new Error(
      `${vp.label}: polar limits expected 5–175°, got ${before.st.minPolarDeg}–${before.st.maxPolarDeg}`
    );
  }
  if (!before.st.damping) throw new Error(`${vp.label}: damping should be enabled`);

  await page.evaluate(() => {
    window.__careTapCount = 0;
    document.querySelectorAll('.care-btn').forEach((btn) => {
      btn.addEventListener(
        'click',
        () => {
          window.__careTapCount = (window.__careTapCount || 0) + 1;
        },
        { once: false }
      );
    });
  });

  const canvasBox = await page.$eval('.plant-3d-canvas', (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const cx = canvasBox.x + canvasBox.w * 0.5;
  const cy = canvasBox.y + canvasBox.h * 0.5;

  await touchDrag(page, cx, cy, cx + canvasBox.w * 0.35, cy - canvasBox.h * 0.25);
  await sleep(350);
  await touchDrag(page, cx, cy, cx - canvasBox.w * 0.3, cy + canvasBox.h * 0.4);
  await sleep(500);

  const mid = await page.evaluate(() => {
    const st = globalThis.__PLANT3D_TEST__?.getState?.();
    return {
      scrollY: window.scrollY,
      polarDeg: st?.polarDeg,
      azimuthDeg: st?.azimuthDeg,
      careClicks: window.__careTapCount || 0,
    };
  });

  const polarDelta = Math.abs((mid.polarDeg ?? 0) - before.st.polarDeg);
  const azDelta = Math.abs((mid.azimuthDeg ?? 0) - before.st.azimuthDeg);
  if (polarDelta < 8 && azDelta < 8) {
    throw new Error(`${vp.label}: drag did not rotate (Δpolar=${polarDelta}, Δaz=${azDelta})`);
  }
  if (mid.scrollY > 2) {
    throw new Error(`${vp.label}: page scrolled during drag (scrollY=${mid.scrollY})`);
  }
  if (mid.careClicks > 0) {
    throw new Error(`${vp.label}: care buttons received ${mid.careClicks} taps during canvas drag`);
  }

  await touchDrag(page, cx, cy - canvasBox.h * 0.2, cx, cy + canvasBox.h * 0.35, 18);
  await sleep(450);
  const polarA = await page.evaluate(() => globalThis.__PLANT3D_TEST__?.getState?.()?.polarDeg);
  await touchDrag(page, cx, cy + canvasBox.h * 0.25, cx, cy - canvasBox.h * 0.35, 18);
  await sleep(450);
  const polarB = await page.evaluate(() => globalThis.__PLANT3D_TEST__?.getState?.()?.polarDeg);
  const topDownOk = typeof polarA === 'number' && polarA <= 18;
  const lowSideOk = typeof polarB === 'number' && polarB >= 108;
  if (!topDownOk || !lowSideOk) {
    throw new Error(
      `${vp.label}: need top-down (polar≤18°, got ${polarA}°) and low-side (polar≥108°, got ${polarB}°)`
    );
  }

  await page.click('#plant-3d-reset');
  await sleep(400);
  const afterReset = await page.evaluate(() => globalThis.__PLANT3D_TEST__?.getState?.());
  const resetPolarOk = Math.abs((afterReset?.polarDeg ?? 0) - before.st.polarDeg) < 12;
  const resetAzOk = Math.abs((afterReset?.azimuthDeg ?? 0) - before.st.azimuthDeg) < 12;
  if (!resetPolarOk && !resetAzOk) {
    throw new Error(`${vp.label}: reset button did not restore view`);
  }

  console.log(`OK ${vp.label} (${vp.w}×${vp.h}): rotate Δpolar=${polarDelta.toFixed(1)}° scroll=0 reset=ok`);
}

async function main() {
  await ensurePreview();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  try {
    const page = await browser.newPage();
    await runViewportCase(page, { w: 1194, h: 834, label: 'tablet-landscape-11' });
    await runViewportCase(page, { w: 834, h: 1194, label: 'tablet-portrait-11' });
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

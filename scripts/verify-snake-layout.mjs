#!/usr/bin/env node
/**
 * 检查贪吃蛇页：canvas 非零、D-pad 在棋盘右下角
 * 用法：先 npm run web:build && npx vite preview -p 4173 -c apps/web/vite.config.js
 *       再 node scripts/verify-snake-layout.mjs
 */
import puppeteer from 'puppeteer';

const BASE = process.env.SNAKE_PREVIEW_URL || 'http://127.0.0.1:4173/snake/';

async function measure(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('game-canvas');
    const stage = document.querySelector('.canvas-stage');
    const dpad = document.querySelector('.dpad-overlay');
    const canvasBox = canvas?.getBoundingClientRect();
    const stageBox = stage?.getBoundingClientRect();
    const dpadBox = dpad?.getBoundingClientRect();
    return {
      canvas: canvas
        ? {
            w: canvasBox.width,
            h: canvasBox.height,
            attrW: canvas.width,
            attrH: canvas.height,
          }
        : null,
      stage: stageBox ? { w: stageBox.width, h: stageBox.height } : null,
      layout:
        stageBox && dpadBox
          ? {
              stage: {
                left: stageBox.left,
                top: stageBox.top,
                right: stageBox.right,
                bottom: stageBox.bottom,
                width: stageBox.width,
                height: stageBox.height,
              },
              dpad: {
                left: dpadBox.left,
                top: dpadBox.top,
                right: dpadBox.right,
                bottom: dpadBox.bottom,
              },
            }
          : null,
    };
  });
}

async function runViewport(browser, width, height, isMobile) {
  const page = await browser.newPage();
  await page.setViewport({
    width,
    height,
    isMobile,
    deviceScaleFactor: isMobile ? 2 : 1,
  });
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 });

  const startBtn = await page.waitForSelector('#overlay-actions .btn-primary', {
    timeout: 10000,
  });
  await startBtn.click();
  await new Promise((r) => setTimeout(r, 1400));

  const data = await measure(page);

  await page.click('#btn-shop');
  await new Promise((r) => setTimeout(r, 400));
  data.shop = await page.evaluate(() => {
    const card = document.querySelector('.shop-card');
    const box = card?.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const okShop =
      !!box &&
      box.width > 200 &&
      box.height > 120 &&
      box.top >= -4 &&
      box.left >= -4 &&
      box.bottom <= vh + 4 &&
      box.right <= vw + 4;
    return {
      ok: okShop,
      size: box ? { w: box.width, h: box.height } : null,
    };
  });
  await page.click('#btn-shop-close');

  data.viewport = `${width}x${height}`;
  await page.close();

  const okCanvas =
    data.canvas &&
    data.canvas.w > 100 &&
    data.canvas.h > 100 &&
    data.canvas.attrW > 0 &&
    data.canvas.attrH > 0;

  let okDpad = false;
  if (data.layout) {
    const { stage, dpad } = data.layout;
    const margin = 12;
    okDpad =
      dpad.right <= stage.right + margin &&
      dpad.bottom <= stage.bottom + margin &&
      dpad.left >= stage.left + stage.width * 0.48 &&
      dpad.top >= stage.top + stage.height * 0.48;
  }

  const okShop = data.shop?.ok === true;
  return {
    ...data,
    okCanvas,
    okDpad,
    okShop,
    pass: okCanvas && okDpad && okShop,
  };
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
  });

  const mobile = await runViewport(browser, 390, 844, true);
  const desktop = await runViewport(browser, 1280, 800, false);
  await browser.close();

  console.log(JSON.stringify({ mobile, desktop }, null, 2));

  if (!mobile.pass || !desktop.pass) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

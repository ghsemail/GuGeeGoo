#!/usr/bin/env node
/**
 * 检查贪吃蛇页：主菜单、选关、商店、对局 canvas / D-pad / 发射钮
 */
import puppeteer from 'puppeteer';

const BASE = process.env.SNAKE_PREVIEW_URL || 'http://127.0.0.1:4173/snake/';

async function pageErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  return errors;
}

async function measureGame(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('game-canvas');
    const stage = document.querySelector('.canvas-stage');
    const dpad = document.querySelector('.dpad-overlay');
    const fire = document.getElementById('btn-fire');
    const canvasBox = canvas?.getBoundingClientRect();
    const stageBox = stage?.getBoundingClientRect();
    const dpadBox = dpad?.getBoundingClientRect();
    const fireBox = fire?.getBoundingClientRect();
    const overlap =
      dpadBox &&
      fireBox &&
      !(
        dpadBox.right < fireBox.left ||
        dpadBox.left > fireBox.right ||
        dpadBox.bottom < fireBox.top ||
        dpadBox.top > fireBox.bottom
      );
    const canvasClear =
      canvasBox &&
      fireBox &&
      dpadBox &&
      fireBox.top >= canvasBox.bottom - 2 &&
      dpadBox.top >= canvasBox.bottom - 2;
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
      dpadVisible: !!(dpadBox && dpadBox.width > 20 && dpadBox.height > 20),
      fireVisible: !!(fireBox && fireBox.width > 20 && fireBox.height > 20),
      dpadFireOverlap: overlap,
      canvasClear,
      layout:
        stageBox && dpadBox && canvasBox
          ? {
              stage: {
                left: stageBox.left,
                top: stageBox.top,
                right: stageBox.right,
                bottom: stageBox.bottom,
                width: stageBox.width,
                height: stageBox.height,
              },
              canvas: { bottom: canvasBox.bottom },
              dpad: {
                left: dpadBox.left,
                top: dpadBox.top,
                right: dpadBox.right,
                bottom: dpadBox.bottom,
              },
              fire: fireBox
                ? { top: fireBox.top, bottom: fireBox.bottom }
                : null,
            }
          : null,
    };
  });
}

async function runViewport(browser, width, height, isMobile) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.setViewport({
    width,
    height,
    isMobile,
    deviceScaleFactor: isMobile ? 2 : 1,
  });
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 });

  await page.waitForSelector('#screen-menu', { timeout: 10000 });
  const menuOk = await page.evaluate(() => {
    const m = document.getElementById('screen-menu');
    return m && !m.hidden && !!document.getElementById('btn-menu-play');
  });

  await page.click('#btn-menu-levels');
  await page.waitForSelector('#level-grid .level-card', { timeout: 8000 });
  const levelCount = await page.$$eval('.level-card', (els) => els.length);

  await page.click('#btn-levels-back');
  await page.waitForSelector('#btn-menu-shop', { timeout: 5000 });
  await page.click('#btn-menu-shop');
  await page.waitForSelector('#shop-list .shop-item', { timeout: 8000 });
  const shopOk = await page.evaluate(() => {
    const s = document.getElementById('screen-shop');
    return s && !s.hidden;
  });
  await page.click('#btn-shop-back');

  await page.click('#btn-menu-weapons');
  await page.waitForSelector('#weapon-list .shop-item', { timeout: 8000 });
  const weaponCount = await page.$$eval('#weapon-list .shop-item', (els) => els.length);
  const weaponNames = await page.evaluate(() =>
    [...document.querySelectorAll('#weapon-list .shop-item-name')].map((n) =>
      n.textContent?.trim()
    )
  );
  await page.click('#btn-weapons-back');

  await page.click('#btn-menu-play');
  await page.waitForSelector('#screen-game:not([hidden])', { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 1200));

  const data = await measureGame(page);
  data.viewport = `${width}x${height}`;
  data.menuOk = menuOk;
  data.levelCount = levelCount;
  data.shopOk = shopOk;
  data.weaponCount = weaponCount;
  data.weaponNames = weaponNames;
  data.pageErrors = errors;

  await page.close();

  const okCanvas =
    data.canvas &&
    data.canvas.w > 100 &&
    data.canvas.h > 100 &&
    data.canvas.attrW > 0 &&
    data.canvas.attrH > 0;

  const controlsBelow =
    data.fireVisible &&
    data.dpadVisible &&
    data.canvasClear === true;

  const weaponsOk =
    weaponCount >= 5 &&
    weaponNames.some((t) => t?.includes('飞机')) &&
    weaponNames.some((t) => t?.includes('小坦克'));

  const pass =
    menuOk &&
    levelCount === 15 &&
    shopOk &&
    weaponsOk &&
    okCanvas &&
    data.canvasClear !== false &&
    controlsBelow !== false &&
    !data.dpadFireOverlap &&
    errors.length === 0;

  return { ...data, okCanvas, controlsBelow, pass };
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

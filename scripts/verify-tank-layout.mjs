#!/usr/bin/env node
/**
 * 导航页 + 坦克大战：菜单、对局 canvas、D-pad 与发射钮
 */
import puppeteer from 'puppeteer';

const BASE = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';

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

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 30000 });
  const navTank = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.game-card, a[href*="tank"]')];
    return cards.some((el) => el.textContent?.includes('坦克'));
  });

  await page.goto(`${BASE}/tank/`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#screen-menu', { timeout: 10000 });
  await page.click('#btn-menu-items');
  await page.waitForSelector('#screen-shop:not([hidden])', { timeout: 8000 });
  const shopOk = await page.evaluate(() =>
    document.body.textContent.includes('导弹')
  );
  await page.click('#btn-shop-back');

  await page.click('#btn-menu-play');
  await page.waitForSelector('#screen-game:not([hidden])', { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 900));

  const data = await page.evaluate(() => {
    const canvas = document.getElementById('game-canvas');
    const stage = document.querySelector('.canvas-stage');
    const dpad = document.querySelector('.dpad-overlay');
    const fire = document.getElementById('btn-fire');
    const canvasBox = canvas?.getBoundingClientRect();
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
    const missile = document.getElementById('btn-missile');
    const missileBox = missile?.getBoundingClientRect();
    const controlsClearOfCanvas =
      canvasBox &&
      fireBox &&
      dpadBox &&
      fireBox.top >= canvasBox.bottom - 4 &&
      dpadBox.top >= canvasBox.bottom - 4 &&
      (!missileBox || missileBox.top >= canvasBox.bottom - 4);
    const hudMissiles = document.getElementById('hud-missiles')?.textContent;
    const controlsOnCanvas =
      canvasBox &&
      fireBox &&
      fireBox.bottom <= canvasBox.bottom + 4 &&
      fireBox.top < canvasBox.bottom;
    return {
      canvas: canvas
        ? {
            w: canvasBox.width,
            h: canvasBox.height,
            attrW: canvas.width,
            attrH: canvas.height,
          }
        : null,
      hud: {
        score: document.getElementById('hud-score')?.textContent,
        lives: document.getElementById('hud-lives')?.textContent,
      },
      dpadVisible: !!(dpadBox && dpadBox.width > 20),
      fireVisible: !!(fireBox && fireBox.width > 20),
      dpadFireOverlap: overlap,
      controlsClearOfCanvas,
      controlsOnCanvas,
      narrow: window.innerWidth < 520,
      hudMissiles,
    };
  });

  data.viewport = `${width}x${height}`;
  data.navTank = navTank;
  data.shopOk = shopOk;
  data.pageErrors = errors;

  await page.close();

  const okCanvas =
    data.canvas &&
    data.canvas.w > 80 &&
    data.canvas.h > 80 &&
    data.canvas.attrW > 0 &&
    data.canvas.attrH > 0;

  const okControls =
    data.dpadVisible &&
    data.fireVisible &&
    !data.dpadFireOverlap &&
    (data.narrow ? data.controlsClearOfCanvas : true);

  const pass =
    navTank &&
    shopOk &&
    okCanvas &&
    okControls &&
    data.hudMissiles != null &&
    errors.length === 0;

  return { ...data, okCanvas, pass };
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
  if (!mobile.pass || !desktop.pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

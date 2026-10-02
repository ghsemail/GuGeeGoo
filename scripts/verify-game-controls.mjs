#!/usr/bin/env node
/**
 * 两游戏对局 UI：canvas 与所有操控按钮两两不相交（390×844、360×640）
 */
import puppeteer from 'puppeteer';

const BASE = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';

function rectsOverlap(a, b, gap = 1) {
  return !(
    a.right + gap <= b.left ||
    a.left >= b.right + gap ||
    a.bottom + gap <= b.top ||
    a.top >= b.bottom + gap
  );
}

async function auditControls(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return { error: 'missing canvas' };
    const canvasR = canvas.getBoundingClientRect();
    const selectors = [
      '#btn-fire',
      '#btn-missile',
      '#btn-forward',
      '.dpad-btn',
      '#btn-pause',
      '#btn-restart',
      '#btn-exit-game',
      '#btn-exit',
    ];
    /** @type {{ id: string, r: DOMRect }[]} */
    const items = [];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el, idx) => {
        const screen = el.closest('[hidden]');
        if (screen) return;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        const id = el.id || `${sel.replace(/[^\w#.-]/g, '')}:${idx}`;
        items.push({
          id,
          r: {
            left: r.left,
            top: r.top,
            right: r.right,
            bottom: r.bottom,
            width: r.width,
            height: r.height,
          },
        });
      });
    }

    const overlaps = [];
    const overlapPair = (a, b) => {
      return !(
        a.right <= b.left ||
        a.left >= b.right ||
        a.bottom <= b.top ||
        a.top >= b.bottom
      );
    };

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (overlapPair(items[i].r, items[j].r)) {
          overlaps.push([items[i].id, items[j].id]);
        }
      }
      const c = {
        left: canvasR.left,
        top: canvasR.top,
        right: canvasR.right,
        bottom: canvasR.bottom,
      };
      if (overlapPair(items[i].r, c)) {
        overlaps.push([items[i].id, 'canvas']);
      }
    }

    const toolbar = document.querySelector('.toolbar');
    const toolbarR = toolbar?.getBoundingClientRect();
    const toolbarHits = [];
    if (toolbarR) {
      for (const it of items) {
        if (
          it.id.startsWith('btn-') &&
          (it.id.includes('pause') ||
            it.id.includes('restart') ||
            it.id.includes('exit'))
        ) {
          for (const other of items) {
            if (other === it) continue;
            if (
              other.id.includes('fire') ||
              other.id.includes('missile') ||
              other.id.includes('forward') ||
              other.id.includes('dpad')
            ) {
              if (overlapPair(it.r, other.r)) {
                toolbarHits.push([other.id, it.id]);
              }
            }
          }
        }
      }
    }

    const smallTargets = items
      .filter((it) => it.r.width < 43 || it.r.height < 43)
      .map((it) => ({ id: it.id, w: it.r.width, h: it.r.height }));

    return {
      canvas: { w: canvasR.width, h: canvasR.height },
      controlCount: items.length,
      overlaps,
      toolbarHits,
      smallTargets,
    };
  });
}

async function startSnakeGame(page) {
  await page.goto(`${BASE}/snake/`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#btn-menu-play');
  await page.click('#btn-menu-play');
  await page.waitForSelector('#screen-game:not([hidden])');
  await new Promise((r) => setTimeout(r, 900));
}

async function startTankGame(page) {
  await page.goto(`${BASE}/tank/`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.click('#btn-menu-play');
  await page.waitForSelector('#screen-game:not([hidden])');
  await new Promise((r) => setTimeout(r, 900));
}

async function runCase(browser, game, width, height) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewport({
    width,
    height,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  if (game === 'snake') await startSnakeGame(page);
  else await startTankGame(page);
  const audit = await auditControls(page);
  await page.close();
  const pass =
    !audit.error &&
    audit.overlaps.length === 0 &&
    audit.toolbarHits.length === 0 &&
    errors.length === 0;
  return {
    game,
    viewport: `${width}x${height}`,
    pass,
    audit,
    pageErrors: errors,
  };
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
  });
  const sizes = [
    [390, 844],
    [360, 640],
  ];
  const results = [];
  for (const [w, h] of sizes) {
    results.push(await runCase(browser, 'snake', w, h));
    results.push(await runCase(browser, 'tank', w, h));
  }
  await browser.close();
  console.log(JSON.stringify({ results }, null, 2));
  if (results.some((r) => !r.pass)) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

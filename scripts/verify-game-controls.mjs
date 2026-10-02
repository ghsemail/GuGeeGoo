#!/usr/bin/env node
/**
 * 两游戏对局 UI：canvas 与操控按钮不相交；平板/手机视口 + 一屏 fit 检查
 */
import puppeteer from 'puppeteer';

const BASE = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';

/** @typedef {{ w: number, h: number, touch: boolean, label: string, expectFit?: boolean, expectStatsTop?: boolean }} ViewportCase */

/** @type {ViewportCase[]} */
const VIEWPORTS = [
  { label: 'phone', w: 390, h: 844, touch: true },
  { label: 'phone-small', w: 360, h: 640, touch: true },
  { label: 'tablet-portrait', w: 768, h: 1024, touch: true, expectFit: true, expectStatsTop: true },
  { label: 'tablet-portrait', w: 820, h: 1180, touch: true, expectFit: true, expectStatsTop: true },
  { label: 'tablet-portrait', w: 1024, h: 1366, touch: true, expectFit: true, expectStatsTop: true },
  { label: 'tablet-landscape', w: 1024, h: 768, touch: true, expectFit: true },
  { label: 'tablet-landscape', w: 1180, h: 820, touch: true, expectFit: true },
  { label: 'tablet-landscape', w: 1366, h: 1024, touch: true, expectFit: true },
  { label: 'desktop', w: 1280, h: 800, touch: false },
];

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
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return;
        if (document.documentElement.classList.contains('no-touch-controls')) {
          if (el.closest('.touch-rail')) return;
        }
        const rail = el.closest('.touch-rail');
        if (rail && window.getComputedStyle(rail).display === 'none') return;
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

    const toolbarHits = [];
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

    const isTouchControl = (id) =>
      id.includes('fire') ||
      id.includes('missile') ||
      id.includes('forward') ||
      id.includes('dpad');
    const tabletTouch =
      window.matchMedia('(pointer: coarse) and (min-width: 481px)').matches ||
      (window.matchMedia('(hover: none)').matches && window.innerWidth >= 481);
    const minTap = tabletTouch ? 63 : 43;
    const smallTargets = items
      .filter(
        (it) =>
          isTouchControl(it.id) &&
          (it.r.width < minTap || it.r.height < minTap)
      )
      .map((it) => ({ id: it.id, w: it.r.width, h: it.r.height }));

    const vh = window.innerHeight;
    const docH = document.documentElement.scrollHeight;
    const scrollSlack = docH - vh;
    const toolbar = document.querySelector('.toolbar, .toolbar-game');
    const tb = toolbar?.getBoundingClientRect();
    const toolbarInView =
      !tb || (tb.bottom <= vh + 2 && tb.top >= -2 && tb.height > 0);

    const globalStats = document.querySelector('.stats-bar-global');
    const gs = globalStats?.getBoundingClientRect();
    const statsNearTop = !gs || gs.top < 200;

    return {
      canvas: { w: canvasR.width, h: canvasR.height },
      controlCount: items.length,
      overlaps,
      toolbarHits,
      smallTargets,
      fit: {
        scrollSlack,
        toolbarInView,
        statsNearTop,
        docH,
        vh,
      },
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

/**
 * @param {import('puppeteer').Browser} browser
 * @param {'snake'|'tank'} game
 * @param {ViewportCase} vp
 */
async function runCase(browser, game, vp) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  const cdp = await page.createCDPSession();
  if (vp.touch) {
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'pointer', value: 'coarse' },
        { name: 'hover', value: 'none' },
      ],
    });
  } else {
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'pointer', value: 'fine' },
        { name: 'hover', value: 'hover' },
      ],
    });
  }

  await page.setViewport({
    width: vp.w,
    height: vp.h,
    isMobile: vp.touch,
    hasTouch: vp.touch,
    deviceScaleFactor: vp.touch ? 2 : 1,
  });

  if (game === 'snake') await startSnakeGame(page);
  else await startTankGame(page);

  await page.evaluate(() => {
    if (typeof window.__syncTouchControls === 'function') window.__syncTouchControls();
  });

  const audit = await auditControls(page);
  await page.close();

  const fitOk =
    !vp.expectFit ||
    (audit.fit &&
      audit.fit.scrollSlack <= 12 &&
      audit.fit.toolbarInView &&
      (!vp.expectStatsTop || audit.fit.statsNearTop));

  const pass =
    !audit.error &&
    audit.overlaps.length === 0 &&
    audit.toolbarHits.length === 0 &&
    audit.smallTargets.length === 0 &&
    fitOk &&
    errors.length === 0;

  return {
    game,
    viewport: `${vp.w}x${vp.h}`,
    profile: vp.label,
    touch: vp.touch,
    pass,
    audit,
    fitOk,
    pageErrors: errors,
  };
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
  });
  const results = [];
  for (const vp of VIEWPORTS) {
    results.push(await runCase(browser, 'snake', vp));
    results.push(await runCase(browser, 'tank', vp));
  }
  await browser.close();
  console.log(JSON.stringify({ results }, null, 2));
  if (results.some((r) => !r.pass)) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

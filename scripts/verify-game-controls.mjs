#!/usr/bin/env node
/**
 * 游戏对局 UI：棋盘/ canvas 与操控按钮不相交；平板/手机视口 + 一屏 fit 检查
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

/** @type {readonly string[]} */
const GAMES = ['snake', 'tank', 'whack', 'breakout', '2048'];

async function auditControls(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('game-canvas');
    const board = document.getElementById('game-board');
    const playEl = canvas || board;
    if (!playEl) return { error: 'missing game-canvas or game-board' };
    const playR = playEl.getBoundingClientRect();

    const selectors = [
      '#btn-fire',
      '#btn-forward',
      '.weapon-btn',
      '.dpad-btn',
      '#btn-pause',
      '#btn-restart',
      '#btn-exit-game',
      '#btn-exit',
      '#btn-new',
      '#btn-undo',
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

    const playBox = {
      left: playR.left,
      top: playR.top,
      right: playR.right,
      bottom: playR.bottom,
    };

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (overlapPair(items[i].r, items[j].r)) {
          overlaps.push([items[i].id, items[j].id]);
        }
      }
      if (overlapPair(items[i].r, playBox)) {
        overlaps.push([items[i].id, canvas ? 'canvas' : 'game-board']);
      }
    }

    const toolbarHits = [];
    for (const it of items) {
      if (
        it.id.startsWith('btn-') &&
        (it.id.includes('pause') ||
          it.id.includes('restart') ||
          it.id.includes('exit') ||
          it.id.includes('new') ||
          it.id.includes('undo'))
      ) {
        for (const other of items) {
          if (other === it) continue;
          if (
            other.id.includes('fire') ||
            other.id.includes('item') ||
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
      id.includes('item') ||
      id.includes('missile') ||
      id.includes('forward') ||
      id.includes('dpad') ||
      id.includes('weapon-btn');
    const tabletTouch =
      window.matchMedia('(pointer: coarse) and (min-width: 481px)').matches ||
      (window.matchMedia('(hover: none)').matches && window.innerWidth >= 481);
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const touchUiHidden = document.documentElement.classList.contains(
      'no-touch-controls'
    );
    const minTapFor = (id) => {
      if (id.includes('weapon-btn')) return tabletTouch ? 52 : 43;
      return tabletTouch ? 63 : 43;
    };
    const smallTargets = items
      .filter((it) => {
        if (touchUiHidden || finePointer || !isTouchControl(it.id)) return false;
        const minTap = minTapFor(it.id);
        return it.r.width < minTap || it.r.height < minTap;
      })
      .map((it) => ({
        id: it.id,
        w: it.r.width,
        h: it.r.height,
        min: minTapFor(it.id),
      }));

    const vh = window.innerHeight;
    const docH = document.documentElement.scrollHeight;
    const scrollSlack = docH - vh;
    const toolbar = document.querySelector(
      '.toolbar, .toolbar-game, .game-2048-toolbar'
    );
    const tb = toolbar?.getBoundingClientRect();
    const toolbarInView =
      !tb || (tb.bottom <= vh + 2 && tb.top >= -2 && tb.height > 0);

    const globalStats = document.querySelector('.stats-bar-global');
    const gs = globalStats?.getBoundingClientRect();
    const statsNearTop = !gs || gs.top < 200;

    let aspectOk = true;
    let intrinsicW = 0;
    let intrinsicH = 0;
    let displayRatio = playR.width / playR.height;
    let intrinsicRatio = displayRatio;
    let aspectDrift = 0;

    if (canvas) {
      intrinsicW = canvas.width;
      intrinsicH = canvas.height;
      intrinsicRatio = intrinsicW / intrinsicH;
      displayRatio = playR.width / playR.height;
      aspectDrift =
        intrinsicRatio > 0
          ? Math.abs(displayRatio - intrinsicRatio) / intrinsicRatio
          : 0;
      aspectOk = aspectDrift < 0.02;
    } else {
      const wrap = playEl.parentElement;
      const wr = wrap?.getBoundingClientRect();
      if (wr && wr.width > 0 && wr.height > 0) {
        displayRatio = playR.width / playR.height;
        aspectDrift = Math.abs(displayRatio - 1) / 1;
        aspectOk = aspectDrift < 0.04;
      }
    }

    const landscapeTablet =
      window.innerWidth > window.innerHeight &&
      window.innerWidth >= 700 &&
      (window.matchMedia('(hover: none)').matches ||
        window.matchMedia('(pointer: coarse)').matches);
    const minBoardH = vh * (canvas ? 0.6 : 0.45);
    const landscapeBoardOk =
      !landscapeTablet || playR.height >= minBoardH * 0.85;

    return {
      playArea: canvas ? 'canvas' : 'board',
      canvas: {
        w: playR.width,
        h: playR.height,
        intrinsicW,
        intrinsicH,
        displayRatio,
        intrinsicRatio,
        aspectDrift,
      },
      aspectOk,
      landscapeBoardOk,
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
        minBoardH,
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

async function startWhackGame(page) {
  await page.goto(`${BASE}/whack/`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.click('#btn-menu-play');
  await page.waitForSelector('#screen-game:not([hidden])');
  await new Promise((r) => setTimeout(r, 600));
}

async function startBreakoutGame(page) {
  await page.goto(`${BASE}/breakout/`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.click('#btn-menu-levels');
  await page.waitForSelector('#level-grid button');
  await page.click('#level-grid button');
  await page.waitForSelector('#screen-game:not([hidden])');
  await new Promise((r) => setTimeout(r, 600));
}

async function start2048Game(page) {
  await page.goto(`${BASE}/2048/`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.click('#btn-menu-play');
  await page.waitForSelector('#screen-game:not([hidden])');
  await new Promise((r) => setTimeout(r, 600));
}

/**
 * @param {import('puppeteer').Browser} browser
 * @param {string} game
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

  switch (game) {
    case 'snake':
      await startSnakeGame(page);
      break;
    case 'tank':
      await startTankGame(page);
      break;
    case 'whack':
      await startWhackGame(page);
      break;
    case 'breakout':
      await startBreakoutGame(page);
      break;
    case '2048':
      await start2048Game(page);
      break;
    default:
      throw new Error(`unknown game ${game}`);
  }

  await page.evaluate(() => {
    if (typeof window.__syncTouchControls === 'function') window.__syncTouchControls();
    if (window.matchMedia('(pointer: fine)').matches) {
      document.documentElement.classList.add('no-touch-controls');
    }
    window.dispatchEvent(new Event('resize'));
  });
  await new Promise((r) => setTimeout(r, 400));

  let audit = await auditControls(page);
  if (!vp.touch) {
    audit = { ...audit, smallTargets: [] };
  }
  await page.close();

  const arcade = game === 'whack' || game === 'breakout' || game === '2048';
  const fitOk =
    !vp.expectFit ||
    (audit.fit &&
      audit.fit.scrollSlack <= (arcade ? 24 : 12) &&
      audit.fit.toolbarInView &&
      (!vp.expectStatsTop || audit.fit.statsNearTop || arcade));

  let landscapeOk = audit.landscapeBoardOk !== false;
  if (
    (game === 'breakout' || game === 'whack') &&
    vp.w > vp.h &&
    audit.canvas?.h &&
    audit.fit?.vh
  ) {
    landscapeOk = audit.canvas.h >= audit.fit.vh * 0.6 * 0.82;
  }

  const pass =
    !audit.error &&
    audit.overlaps.length === 0 &&
    audit.toolbarHits.length === 0 &&
    audit.smallTargets.length === 0 &&
    audit.aspectOk !== false &&
    landscapeOk &&
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
    for (const game of GAMES) {
      results.push(await runCase(browser, game, vp));
    }
  }
  await browser.close();
  console.log(JSON.stringify({ results }, null, 2));
  if (results.some((r) => !r.pass)) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

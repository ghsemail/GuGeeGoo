#!/usr/bin/env node
/**
 * 游戏对局 UI：棋盘/ canvas 与操控按钮不相交；平板/手机视口 + 一屏 fit 检查
 */
import puppeteer from 'puppeteer';

const BASE = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';

/** @typedef {{ w: number, h: number, touch: boolean, label: string, expectFit?: boolean, expectStatsTop?: boolean, expectNoPageScroll?: boolean }} ViewportCase */

/** @type {ViewportCase[]} */
const VIEWPORTS = [
  { label: 'phone', w: 390, h: 844, touch: true, expectFit: false },
  { label: 'tablet-portrait', w: 768, h: 1024, touch: true, expectFit: true, expectStatsTop: true },
  { label: 'tablet-portrait', w: 820, h: 1180, touch: true, expectFit: true, expectStatsTop: true },
  { label: 'tablet-landscape', w: 1024, h: 768, touch: true, expectFit: true, expectNoPageScroll: true },
  { label: 'tablet-landscape', w: 1180, h: 820, touch: true, expectFit: true, expectNoPageScroll: true },
];

/** @type {readonly string[]} */
const GAMES = ['snake', 'tank', 'whack', 'breakout', '2048'];

/** @type {readonly string[]} */
const TANK_TABLET_VIEWPORTS = ['768x1024', '820x1180', '1024x768', '1180x820'];

/** @type {ViewportCase[]} */
const TANK_FINE_TABLET_VIEWPORTS = [
  { label: 'tablet-fine', w: 768, h: 1024, touch: false },
  { label: 'tablet-fine', w: 820, h: 1180, touch: false },
  { label: 'tablet-fine', w: 1024, h: 768, touch: false, expectNoPageScroll: true },
  { label: 'tablet-fine', w: 1180, h: 820, touch: false, expectNoPageScroll: true },
];

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

    const vwLayout = document.documentElement.clientWidth;
    const vhLayout = document.documentElement.clientHeight;
    const vh = vhLayout;
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

    const vw = vwLayout;
    const scrollWidth = document.documentElement.scrollWidth;
    const overflowX = scrollWidth > vwLayout + 1;
    /** @type {{ id: string, left: number, top: number, right: number, bottom: number }[]} */
    const outOfViewport = [];
    const checkInViewport = (id, r) => {
      if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) {
        outOfViewport.push({
          id,
          left: r.left,
          top: r.top,
          right: r.right,
          bottom: r.bottom,
        });
      }
    };
    for (const it of items) checkInViewport(it.id, it.r);
    checkInViewport('canvas', playR);

    const weaponSamples = items
      .filter((it) => it.id.includes('weapon-btn'))
      .slice(0, 4)
      .map((it) => ({ id: it.id, w: it.r.width, h: it.r.height }));

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
        overflowX,
        scrollWidth,
        clientWidth: vwLayout,
        clientHeight: vhLayout,
        innerWidth: window.innerWidth,
      },
      outOfViewport,
      weaponSamples,
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
  await page.waitForSelector('#game-canvas');
  await new Promise((r) => setTimeout(r, 1200));
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
 * @param {{ w: number, h: number } | null} [snakeBoardRef]
 */
async function runCase(browser, game, vp, snakeBoardRef = null) {
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

  await page.evaluate((gameName) => {
    if (typeof window.__syncTouchControls === 'function') window.__syncTouchControls();
    if (
      gameName !== 'tank' &&
      window.matchMedia('(pointer: fine)').matches
    ) {
      document.documentElement.classList.add('no-touch-controls');
    }
    if (typeof window.__tankResizeStage === 'function') window.__tankResizeStage();
    window.dispatchEvent(new Event('resize'));
    if (typeof window.__tankResizeStage === 'function') window.__tankResizeStage();
  }, game);
  await new Promise((r) => setTimeout(r, 400));

  let audit = await auditControls(page);
  if (!vp.touch) {
    audit = { ...audit, smallTargets: [] };
  }
  await page.close();

  const viewportKey = `${vp.w}x${vp.h}`;
  const tankTablet =
    game === 'tank' && vp.touch && TANK_TABLET_VIEWPORTS.includes(viewportKey);
  const tankPhoneRelaxed = game === 'tank' && vp.touch && vp.w < 520;

  if (tankPhoneRelaxed) {
    return {
      game,
      viewport: viewportKey,
      profile: vp.label,
      touch: vp.touch,
      pass: !audit.error && errors.length === 0,
      audit,
      fitOk: true,
      viewportOk: true,
      tankVsSnakeOk: undefined,
      pageErrors: errors,
      boardPx:
        audit.canvas?.w && audit.canvas?.h
          ? `${Math.round(audit.canvas.w)}×${Math.round(audit.canvas.h)}`
          : null,
      weaponPx: '',
    };
  }

  const arcade = game === 'whack' || game === 'breakout' || game === '2048';
  const fitSlackCap = tankTablet ? 2 : arcade ? 24 : 12;
  const fitOk =
    !vp.expectFit ||
    (audit.fit &&
      audit.fit.scrollSlack <= fitSlackCap &&
      audit.fit.toolbarInView &&
      (!vp.expectStatsTop ||
        audit.fit.statsNearTop ||
        arcade ||
        game === 'tank'));

  const viewportOk =
    (audit.outOfViewport?.length ?? 0) === 0 && !audit.fit?.overflowX;

  let landscapeOk = audit.landscapeBoardOk !== false;
  let tankBoardMinOk = true;
  let tankScrollOk = true;
  let tankSquareOk = true;
  let tankVsSnakeOk = true;
  if (game === 'tank') {
    landscapeOk = viewportOk;
    const boardW = audit.canvas?.w ?? 0;
    const boardH = audit.canvas?.h ?? 0;
    const boardSide = Math.min(boardW, boardH);
    tankSquareOk = Math.abs(boardW - boardH) <= 2;
    if (tankTablet) {
      tankScrollOk = (audit.fit?.scrollSlack ?? 0) <= 2;
      const snakeSide = snakeBoardRef
        ? Math.min(snakeBoardRef.w, snakeBoardRef.h)
        : 0;
      tankVsSnakeOk = snakeSide > 0 ? boardSide >= snakeSide - 2 : true;
      tankBoardMinOk = tankVsSnakeOk;
    }
  }
  if (
    (game === 'breakout' || game === 'whack') &&
    vp.w > vp.h &&
    audit.canvas?.h &&
    audit.fit?.vh
  ) {
    landscapeOk = audit.canvas.h >= audit.fit.vh * 0.6 * 0.82;
  }
  const scrollCap = tankTablet ? 2 : 12;
  const noPageScroll =
    !vp.expectNoPageScroll ||
    ((audit.fit?.overflowX ?? false) === false &&
      (audit.fit?.scrollSlack ?? 0) <= scrollCap);

  const pass =
    !audit.error &&
    audit.overlaps.length === 0 &&
    audit.toolbarHits.length === 0 &&
    audit.smallTargets.length === 0 &&
    audit.aspectOk !== false &&
    landscapeOk &&
    tankBoardMinOk &&
    tankScrollOk &&
    tankSquareOk &&
    tankVsSnakeOk &&
    fitOk &&
    viewportOk &&
    noPageScroll &&
    errors.length === 0;

  return {
    game,
    viewport: `${vp.w}x${vp.h}`,
    profile: vp.label,
    touch: vp.touch,
    pass,
    audit,
    fitOk,
    viewportOk,
    tankBoardMinOk: game === 'tank' ? tankBoardMinOk : undefined,
    tankScrollOk: game === 'tank' ? tankScrollOk : undefined,
    tankSquareOk: game === 'tank' ? tankSquareOk : undefined,
    tankVsSnakeOk: game === 'tank' ? tankVsSnakeOk : undefined,
    pageErrors: errors,
    boardPx:
      audit.canvas?.w && audit.canvas?.h
        ? `${Math.round(audit.canvas.w)}×${Math.round(audit.canvas.h)}`
        : null,
    weaponPx: (audit.weaponSamples || [])
      .map((w) => `${Math.round(w.w)}×${Math.round(w.h)}`)
      .join(', '),
  };
}

/**
 * @param {import('puppeteer').Browser} browser
 * @param {ViewportCase} vp
 * @param {number} coarseBoardSide
 */
async function runTankFineTabletCase(browser, vp, coarseBoardSide) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      get: () => 10,
      configurable: true,
    });
  });
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'pointer', value: 'fine' },
      { name: 'hover', value: 'hover' },
    ],
  });
  await page.setViewport({
    width: vp.w,
    height: vp.h,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  await startTankGame(page);
  await page.evaluate(() => {
    if (typeof window.__syncTouchControls === 'function') window.__syncTouchControls();
    if (typeof window.__tankResizeStage === 'function') window.__tankResizeStage();
    window.dispatchEvent(new Event('resize'));
    if (typeof window.__tankResizeStage === 'function') window.__tankResizeStage();
  });
  await new Promise((r) => setTimeout(r, 400));
  const audit = await auditControls(page);
  await page.close();

  const viewportKey = `${vp.w}x${vp.h}`;
  const boardW = audit.canvas?.w ?? 0;
  const boardH = audit.canvas?.h ?? 0;
  const boardSide = Math.min(boardW, boardH);
  const vh = audit.fit?.clientHeight ?? vp.h;
  const vsCoarse =
    coarseBoardSide > 0 ? boardSide >= coarseBoardSide * 0.95 - 2 : true;
  const vsHeight =
    vp.w > vp.h ? boardSide >= vh * 0.85 - 2 : true;
  const tankFineOk = vsCoarse || vsHeight;
  const pass =
    !audit.error &&
    audit.overlaps.length === 0 &&
    (audit.outOfViewport?.length ?? 0) === 0 &&
    !audit.fit?.overflowX &&
    (audit.fit?.scrollSlack ?? 0) <= 2 &&
    Math.abs(boardW - boardH) <= 2 &&
    tankFineOk &&
    errors.length === 0;

  return {
    game: 'tank',
    viewport: viewportKey,
    profile: 'tablet-fine-pointer',
    touch: false,
    pass,
    audit,
    tankFineOk,
    coarseBoardSide,
    boardPx:
      boardW && boardH
        ? `${Math.round(boardW)}×${Math.round(boardH)}`
        : null,
    pageErrors: errors,
  };
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
  });
  const results = [];
  /** @type {Record<string, { w: number, h: number }>} */
  const snakeByViewport = {};
  for (const vp of VIEWPORTS) {
    const snakeResult = await runCase(browser, 'snake', vp);
    results.push(snakeResult);
    const key = `${vp.w}x${vp.h}`;
    if (snakeResult.audit?.canvas) {
      snakeByViewport[key] = {
        w: snakeResult.audit.canvas.w,
        h: snakeResult.audit.canvas.h,
      };
    }
    for (const game of GAMES) {
      if (game === 'snake') continue;
      results.push(
        await runCase(browser, game, vp, snakeByViewport[key] ?? null)
      );
    }
  }

  /** @type {Record<string, number>} */
  const coarseTankSideByViewport = {};
  for (const r of results) {
    if (r.game !== 'tank' || !r.touch) continue;
    if (!TANK_TABLET_VIEWPORTS.includes(r.viewport)) continue;
    const m = r.boardPx?.match(/^(\d+)/);
    if (m) coarseTankSideByViewport[r.viewport] = Number(m[1]);
  }
  for (const vp of TANK_FINE_TABLET_VIEWPORTS) {
    const key = `${vp.w}x${vp.h}`;
    results.push(
      await runTankFineTabletCase(
        browser,
        vp,
        coarseTankSideByViewport[key] ?? 0
      )
    );
  }

  await browser.close();
  const tankLayout = results
    .filter((r) => r.game === 'tank')
    .map((r) => ({
      viewport: r.viewport,
      profile: r.profile,
      pass: r.pass,
      board: r.boardPx,
      weapons: r.weaponPx,
      overflowX: r.audit?.fit?.overflowX,
      clientWidth: r.audit?.fit?.clientWidth,
      outOfViewport: r.audit?.outOfViewport?.length ?? 0,
      tankBoardMinOk: r.tankBoardMinOk,
      scrollSlack: r.audit?.fit?.scrollSlack,
      tankScrollOk: r.tankScrollOk,
      tankSquareOk: r.tankSquareOk,
      tankVsSnakeOk: r.tankVsSnakeOk,
      snakeBoard: snakeByViewport[r.viewport]
        ? `${Math.round(snakeByViewport[r.viewport].w)}×${Math.round(snakeByViewport[r.viewport].h)}`
        : null,
      coarseRefSide: r.coarseBoardSide,
      tankFineOk: r.tankFineOk,
    }));
  console.log(
    JSON.stringify(
      { results, tankLayout, snakeByViewport, coarseTankSideByViewport },
      null,
      2
    )
  );
  if (results.some((r) => !r.pass)) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

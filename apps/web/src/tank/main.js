/**
 * 坦克大战入口：切屏、积分入账、商店与对局
 */
import './tank.css';
import { displayBoundsInZone } from '../arcade/fit-canvas-zone.js';
import {
  initArcadeAudio,
  mountSfxToggle,
  playSfx,
} from '../arcade/arcade-audio.js';
import { LEVELS } from './levels.js';
import {
  createGameState,
  updateGame,
  togglePause,
} from './game-loop.js';
import { drawFrame, computeCanvasSize } from './render.js';
import {
  createInputState,
  bindKeyboard,
  bindDpad,
  bindFireButton,
  bindForwardButton,
} from './input.js';
import { mountWeaponBar, refreshWeaponBar } from './weapon-bar.js';
import { renderTankArmory } from './ui-armory.js';
import { updateBackgroundScroll } from './parallax-control.js';
import {
  addLifetimePoints,
  saveBestScore,
  getWalletSnapshot,
  migrateTankInventory,
} from './storage.js';
import { renderTankShop, refreshWalletDisplays } from './ui-shop.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const screens = {
  menu: document.getElementById('screen-menu'),
  levels: document.getElementById('screen-levels'),
  shop: document.getElementById('screen-shop'),
  armory: document.getElementById('screen-armory'),
  game: document.getElementById('screen-game'),
};

const el = {
  hudLevel: document.getElementById('hud-level'),
  hudScore: document.getElementById('hud-score'),
  hudLives: document.getElementById('hud-lives'),
  hudEnemies: document.getElementById('hud-enemies'),
  weaponBarHost: document.getElementById('weapon-bar-host'),
  armoryList: document.getElementById('armory-list'),
  hint: document.getElementById('level-hint'),
  overlay: document.getElementById('overlay'),
  overlayTitle: document.getElementById('overlay-title'),
  overlayMsg: document.getElementById('overlay-msg'),
  overlayActions: document.getElementById('overlay-actions'),
  levelGrid: document.getElementById('level-grid'),
  btnPause: document.getElementById('btn-pause'),
  btnExit: document.getElementById('btn-exit'),
  shopList: document.getElementById('shop-list'),
  shopBalance: document.getElementById('shop-balance'),
  shopLifetime: document.getElementById('shop-lifetime'),
  shopMsg: document.getElementById('shop-msg'),
  menuBalance: document.getElementById('menu-balance'),
  menuLifetime: document.getElementById('menu-lifetime'),
};

const input = createInputState();
let currentScreen = 'menu';
/** @type {ReturnType<createGameState> | null} */
let game = null;
let lastFrameTime = 0;
let animId = 0;
let pendingLevelIndex = 0;
/** 本局已入账的分数，避免重复加累计积分 */
let sessionScoreBanked = 0;

function showScreen(name) {
  currentScreen = name;
  for (const [key, node] of Object.entries(screens)) {
    if (node) node.hidden = key !== name;
  }
  document.body.classList.toggle('tank-in-game', name === 'game');
}

function gameInputEnabled() {
  return currentScreen === 'game' && game && game.phase === 'playing';
}

function hideOverlay() {
  el.overlay.hidden = true;
}

function showOverlay(title, msg, buttons) {
  el.overlayTitle.textContent = title;
  el.overlayMsg.textContent = msg;
  el.overlayActions.innerHTML = '';
  for (const b of buttons) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = b.primary ? 'btn btn-primary' : 'btn';
    btn.textContent = b.label;
    btn.addEventListener('click', b.onClick);
    el.overlayActions.appendChild(btn);
  }
  el.overlay.hidden = false;
}

function livesText(n) {
  return '♥'.repeat(Math.max(0, n)) || '—';
}

function refreshHud() {
  if (!game) return;
  el.hudLevel.textContent = `第 ${game.levelDef.id} 关`;
  el.hudScore.textContent = String(game.score);
  el.hudLives.textContent = livesText(game.lives);
  if (game.boss && game.boss.hp > 0) {
    el.hudEnemies.textContent = `BOSS ${game.boss.hp}/${game.boss.maxHp}`;
  } else if (game.bossWarningStarted && game.bossWarningTtl > 0) {
    el.hudEnemies.textContent = '⚠️ BOSS';
  } else {
    el.hudEnemies.textContent = String(game.enemies.length);
  }
  el.hint.textContent = game.levelDef.hint;
  refreshItemHud();
}

function refreshItemHud() {
  refreshWeaponBar(el.weaponBarHost);
}

function bankSessionScore() {
  if (!game) return getWalletSnapshot();
  const delta = game.score - sessionScoreBanked;
  if (delta > 0) {
    addLifetimePoints(delta);
    sessionScoreBanked = game.score;
    refreshWalletDisplays(el);
  }
  return getWalletSnapshot();
}

function isTabletViewport() {
  const vp = layoutViewport();
  return Math.min(vp.clientWidth, vp.clientHeight) >= 600;
}

function isCoarsePointerMedia() {
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(hover: none)').matches
  );
}

function isTouchUi() {
  if (isCoarsePointerMedia()) {
    return true;
  }
  return navigator.maxTouchPoints > 0 && isTabletViewport();
}

/** Same tablet layout + sizing as coarse pointer (incl. fine + touch). */
function isLayoutTablet() {
  const vp = layoutViewport();
  if (
    window.matchMedia('(pointer: fine)').matches &&
    window.matchMedia('(hover: hover)').matches &&
    vp.clientWidth >= 960
  ) {
    return false;
  }
  if (isCoarsePointerMedia()) {
    return isTouchUi() && vp.clientWidth >= 481;
  }
  return isTabletViewport() && navigator.maxTouchPoints > 0;
}

function usesCoarseTabletLayoutClass() {
  return (
    isTabletViewport() &&
    navigator.maxTouchPoints > 0 &&
    window.matchMedia('(pointer: fine)').matches
  );
}

function syncTouchControlsVisibility() {
  const show = isTouchUi();
  document.documentElement.classList.toggle('no-touch-controls', !show);
  document.documentElement.classList.toggle(
    'tank-coarse-tablet-layout',
    usesCoarseTabletLayoutClass()
  );
  document.documentElement.classList.toggle('arcade-handheld-layout', isLayoutTablet());
}

if (typeof window !== 'undefined') {
  window.__syncTouchControls = syncTouchControlsVisibility;
  window.__tankResizeStage = () => {
    if (game) resizeStage();
  };
}

function layoutViewport() {
  const root = document.documentElement;
  const vv = window.visualViewport;
  const clientW = root.clientWidth || window.innerWidth;
  const clientH = root.clientHeight || window.innerHeight;
  if (!vv) {
    return { width: clientW, height: clientH, clientWidth: clientW, clientHeight: clientH };
  }
  return {
    width: Math.min(clientW, Math.round(vv.width)),
    height: Math.min(clientH, Math.round(vv.height)),
    clientWidth: clientW,
    clientHeight: clientH,
  };
}

function touchControlMetrics(displayWidth) {
  const coarse = isTouchUi();
  const vpW = layoutViewport().clientWidth;
  const narrow = vpW < 520;
  const tablet = isLayoutTablet();
  let dpadSize = narrow
    ? Math.min(44, Math.max(38, Math.round(displayWidth * 0.1)))
    : Math.min(44, Math.max(38, Math.round(displayWidth * 0.11)));
  let fireSize = narrow
    ? Math.min(52, Math.max(44, Math.round(displayWidth * 0.11)))
    : Math.min(52, Math.max(44, Math.round(displayWidth * 0.13)));
  if (coarse) {
    dpadSize = Math.max(44, dpadSize);
    fireSize = Math.max(44, fireSize);
  }
  if (tablet) {
    dpadSize = 76;
    fireSize = 80;
  }
  return { dpadSize, fireSize, tablet, dpadGap: tablet ? '14px' : '3px' };
}

function isTouchTablet() {
  return isLayoutTablet();
}

function gameChromeHeight() {
  const tablet = isLayoutTablet();
  let h = 0;
  if (!tablet) {
    for (const sel of ['.tank-header', '.hud-armory', '.screen-game .hint']) {
      const node = document.querySelector(sel);
      if (!node || node.closest('[hidden]')) continue;
      const r = node.getBoundingClientRect();
      if (r.height > 0) h += r.height;
    }
  }
  const weaponBar = document.querySelector('.screen-game .weapon-bar-host');
  if (weaponBar && !weaponBar.closest('[hidden]')) {
    const wr = weaponBar.getBoundingClientRect();
    if (wr.height > 0) h += wr.height + 8;
  }
  const hud = document.querySelector('.screen-game .hud-bar');
  if (hud && !hud.closest('[hidden]')) {
    const r = hud.getBoundingClientRect();
    if (r.height > 0) h += r.height;
  }
  const toolbar = document.querySelector('.screen-game .toolbar');
  if (toolbar && !toolbar.closest('[hidden]')) {
    const tr = toolbar.getBoundingClientRect();
    if (tr.height > 0) h += tr.height + (tablet ? 4 : 8);
  }
  const page = document.querySelector('.tank-page');
  if (page) {
    const ps = getComputedStyle(page);
    h +=
      (parseFloat(ps.paddingTop) || 0) + (parseFloat(ps.paddingBottom) || 0);
  }
  return h + (tablet ? 4 : 8);
}

function isLandscapeTouchTablet() {
  return (
    isLayoutTablet() &&
    window.matchMedia('(orientation: landscape) and (min-width: 700px)').matches
  );
}

function measureStageSideWidths(stage) {
  if (!stage) return { leftW: 0, rightW: 0 };
  const left = stage.querySelector('.touch-rail-left');
  const right = stage.querySelector('.touch-side-right, .touch-rail-right');
  const leftStyle = left ? getComputedStyle(left) : null;
  const rightStyle = right ? getComputedStyle(right) : null;
  if (
    leftStyle?.display === 'none' ||
    leftStyle?.display === 'contents' ||
    rightStyle?.display === 'contents'
  ) {
    const weapons = stage.querySelector('.weapon-bar-host');
    const actions = stage.querySelector('.touch-right-col, .touch-left-col');
    const lw = left?.getBoundingClientRect().width ?? 0;
    const rw = Math.max(
      right?.getBoundingClientRect().width ?? 0,
      weapons?.getBoundingClientRect().width ?? 0,
      actions?.getBoundingClientRect().width ?? 0
    );
    return { leftW: lw, rightW: rw };
  }
  return {
    leftW: left?.getBoundingClientRect().width ?? 0,
    rightW: right?.getBoundingClientRect().width ?? 0,
  };
}

function shouldAllowCanvasUpscale() {
  if (isTouchTablet()) return true;
  if (!isTouchUi()) return true;
  return layoutViewport().clientWidth >= 520;
}

function applyCanvasDisplaySize(
  canvasEl,
  intrinsicW,
  intrinsicH,
  maxW,
  maxH,
  { minDisplayH = 0, minDisplaySide = 0, allowUpscale = false } = {}
) {
  let scale = Math.min(maxW / intrinsicW, maxH / intrinsicH);
  if (!allowUpscale) scale = Math.min(1, scale);
  const minSide = Math.max(minDisplayH, minDisplaySide);
  if (minSide > 0 && allowUpscale) {
    const need = minSide / intrinsicH;
    scale = Math.max(scale, need);
    scale = Math.min(scale, maxW / intrinsicW, maxH / intrinsicH);
  }
  const dw = Math.max(1, Math.round(intrinsicW * scale));
  const dh = Math.max(1, Math.round(intrinsicH * scale));
  canvasEl.style.width = `${dw}px`;
  canvasEl.style.height = `${dh}px`;
  return { dw, dh, scale };
}

function canvasRenderDpr() {
  const dpr = window.devicePixelRatio || 1;
  if (layoutViewport().clientWidth < 520) return Math.min(dpr, 3);
  return Math.min(dpr, 2);
}

function applyCanvasBackingStore(logicalW, logicalH, displayScale) {
  const renderDpr = canvasRenderDpr();
  const backingScale = displayScale * renderDpr;
  canvas.width = Math.max(1, Math.round(logicalW * backingScale));
  canvas.height = Math.max(1, Math.round(logicalH * backingScale));
  game.displayScale = displayScale;
  game.renderDpr = renderDpr;
}

function measureTankPlayZone() {
  const playZone = document.querySelector('.screen-game .canvas-play-zone');
  const stage = canvas.closest('.canvas-stage');
  const box = playZone || stage;
  if (!box) return null;
  void box.offsetHeight;
  const base = box.getBoundingClientRect();
  const handheldSide =
    document.documentElement.classList.contains('arcade-handheld-layout') &&
    isLayoutTablet();
  if (handheldSide && stage) {
    const { leftW, rightW } = measureStageSideWidths(stage);
    return {
      width: Math.max(64, base.width - leftW - rightW - 12),
      height: Math.max(64, base.height - 4),
    };
  }
  return { width: base.width, height: base.height };
}

function fitSquareCanvasDisplay(logicalW, logicalH, sized, capSide = 0) {
  void canvas.offsetWidth;
  let side = Math.min(sized.dw, sized.dh);
  if (capSide > 0) side = Math.min(side, capSide);
  const handheld = isTouchTablet() && document.documentElement.classList.contains('arcade-handheld-layout');
  const desktopFit =
    !isTouchUi() &&
    !document.documentElement.classList.contains('arcade-handheld-layout');
  if (
    !handheld &&
    !desktopFit &&
    (!isLandscapeTouchTablet() || !isTouchTablet())
  ) {
    const boardWrap = canvas.closest('.canvas-board-wrap');
    const capW = boardWrap?.clientWidth ?? sized.dw;
    if (capW > 0) side = Math.min(side, capW);
  }
  side = Math.max(1, Math.round(side));
  if (side === sized.dw && side === sized.dh) return sized;
  canvas.style.width = `${side}px`;
  canvas.style.height = `${side}px`;
  const scale = side / logicalW;
  return { dw: side, dh: side, scale };
}

function resizeStage() {
  if (!game) return;
  const { width, height } = computeCanvasSize(game.map);
  const stage = canvas.closest('.canvas-stage');
  let allowUpscale = shouldAllowCanvasUpscale();

  if (stage) {
    const { dpadSize, fireSize, dpadGap } = touchControlMetrics(width);
    stage.style.setProperty('--dpad-size', `${dpadSize}px`);
    stage.style.setProperty('--dpad-gap', dpadGap);
    stage.style.setProperty('--fire-btn-size', `${fireSize}px`);
  }

  refreshWeaponBar(el.weaponBarHost);
  canvas.style.width = '1px';
  canvas.style.height = '1px';
  void (stage?.offsetWidth ?? canvas.offsetWidth);

  const zone = measureTankPlayZone();
  let budgetW = 320;
  let budgetH = 320;
  let minDisplaySide = 0;

  if (zone && zone.width >= 16 && zone.height >= 16) {
    const bounds = displayBoundsInZone(zone, width, height, { square: true });
    budgetW = bounds.maxW;
    budgetH = bounds.maxH;
    minDisplaySide = Math.floor(Math.min(budgetW, budgetH));
    allowUpscale = true;
  } else {
    const vp = layoutViewport();
    budgetW = Math.min(vp.clientWidth - 32, 720);
    budgetH = Math.max(280, vp.clientHeight - gameChromeHeight());
    allowUpscale = shouldAllowCanvasUpscale();
  }

  let sized = applyCanvasDisplaySize(canvas, width, height, budgetW, budgetH, {
    allowUpscale,
    minDisplaySide,
    minDisplayH: 0,
  });
  sized = fitSquareCanvasDisplay(width, height, sized, 0);
  applyCanvasBackingStore(width, height, sized.scale);
  canvas.dataset.displayW = String(sized.dw);
  canvas.dataset.displayH = String(sized.dh);
}

function startLevel(levelIndex) {
  pendingLevelIndex = levelIndex;
  game = createGameState(levelIndex);
  sessionScoreBanked = 0;
  hideOverlay();
  syncTouchControlsVisibility();
  showScreen('game');
  refreshHud();
  resizeStage();
  requestAnimationFrame(() => resizeStage());
  el.btnPause.textContent = '暂停';
  lastFrameTime = performance.now();
  if (!animId) animId = requestAnimationFrame(loop);
}

function exitToMenu() {
  bankSessionScore();
  if (game) saveBestScore(game.score);
  game = null;
  hideOverlay();
  refreshWalletDisplays(el);
  showScreen('menu');
}

function onWin() {
  playSfx('win');
  bankSessionScore();
  saveBestScore(game.score);
  const bossLine = game.lastBossBonus
    ? `\n击败 BOSS 奖励 +${game.lastBossBonus}！`
    : '';
  showOverlay(
    '🎉 关卡完成！',
    `得分 ${game.score} 已计入累计积分。${bossLine}\n可用积分能去商店买道具哦！`,
    [
      {
        label: '再玩本关',
        primary: true,
        onClick: () => startLevel(game.levelIndex),
      },
      {
        label: '回主菜单',
        onClick: () => exitToMenu(),
      },
    ]
  );
}

function onLose() {
  playSfx('lose');
  bankSessionScore();
  saveBestScore(game.score);
  showOverlay(
    '游戏结束',
    `生命用完了，本局 ${game.score} 分已入账。`,
    [
      {
        label: '重新开始',
        primary: true,
        onClick: () => startLevel(game.levelIndex),
      },
      {
        label: '回主菜单',
        onClick: () => exitToMenu(),
      },
    ]
  );
}

function loop(now) {
  animId = requestAnimationFrame(loop);
  if (currentScreen !== 'game' || !game) return;

  const delta = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  if (game.phase === 'playing' && !game.paused) {
    updateBackgroundScroll(game, delta, input);
  }
  updateGame(game, delta, input);
  refreshHud();

  if (game.phase === 'win') {
    game.phase = 'done';
    onWin();
  } else if (game.phase === 'lose') {
    game.phase = 'done';
    onLose();
  }

  drawFrame(ctx, game);
}

function renderLevelGrid() {
  el.levelGrid.innerHTML = LEVELS.map(
    (lv, i) => `
    <button type="button" class="level-card" data-level="${i}">
      <span class="level-card-num">第 ${lv.id} 关</span>
      <span class="level-card-name">${lv.name}</span>
    </button>`
  ).join('');
  el.levelGrid.querySelectorAll('[data-level]').forEach((btn) => {
    btn.addEventListener('click', () => {
      startLevel(Number(btn.getAttribute('data-level')));
    });
  });
}

function openArmory() {
  renderTankArmory({ armoryList: el.armoryList });
  showScreen('armory');
}

function openShop() {
  el.shopMsg.textContent = '';
  refreshWalletDisplays(el);
  renderTankShop({
    shopList: el.shopList,
    shopMsg: el.shopMsg,
    onRefresh: () => refreshWalletDisplays(el),
  });
  showScreen('shop');
}

function bindUi() {
  document.getElementById('btn-menu-play')?.addEventListener('click', () => {
    startLevel(pendingLevelIndex);
  });
  document.getElementById('btn-menu-levels')?.addEventListener('click', () => {
    renderLevelGrid();
    showScreen('levels');
  });
  document.getElementById('btn-menu-items')?.addEventListener('click', openShop);
  document.getElementById('btn-menu-armory')?.addEventListener('click', openArmory);
  document.getElementById('btn-armory-back')?.addEventListener('click', () => {
    showScreen('menu');
  });
  document.getElementById('btn-shop-back')?.addEventListener('click', () => {
    refreshWalletDisplays(el);
    showScreen('menu');
  });
  document.getElementById('btn-levels-back')?.addEventListener('click', () => {
    showScreen('menu');
  });

  el.btnPause.addEventListener('click', () => {
    if (!game) return;
    togglePause(game);
    el.btnPause.textContent = game.paused ? '继续' : '暂停';
  });

  el.btnExit.addEventListener('click', () => {
    exitToMenu();
  });

  bindKeyboard(input, gameInputEnabled);
  bindDpad(document.querySelector('.dpad-overlay'), input, gameInputEnabled);
  bindFireButton(document.getElementById('btn-fire'), input, gameInputEnabled);
  mountWeaponBar(el.weaponBarHost, () => game, refreshItemHud);
  bindForwardButton(
    document.getElementById('btn-forward'),
    input,
    gameInputEnabled
  );

  window.addEventListener('resize', () => {
    if (game) resizeStage();
  });
  window.addEventListener('orientationchange', () => {
    syncTouchControlsVisibility();
    if (game) requestAnimationFrame(() => resizeStage());
  });
  window.visualViewport?.addEventListener('resize', () => {
    if (game) resizeStage();
  });
}

function init() {
  migrateTankInventory();
  syncTouchControlsVisibility();
  refreshWalletDisplays(el);
  bindUi();
  showScreen('menu');
  window.addEventListener('resize', syncTouchControlsVisibility);
}

initArcadeAudio();
mountSfxToggle();
init();

/**
 * 坦克大战入口：切屏、积分入账、商店与对局
 */
import './tank.css';
import { LEVELS } from './levels.js';
import {
  createGameState,
  updateGame,
  togglePause,
  getMissileCount,
} from './game-loop.js';
import { drawFrame, computeCanvasSize } from './render.js';
import {
  createInputState,
  bindKeyboard,
  bindDpad,
  bindFireButton,
  bindMissileButton,
  bindForwardButton,
} from './input.js';
import { updateBackgroundScroll } from './parallax-control.js';
import {
  addLifetimePoints,
  saveBestScore,
  getWalletSnapshot,
} from './storage.js';
import { renderTankShop, refreshWalletDisplays } from './ui-shop.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const screens = {
  menu: document.getElementById('screen-menu'),
  levels: document.getElementById('screen-levels'),
  shop: document.getElementById('screen-shop'),
  game: document.getElementById('screen-game'),
};

const el = {
  hudLevel: document.getElementById('hud-level'),
  hudScore: document.getElementById('hud-score'),
  hudLives: document.getElementById('hud-lives'),
  hudEnemies: document.getElementById('hud-enemies'),
  hudMissiles: document.getElementById('hud-missiles'),
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
  el.hudEnemies.textContent = String(game.enemies.length);
  if (el.hudMissiles) {
    el.hudMissiles.textContent = String(getMissileCount());
  }
  el.hint.textContent = game.levelDef.hint;
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

function resizeStage() {
  if (!game) return;
  const { width, height } = computeCanvasSize(game.map);
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const stage = canvas.closest('.canvas-stage');
  if (stage) {
    const narrow = window.innerWidth < 520;
    const dpadSize = narrow
      ? Math.min(36, Math.max(32, Math.round(width * 0.1)))
      : Math.min(44, Math.max(38, Math.round(width * 0.11)));
    stage.style.setProperty('--dpad-size', `${dpadSize}px`);
    const fireSize = narrow
      ? Math.min(42, Math.max(38, Math.round(width * 0.11)))
      : Math.min(52, Math.max(44, Math.round(width * 0.13)));
    stage.style.setProperty('--fire-btn-size', `${fireSize}px`);
  }
}

function startLevel(levelIndex) {
  pendingLevelIndex = levelIndex;
  game = createGameState(levelIndex);
  sessionScoreBanked = 0;
  hideOverlay();
  showScreen('game');
  refreshHud();
  resizeStage();
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
  bankSessionScore();
  saveBestScore(game.score);
  showOverlay(
    '🎉 关卡完成！',
    `得分 ${game.score} 已计入累计积分，可用积分能去商店买导弹哦！`,
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
  bindMissileButton(
    document.getElementById('btn-missile'),
    input,
    gameInputEnabled
  );
  bindForwardButton(
    document.getElementById('btn-forward'),
    input,
    gameInputEnabled
  );

  window.addEventListener('resize', () => {
    if (game) resizeStage();
  });
}

function init() {
  refreshWalletDisplays(el);
  bindUi();
  showScreen('menu');
}

init();

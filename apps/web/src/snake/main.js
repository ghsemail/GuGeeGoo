/**
 * 贪吃蛇：多屏 UI、对局、武器与存档
 */
import './snake.css';
import {
  createLevelState,
  tick,
  setDirectionFromKey,
  setDirection,
  advanceToNextLevel,
  getLevel,
  TOTAL_LEVELS,
  getMoverCells,
  getEffectiveSpeedMs,
  initWeaponRuntime,
  tryFireWeapon,
  isMoverFrozen,
} from './game.js';
import {
  getNickname,
  setNickname,
  getLocalBestScore,
  getLocalMaxLevel,
  getLifetimeEarned,
  getSpendableBalance,
  getEquippedCosmeticIds,
  consumeInventoryItem,
  clearLoadout,
  getLoadoutIds,
  addLifetimePoints,
  loadRemoteProgress,
  persistProgress,
  persistWallet,
  fetchLeaderboard,
  DEFAULT_NICK,
  MAX_NICK_LEN,
  getWalletSnapshot,
  getEquippedWeaponId,
  getLastSelectedLevelIndex,
  setLastSelectedLevelIndex,
} from './storage.js';
import { drawSnake } from './draw-snake.js';
import {
  applyEquippedCosmetics,
  applyConsumableEffect,
  effectIcons,
  toastForConsumable,
} from './item-effects.js';
import { getWeapon } from './weapons.js';
import { drawPicnicBoard, cellGroundColor } from './draw-board.js';
import { drawWeaponEffects } from './game-combat.js';
import { ensureStarterWeapon } from './weapon-shop.js';
import { recordLevelResult } from './level-progress.js';
import {
  escapeHtml,
  renderLevelGrid,
  renderItemShopList,
  renderWeaponShopList,
} from './ui-screens.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const screens = {
  menu: document.getElementById('screen-menu'),
  levels: document.getElementById('screen-levels'),
  shop: document.getElementById('screen-shop'),
  weapons: document.getElementById('screen-weapons'),
  game: document.getElementById('screen-game'),
};

const el = {
  level: document.getElementById('stat-level'),
  food: document.getElementById('stat-food'),
  score: document.getElementById('stat-score'),
  ammo: document.getElementById('stat-ammo'),
  lifetime: document.getElementById('stat-lifetime'),
  balance: document.getElementById('stat-balance'),
  best: document.getElementById('stat-best'),
  hint: document.getElementById('level-hint'),
  weaponHint: document.getElementById('equipped-weapon-hint'),
  overlay: document.getElementById('overlay'),
  overlayTitle: document.getElementById('overlay-title'),
  overlayMsg: document.getElementById('overlay-msg'),
  overlayActions: document.getElementById('overlay-actions'),
  nickInput: document.getElementById('nick-input'),
  leaderboard: document.getElementById('leaderboard-list'),
  btnPause: document.getElementById('btn-pause'),
  btnRestart: document.getElementById('btn-restart'),
  btnExitGame: document.getElementById('btn-exit-game'),
  btnFire: document.getElementById('btn-fire'),
  shopList: document.getElementById('shop-list'),
  shopBalance: document.getElementById('shop-balance'),
  shopLifetime: document.getElementById('shop-lifetime'),
  shopMsg: document.getElementById('shop-msg'),
  weaponList: document.getElementById('weapon-list'),
  weaponShopBalance: document.getElementById('weapon-shop-balance'),
  weaponMsg: document.getElementById('weapon-msg'),
  levelGrid: document.getElementById('level-grid'),
  effectBar: document.getElementById('effect-bar'),
  gameToast: document.getElementById('game-toast'),
};

let state = wrapNewLevel(0);
let toastTimer = 0;
let sessionScoreBanked = 0;
let lastTick = 0;
let animId = 0;
let touchStart = null;
/** 当前是否在「对局」屏且允许 tick */
let gameSessionActive = false;
let currentScreen = 'menu';

function showScreen(name) {
  currentScreen = name;
  for (const [key, node] of Object.entries(screens)) {
    if (node) node.hidden = key !== name;
  }
}

function showGameToast(message) {
  if (!el.gameToast) return;
  el.gameToast.textContent = message;
  el.gameToast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.gameToast.hidden = true;
  }, 2200);
}

function refreshEffectBar(forState = state) {
  if (!el.effectBar || !forState) return;
  const icons = effectIcons(forState);
  el.effectBar.textContent = icons.length ? icons.join(' ') : '';
  el.effectBar.hidden = icons.length === 0;
}

async function applyLoadoutForLevel(gameState) {
  const ids = [...getLoadoutIds()];
  clearLoadout();
  for (const id of ids) {
    if (consumeInventoryItem(id)) {
      applyConsumableEffect(gameState, id);
      showGameToast(toastForConsumable(id));
    }
  }
  applyEquippedCosmetics(gameState, getEquippedCosmeticIds());
  refreshEffectBar();
  await persistWallet();
  return gameState;
}

function wrapNewLevel(levelIndex) {
  const base = createLevelState(levelIndex);
  applyEquippedCosmetics(base, getEquippedCosmeticIds());
  refreshEffectBar(base);
  return base;
}

function refreshWalletUI() {
  el.lifetime.textContent = String(getLifetimeEarned());
  el.balance.textContent = String(getSpendableBalance());
  el.best.textContent = String(getLocalBestScore());
  if (el.shopBalance) {
    el.shopBalance.textContent = String(getSpendableBalance());
  }
  if (el.shopLifetime) {
    el.shopLifetime.textContent = String(getLifetimeEarned());
  }
  if (el.weaponShopBalance) {
    el.weaponShopBalance.textContent = String(getSpendableBalance());
  }
}

function refreshAmmoUI() {
  const wr = state.weaponRuntime;
  if (!el.ammo) return;
  if (!wr) {
    el.ammo.textContent = '—';
    return;
  }
  el.ammo.textContent = String(wr.ammo);
  if (el.btnFire) {
    const ready = wr.ammo > 0 && wr.cooldown <= 0;
    el.btnFire.disabled = !ready;
    el.btnFire.classList.toggle('fire-ready', ready);
  }
}

function refreshWeaponHint() {
  if (!el.weaponHint) return;
  const w = getWeapon(getEquippedWeaponId());
  el.weaponHint.textContent = `当前武器：${w.emoji} ${w.name}（J / F 或点「发射」）`;
}

function refreshStats() {
  const lv = getLevel(state.levelIndex);
  el.level.textContent = `第 ${lv.id} 关 · ${lv.name}`;
  el.food.textContent = `${state.foodEaten} / ${lv.targetFood}`;
  el.score.textContent = String(state.score);
  el.hint.textContent = lv.hint;
  refreshWalletUI();
  refreshAmmoUI();
  refreshWeaponHint();
}

/** 触控 / 平板布局（勿把 iPad 当成桌面：iPadOS 常报告 pointer:fine + hover:hover） */
function isTouchUi() {
  if (window.matchMedia('(pointer: coarse)').matches) return true;
  if (window.matchMedia('(hover: none)').matches) return true;
  if (navigator.maxTouchPoints > 0 && window.innerWidth <= 1024) return true;
  if (window.matchMedia('(pointer: fine) and (hover: hover)').matches) return false;
  return false;
}

function isHandheldTabletLayout() {
  return isTouchUi() && window.innerWidth >= 481;
}

function syncTouchControlsVisibility() {
  document.documentElement.classList.toggle('no-touch-controls', !isTouchUi());
  document.documentElement.classList.toggle(
    'arcade-handheld-layout',
    isHandheldTabletLayout()
  );
}

if (typeof window !== 'undefined') {
  window.__syncTouchControls = syncTouchControlsVisibility;
}

/** Extra vertical reserve when tablet portrait layout overflows (cleared each resize). */
let snakeLayoutPadExtra = 0;

function measureSnakeStageBelowBoard() {
  const stage = document.querySelector('.screen-game .canvas-stage');
  const canvasEl = document.getElementById('game-canvas');
  if (!stage || !canvasEl) return 0;
  const prevW = canvasEl.style.width;
  const prevH = canvasEl.style.height;
  canvasEl.style.width = '1px';
  canvasEl.style.height = '1px';
  void stage.offsetWidth;
  const below =
    stage.getBoundingClientRect().height - canvasEl.getBoundingClientRect().height;
  canvasEl.style.width = prevW;
  canvasEl.style.height = prevH;
  return Math.max(0, below);
}

function playfieldLayout() {
  const coarse = isTouchUi();
  const handheldSide = isHandheldTabletLayout();
  const landscapeSide =
    handheldSide &&
    window.matchMedia('(orientation: landscape) and (min-width: 700px)').matches;
  const tablet = handheldSide;
  let padW = 32;
  let padH = 320;
  let railW = 0;
  if (handheldSide) {
    const screen = document.querySelector('#screen-game:not([hidden])');
    const stage = screen?.querySelector('.canvas-stage');
    const wrap = screen?.querySelector('.canvas-wrap');
    const toolbar = screen?.querySelector('.toolbar-game');
    const top = wrap?.getBoundingClientRect().top ?? 0;
    const toolbarH = toolbar
      ? toolbar.getBoundingClientRect().height + 8
      : 44;
    padH = Math.ceil(top + toolbarH + 12) + snakeLayoutPadExtra;
    if (stage) {
      const leftW =
        stage.querySelector('.touch-rail-left')?.getBoundingClientRect().width ?? 0;
      const rightW =
        stage.querySelector('.touch-rail-right')?.getBoundingClientRect().width ?? 0;
      railW = leftW + rightW + 28;
    } else {
      railW = 320;
    }
    padW = railW + 24;
  }
  const availW = window.innerWidth - padW;
  const availH = window.innerHeight - padH;
  let maxW = handheldSide ? availW : Math.min(availW, 520);
  if (handheldSide) {
    const stage = document.querySelector('#screen-game:not([hidden]) .canvas-stage');
    if (stage?.clientWidth > 0 && railW > 0) {
      maxW = Math.max(120, stage.clientWidth - railW);
    }
  }
  const maxH = handheldSide ? availH : Math.min(availH, 420);
  const minDisplayH = landscapeSide
    ? Math.floor(window.innerHeight * 0.6)
    : handheldSide
      ? Math.floor(window.innerHeight * 0.48)
      : 0;
  return {
    maxW,
    maxH,
    minDisplayH,
    coarse,
    landscapeSide,
    tablet,
    handheldSide,
  };
}

/** 等比缩放 canvas 显示尺寸，避免 CSS 只压宽度 */
function applyCanvasDisplaySize(canvasEl, intrinsicW, intrinsicH, maxW, maxH) {
  const scale = Math.min(maxW / intrinsicW, maxH / intrinsicH);
  const dw = Math.max(1, Math.round(intrinsicW * scale));
  const dh = Math.max(1, Math.round(intrinsicH * scale));
  canvasEl.style.width = `${dw}px`;
  canvasEl.style.height = `${dh}px`;
  return { dw, dh, scale };
}

function cellSize() {
  const lv = state.level;
  const { maxW, maxH, minDisplayH, landscapeSide, tablet } = playfieldLayout();
  const csCap = landscapeSide ? 96 : tablet ? 96 : 28;
  let cs = Math.floor(Math.min(maxW / lv.cols, maxH / lv.rows, csCap));
  if (minDisplayH > 0) {
    const csForMin = Math.floor(minDisplayH / lv.rows);
    cs = Math.max(cs, Math.min(csForMin, csCap));
  }
  cs = Math.min(cs, Math.floor(maxW / lv.cols), Math.floor(maxH / lv.rows));
  return Math.max(cs, 12);
}

function applyBoardSizeFromCellSize(cs) {
  const lv = state.level;
  const w = lv.cols * cs;
  const h = lv.rows * cs;
  canvas.width = w;
  canvas.height = h;
  const { maxW, maxH } = playfieldLayout();
  applyCanvasDisplaySize(canvas, w, h, maxW, maxH);
}

function resizeCanvas() {
  const { tablet, landscapeSide, handheldSide } = playfieldLayout();
  if (handheldSide) {
    snakeLayoutPadExtra = 0;
    for (let attempt = 0; attempt < 6; attempt++) {
      applyBoardSizeFromCellSize(cellSize());
      const vh = document.documentElement.clientHeight;
      const scrollSlack = document.documentElement.scrollHeight - vh;
      if (scrollSlack <= 2) break;
      snakeLayoutPadExtra += Math.ceil(scrollSlack) + 2;
    }
  } else {
    snakeLayoutPadExtra = 0;
    for (let attempt = 0; attempt < 8; attempt++) {
      const cs = cellSize();
      applyBoardSizeFromCellSize(cs);
      if (!tablet || landscapeSide) break;
      const vh = document.documentElement.clientHeight;
      const scrollSlack = document.documentElement.scrollHeight - vh;
      if (scrollSlack <= 2) break;
      snakeLayoutPadExtra += Math.ceil(scrollSlack) + 2;
    }
  }

  const stage = canvas.closest('.canvas-stage');
  if (stage) {
    const { coarse, landscapeSide } = playfieldLayout();
    const tablet = isHandheldTabletLayout();
    const boardW = canvas.getBoundingClientRect().width;
    let dpadSize = Math.min(44, Math.max(38, Math.round(boardW * 0.11)));
    let fireSize = Math.min(52, Math.max(44, Math.round(boardW * 0.13)));
    if (coarse) {
      dpadSize = Math.max(44, dpadSize);
      fireSize = Math.max(44, fireSize);
    }
    if (tablet) {
      dpadSize = 76;
      fireSize = 80;
    }
    stage.style.setProperty('--dpad-size', `${dpadSize}px`);
    stage.style.setProperty('--dpad-gap', tablet ? '14px' : '3px');
    stage.style.setProperty('--fire-btn-size', `${fireSize}px`);
  }

  if (handheldSide) {
    applyBoardSizeFromCellSize(cellSize());
  }

  draw();
}

function drawCell(x, y, color, radius = 0.15) {
  const cs = cellSize();
  const pad = cs * 0.06;
  const w = cs - pad * 2;
  const r = w * radius;
  const px = x * cs + pad;
  const py = y * cs + pad;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(px, py, w, w, r);
  ctx.fill();
}

function drawApple(x, y) {
  const cs = cellSize();
  const c = cellCenter(x, y, cs);
  const r = cs * 0.32;
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2ecc71';
  ctx.beginPath();
  ctx.ellipse(c.x + r * 0.2, c.y - r * 0.7, r * 0.35, r * 0.2, 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function cellCenter(x, y, cs) {
  return { x: (x + 0.5) * cs, y: (y + 0.5) * cs };
}

function drawProjectiles() {
  const cs = cellSize();
  for (const p of state.projectiles || []) {
    const c = cellCenter(p.x, p.y, cs);
    ctx.fillStyle = p.kind === 'pierce_line' ? '#ff6b6b' : '#74b9ff';
    ctx.beginPath();
    ctx.arc(c.x, c.y, cs * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
}

function draw() {
  if (currentScreen !== 'game') return;
  const lv = state.level;
  const cs = cellSize();
  drawPicnicBoard(ctx, canvas.width, canvas.height, lv.cols, lv.rows, cs);

  for (let y = 0; y < lv.rows; y++) {
    for (let x = 0; x < lv.cols; x++) {
      drawCell(x, y, cellGroundColor(x, y), 0.08);
    }
  }

  for (const [ox, oy] of lv.obstacles) {
    drawCell(ox, oy, '#5D4037', 0.2);
  }

  lv.movers.forEach((m, i) => {
    const idx = state.moverStates[i].pathIndex;
    const [x, y] = m.path[idx];
    const frozen = isMoverFrozen(state, i);
    drawCell(x, y, frozen ? '#4FC3F7' : '#FB8C00', 0.28);
  });

  drawApple(state.food.x, state.food.y);
  drawProjectiles();
  drawWeaponEffects(ctx, state, cs);
  drawSnake(ctx, state.snake, state.direction, cs, state.effects);
  refreshEffectBar();
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

async function renderLeaderboard() {
  const entries = await fetchLeaderboard();
  if (!entries.length) {
    el.leaderboard.innerHTML =
      '<li class="muted">暂无云端排行（本地照常可玩）</li>';
    return;
  }
  el.leaderboard.innerHTML = entries
    .slice(0, 10)
    .map(
      (e, i) =>
        `<li><span class="rank">${i + 1}</span> ${escapeHtml(e.nickname)} · <strong>${e.bestScore}</strong> 分</li>`
    )
    .join('');
}

function bankSessionScore() {
  const delta = state.score - sessionScoreBanked;
  if (delta <= 0) return getWalletSnapshot();
  addLifetimePoints(delta);
  sessionScoreBanked = state.score;
  refreshWalletUI();
  return getWalletSnapshot();
}

async function saveProgressIfNeeded() {
  const wallet = bankSessionScore();
  const levelUnlocked = state.allComplete
    ? TOTAL_LEVELS
    : state.levelComplete
      ? state.levelIndex + 2
      : state.levelIndex + 1;
  await persistProgress({
    score: state.score,
    levelUnlocked: Math.min(levelUnlocked, TOTAL_LEVELS),
    nickname: getNickname(),
    wallet,
  });
  refreshStats();
  renderLeaderboard();
}

function resetSession(levelIndex, carryScore = 0) {
  state = wrapNewLevel(levelIndex);
  state.score = carryScore;
  sessionScoreBanked = carryScore > 0 ? carryScore : 0;
  const weaponId = getEquippedWeaponId();
  initWeaponRuntime(state, weaponId);
}

async function startLevel(levelIndex, carryScore = 0) {
  setLastSelectedLevelIndex(levelIndex);
  resetSession(levelIndex, carryScore);
  await applyLoadoutForLevel(state);
  gameSessionActive = true;
  state.paused = false;
  el.btnPause.textContent = '暂停';
  hideOverlay();
  showScreen('game');
  refreshStats();
  resizeCanvas();
  lastTick = performance.now();
  if (!animId) animId = requestAnimationFrame(loop);
}

function exitToMenu() {
  if (gameSessionActive) {
    bankSessionScore();
    persistProgress({
      score: state.score,
      levelUnlocked: Math.max(getLocalMaxLevel(), state.levelIndex + 1),
      nickname: getNickname(),
      wallet: getWalletSnapshot(),
    }).then(() => renderLeaderboard());
  }
  gameSessionActive = false;
  hideOverlay();
  showScreen('menu');
  refreshWalletUI();
}

function fireWeapon() {
  if (!gameSessionActive || state.gameOver || state.levelComplete) return;
  const r = tryFireWeapon(state);
  if (r.ok) {
    const kind = state.weaponRuntime?.kind;
    if (kind === 'air_strike') showGameToast('✈️ 飞机出动！');
    else if (kind === 'tank_buddy') showGameToast('🚜 小坦克来帮忙！');
    else showGameToast('砰！');
    refreshAmmoUI();
  } else if (r.reason === 'busy') {
    showGameToast('小坦克还在呢～');
  } else if (state.weaponRuntime?.ammo <= 0) {
    showGameToast('弹药用完啦');
  }
}

function loop(now) {
  animId = requestAnimationFrame(loop);
  if (
    gameSessionActive &&
    currentScreen === 'game' &&
    !state.paused &&
    !state.gameOver &&
    !state.levelComplete
  ) {
    const delay = getEffectiveSpeedMs(state);
    if (now - lastTick >= delay) {
      lastTick = now;
      const result = tick(state, now);
      refreshStats();
      if (result.shieldUsed) {
        showGameToast('🫧 护盾生效！');
        refreshEffectBar();
      }
      if (state.gameOver) {
        onGameOver();
      } else if (state.levelComplete) {
        onLevelComplete();
      }
    }
  }
  if (currentScreen === 'game') draw();
}

function onGameOver() {
  recordLevelResult(getLevel(state.levelIndex).id, {
    cleared: false,
    score: state.score,
  });
  saveProgressIfNeeded();
  showOverlay('哎呀，撞到了！', `本局得分 ${state.score} 分，已加入累计积分。`, [
    {
      label: '重新开始本关',
      primary: true,
      onClick: () => {
        startLevel(state.levelIndex, 0);
      },
    },
    {
      label: '选关',
      onClick: () => {
        gameSessionActive = false;
        hideOverlay();
        openLevelsScreen();
      },
    },
    {
      label: '回主菜单',
      onClick: () => exitToMenu(),
    },
  ]);
}

function onLevelComplete() {
  const lvId = getLevel(state.levelIndex).id;
  recordLevelResult(lvId, { cleared: true, score: state.score });
  saveProgressIfNeeded();

  if (state.allComplete) {
    showOverlay(
      '🎉 全部通关！',
      `太厉害了，景源！你完成了全部 ${TOTAL_LEVELS} 关，本局 ${state.score} 分已计入累计积分！`,
      [
        {
          label: '再玩一遍',
          primary: true,
          onClick: () => startLevel(0, 0),
        },
        {
          label: '选关',
          onClick: () => {
            gameSessionActive = false;
            hideOverlay();
            openLevelsScreen();
          },
        },
        {
          label: '回主菜单',
          onClick: () => exitToMenu(),
        },
      ]
    );
    return;
  }

  const nextIdx = state.levelIndex + 1;
  const nextLv = getLevel(nextIdx);
  showOverlay(
    '关卡完成！',
    `第 ${state.level.id} 关过关！本段得分已入账。下一关：${nextLv.name}。`,
    [
      {
        label: '进入下一关',
        primary: true,
        onClick: async () => {
          hideOverlay();
          state = advanceToNextLevel(state);
          initWeaponRuntime(state, getEquippedWeaponId());
          await applyLoadoutForLevel(state);
          sessionScoreBanked = state.score;
          lastTick = performance.now();
          refreshStats();
          resizeCanvas();
        },
      },
      {
        label: '选关',
        onClick: () => {
          gameSessionActive = false;
          hideOverlay();
          openLevelsScreen();
        },
      },
      {
        label: '回主菜单',
        onClick: () => exitToMenu(),
      },
    ]
  );
}

function togglePause() {
  if (!gameSessionActive || state.gameOver || state.levelComplete) return;
  state.paused = !state.paused;
  el.btnPause.textContent = state.paused ? '继续' : '暂停';
  if (!state.paused) lastTick = performance.now();
}

function openLevelsScreen() {
  renderLevelGrid(el.levelGrid, (idx) => startLevel(idx, 0));
  showScreen('levels');
}

function openShopScreen() {
  el.shopMsg.textContent = '';
  refreshWalletUI();
  renderItemShopList(el, {
    shopList: el.shopList,
    shopMsg: el.shopMsg,
    onAfterChange: refreshWalletUI,
  });
  showScreen('shop');
}

function openWeaponsScreen() {
  el.weaponMsg.textContent = '';
  refreshWalletUI();
  renderWeaponShopList({
    weaponList: el.weaponList,
    weaponMsg: el.weaponMsg,
    onAfterChange: refreshWalletUI,
  });
  showScreen('weapons');
}

function bindControls() {
  document.addEventListener('keydown', (e) => {
    if (currentScreen !== 'game' || !gameSessionActive) return;
    const k = e.key.toLowerCase();
    if (k === 'j' || k === 'f') {
      e.preventDefault();
      fireWeapon();
      return;
    }
    if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      togglePause();
      return;
    }
    if (setDirectionFromKey(state, e.key)) {
      e.preventDefault();
    }
  });

  document.querySelectorAll('.dpad-btn[data-dir]').forEach((btn) => {
    const dir = btn.dataset.dir;
    const steer = (e) => {
      if (currentScreen !== 'game' || !gameSessionActive) return;
      e.preventDefault();
      e.stopPropagation();
      setDirection(state, dir);
    };
    const pressOn = () => btn.classList.add('is-pressed');
    const pressOff = () => btn.classList.remove('is-pressed');

    btn.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      btn.setPointerCapture(e.pointerId);
      pressOn();
      steer(e);
    });
    btn.addEventListener('pointerup', pressOff);
    btn.addEventListener('pointercancel', pressOff);
    btn.addEventListener('lostpointercapture', pressOff);
    btn.addEventListener('click', (e) => e.preventDefault());
  });

  canvas.addEventListener(
    'touchstart',
    (e) => {
      const t = e.changedTouches[0];
      touchStart = { x: t.clientX, y: t.clientY };
    },
    { passive: true }
  );

  canvas.addEventListener(
    'touchend',
    (e) => {
      if (!touchStart || currentScreen !== 'game') return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      touchStart = null;
      const min = 24;
      if (Math.abs(dx) < min && Math.abs(dy) < min) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        setDirection(state, dx > 0 ? 'right' : 'left');
      } else {
        setDirection(state, dy > 0 ? 'down' : 'up');
      }
    },
    { passive: true }
  );

  el.btnPause.addEventListener('click', togglePause);
  el.btnRestart.addEventListener('click', () => {
    startLevel(state.levelIndex, 0);
  });
  el.btnExitGame.addEventListener('click', () => {
    bankSessionScore();
    saveProgressIfNeeded().then(() => exitToMenu());
  });
  el.btnFire?.addEventListener('click', (e) => {
    e.preventDefault();
    fireWeapon();
  });

  document.getElementById('btn-menu-play')?.addEventListener('click', () => {
    startLevel(getLastSelectedLevelIndex(), 0);
  });
  document.getElementById('btn-menu-levels')?.addEventListener('click', openLevelsScreen);
  document.getElementById('btn-menu-shop')?.addEventListener('click', openShopScreen);
  document.getElementById('btn-menu-weapons')?.addEventListener('click', openWeaponsScreen);
  document.getElementById('btn-levels-back')?.addEventListener('click', () => showScreen('menu'));
  document.getElementById('btn-shop-back')?.addEventListener('click', () => showScreen('menu'));
  document.getElementById('btn-weapons-back')?.addEventListener('click', () => showScreen('menu'));

  el.nickInput.addEventListener('change', () => {
    setNickname(el.nickInput.value);
  });
  el.nickInput.addEventListener('blur', () => {
    el.nickInput.value = getNickname();
  });
}

async function init() {
  el.nickInput.value = getNickname();
  el.nickInput.maxLength = MAX_NICK_LEN;
  el.nickInput.placeholder = DEFAULT_NICK;

  await loadRemoteProgress();
  ensureStarterWeapon();
  refreshWalletUI();
  await renderLeaderboard();

  bindControls();
  syncTouchControlsVisibility();
  window.addEventListener('resize', () => {
    syncTouchControlsVisibility();
    if (currentScreen === 'game') resizeCanvas();
  });

  showScreen('menu');
}

init();

/**
 * 贪吃蛇页面：画布绘制、输入、UI 与存档
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
} from './game.js';
import {
  getNickname,
  setNickname,
  getLocalBestScore,
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
} from './storage.js';
import { drawSnake } from './draw-snake.js';
import {
  applyEquippedCosmetics,
  applyConsumableEffect,
  effectIcons,
  toastForConsumable,
} from './item-effects.js';
import {
  ITEMS,
  redeemItem,
  canRedeemItem,
  equipToggle,
  toggleLoadout,
  getShopItemState,
} from './shop.js';
import { isCosmetic, isConsumable } from './items.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const el = {
  level: document.getElementById('stat-level'),
  food: document.getElementById('stat-food'),
  score: document.getElementById('stat-score'),
  lifetime: document.getElementById('stat-lifetime'),
  balance: document.getElementById('stat-balance'),
  best: document.getElementById('stat-best'),
  hint: document.getElementById('level-hint'),
  overlay: document.getElementById('overlay'),
  overlayTitle: document.getElementById('overlay-title'),
  overlayMsg: document.getElementById('overlay-msg'),
  overlayActions: document.getElementById('overlay-actions'),
  nickInput: document.getElementById('nick-input'),
  leaderboard: document.getElementById('leaderboard-list'),
  btnPause: document.getElementById('btn-pause'),
  btnRestart: document.getElementById('btn-restart'),
  btnShop: document.getElementById('btn-shop'),
  btnHome: document.getElementById('btn-home'),
  shopOverlay: document.getElementById('shop-overlay'),
  shopList: document.getElementById('shop-list'),
  shopBalance: document.getElementById('shop-balance'),
  shopLifetime: document.getElementById('shop-lifetime'),
  shopMsg: document.getElementById('shop-msg'),
  btnShopClose: document.getElementById('btn-shop-close'),
  effectBar: document.getElementById('effect-bar'),
  gameToast: document.getElementById('game-toast'),
};

let state = wrapNewLevel(0);
let toastTimer = 0;
/** 本局已入账到累计积分的分数（避免重复加） */
let sessionScoreBanked = 0;
let lastTick = 0;
let animId = 0;
let touchStart = null;

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

/** 消耗「下关使用」栏中的道具并生效（每关开始调用一次） */
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
  if (el.shopBalance) {
    el.shopBalance.textContent = String(getSpendableBalance());
  }
  if (el.shopLifetime) {
    el.shopLifetime.textContent = String(getLifetimeEarned());
  }
}

function refreshStats() {
  const lv = getLevel(state.levelIndex);
  el.level.textContent = `第 ${lv.id} 关 · ${lv.name}`;
  el.food.textContent = `${state.foodEaten} / ${lv.targetFood}`;
  el.score.textContent = String(state.score);
  el.best.textContent = String(getLocalBestScore());
  el.hint.textContent = lv.hint;
  refreshWalletUI();
}

function cellSize() {
  const lv = state.level;
  const maxW = Math.min(window.innerWidth - 32, 520);
  const maxH = Math.min(window.innerHeight - 320, 420);
  const cs = Math.floor(
    Math.min(maxW / lv.cols, maxH / lv.rows, 28)
  );
  return Math.max(cs, 12);
}

function resizeCanvas() {
  const lv = state.level;
  const cs = cellSize();
  const w = lv.cols * cs;
  const h = lv.rows * cs;
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  const stage = canvas.closest('.canvas-stage');
  if (stage) {
    const dpadSize = Math.min(44, Math.max(38, Math.round(w * 0.11)));
    stage.style.setProperty('--dpad-size', `${dpadSize}px`);
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

function draw() {
  const lv = state.level;
  const cs = cellSize();
  ctx.fillStyle = '#1a472a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < lv.rows; y++) {
    for (let x = 0; x < lv.cols; x++) {
      const checker = (x + y) % 2 === 0;
      drawCell(x, y, checker ? '#1e5230' : '#1a472a', 0.05);
    }
  }

  for (const [ox, oy] of lv.obstacles) {
    drawCell(ox, oy, '#5c4d3c', 0.25);
  }

  for (const { x, y } of getMoverCells(state)) {
    drawCell(x, y, '#e67e22', 0.3);
  }

  drawApple(state.food.x, state.food.y);
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

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** 把本局新增得分计入累计/可用积分（每段只计一次） */
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
}

function loop(now) {
  animId = requestAnimationFrame(loop);
  if (!state.paused && !state.gameOver && !state.levelComplete) {
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
  draw();
}

function onGameOver() {
  saveProgressIfNeeded();
  showOverlay('哎呀，撞到了！', `本局得分 ${state.score} 分，已加入累计积分。再试一次？`, [
    {
      label: '重新开始本关',
      primary: true,
      onClick: () => {
        hideOverlay();
        resetSession(state.levelIndex, 0);
        lastTick = performance.now();
        refreshStats();
        resizeCanvas();
      },
    },
    {
      label: '从第 1 关开始',
      onClick: () => {
        hideOverlay();
        resetSession(0, 0);
        lastTick = performance.now();
        refreshStats();
        resizeCanvas();
      },
    },
  ]);
}

function onLevelComplete() {
  saveProgressIfNeeded();
  if (state.allComplete) {
    showOverlay(
      '🎉 全部通关！',
      `太厉害了，景源！你完成了全部 ${TOTAL_LEVELS} 关，本局 ${state.score} 分已计入累计积分！`,
      [
        {
          label: '再玩一遍',
          primary: true,
          onClick: () => {
            hideOverlay();
            resetSession(0, 0);
            lastTick = performance.now();
            refreshStats();
            resizeCanvas();
          },
        },
        {
          label: '回导航页',
          onClick: () => {
            window.location.href = '/';
          },
        },
      ]
    );
    return;
  }
  const nextLv = getLevel(state.levelIndex + 1);
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
          applyEquippedCosmetics(state, getEquippedCosmeticIds());
          await applyLoadoutForLevel(state);
          lastTick = performance.now();
          refreshStats();
          resizeCanvas();
        },
      },
    ]
  );
}

function togglePause() {
  if (state.gameOver || state.levelComplete) return;
  state.paused = !state.paused;
  el.btnPause.textContent = state.paused ? '继续' : '暂停';
  if (!state.paused) lastTick = performance.now();
}

function renderShopList() {
  el.shopList.innerHTML = ITEMS.map((item) => {
    const st = getShopItemState(item.id);
    if (!st) return '';

    let meta = '';
    if (isCosmetic(item) && st.count > 0) {
      meta = st.equipped
        ? '<span class="shop-tag on">已装备</span>'
        : '<span class="shop-tag">已拥有</span>';
    } else if (isConsumable(item) && st.count > 0) {
      meta = `<span class="shop-tag">×${st.count}</span>`;
      if (st.inLoadout) meta += '<span class="shop-tag on">下关</span>';
    }

    const buyCheck = canRedeemItem(item.id);
    const buyDisabled =
      !buyCheck.ok &&
      (buyCheck.reason === 'insufficient' ||
        buyCheck.reason === 'owned' ||
        buyCheck.reason === 'full')
        ? 'disabled'
        : '';

    let extraBtn = '';
    if (isCosmetic(item) && st.count > 0) {
      extraBtn = `<button type="button" class="btn btn-mini" data-equip="${escapeHtml(item.id)}">${st.equipped ? '卸下' : '装备'}</button>`;
    } else if (isConsumable(item) && st.count > 0) {
      extraBtn = `<button type="button" class="btn btn-mini" data-loadout="${escapeHtml(item.id)}">${st.inLoadout ? '取消下关' : '下关使用'}</button>`;
    }

    return `
      <li class="shop-item">
        <span class="shop-item-emoji">${item.emoji}</span>
        <div>
          <div class="shop-item-name">${escapeHtml(item.name)} ${meta}</div>
          <div class="shop-item-desc">${escapeHtml(item.description)}</div>
          <div class="shop-item-price">${item.price} 积分</div>
        </div>
        <div class="shop-item-action shop-item-actions">
          <button type="button" class="btn btn-mini" data-buy="${escapeHtml(item.id)}" ${buyDisabled}>兑换</button>
          ${extraBtn}
        </div>
      </li>`;
  }).join('');

  el.shopList.querySelectorAll('[data-buy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-buy');
      el.shopMsg.textContent = '';
      const result = await redeemItem(id);
      if (!result.ok) {
        const msg = {
          insufficient: '积分不够哦，多玩几局再来～',
          owned: '永久道具买一次就够啦！',
          full: '这个道具背包已满。',
        };
        el.shopMsg.textContent = msg[result.reason] || '暂时无法兑换';
        return;
      }
      el.shopMsg.textContent = `兑换成功：${result.item.emoji} ${result.item.name}`;
      refreshWalletUI();
      renderShopList();
      applyEquippedCosmetics(state, getEquippedCosmeticIds());
      refreshEffectBar();
      draw();
    });
  });

  el.shopList.querySelectorAll('[data-equip]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-equip');
      await equipToggle(id);
      applyEquippedCosmetics(state, getEquippedCosmeticIds());
      refreshEffectBar();
      draw();
      renderShopList();
    });
  });

  el.shopList.querySelectorAll('[data-loadout]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-loadout');
      const r = await toggleLoadout(id);
      if (!r.ok) {
        el.shopMsg.textContent = '先兑换至少 1 个再用「下关使用」哦';
        return;
      }
      el.shopMsg.textContent = '已选好下关要带的道具！';
      renderShopList();
    });
  });
}

function openShop() {
  el.shopMsg.textContent = '';
  refreshWalletUI();
  renderShopList();
  el.shopOverlay.hidden = false;
}

function closeShop() {
  el.shopOverlay.hidden = true;
}

function bindControls() {
  document.addEventListener('keydown', (e) => {
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
      if (!touchStart) return;
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
    resetSession(state.levelIndex, 0);
    state.paused = false;
    el.btnPause.textContent = '暂停';
    lastTick = performance.now();
    refreshStats();
    hideOverlay();
  });
  el.btnShop.addEventListener('click', openShop);
  el.btnShopClose.addEventListener('click', closeShop);
  el.shopOverlay.addEventListener('click', (e) => {
    if (e.target === el.shopOverlay) closeShop();
  });
  el.btnHome.addEventListener('click', () => {
    window.location.href = '/';
  });

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
  refreshStats();
  await renderLeaderboard();

  bindControls();
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  showOverlay(
    '贪吃蛇 · 关卡模式',
    `共 ${TOTAL_LEVELS} 关。过关或结束时会把你本局新得到的分数加入「累计积分」，可在道具商店使用。键盘 / 滑动 / 右下角方向键操作。`,
    [
      {
        label: '开始游戏',
        primary: true,
        onClick: async () => {
          hideOverlay();
          await applyLoadoutForLevel(state);
          lastTick = performance.now();
          cancelAnimationFrame(animId);
          animId = requestAnimationFrame(loop);
        },
      },
    ]
  );

  draw();
}

init();

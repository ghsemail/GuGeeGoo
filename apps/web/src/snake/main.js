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
} from './game.js';
import {
  getNickname,
  setNickname,
  getLocalBestScore,
  getLocalMaxLevel,
  loadRemoteProgress,
  persistProgress,
  fetchLeaderboard,
  DEFAULT_NICK,
  MAX_NICK_LEN,
} from './storage.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const el = {
  level: document.getElementById('stat-level'),
  food: document.getElementById('stat-food'),
  score: document.getElementById('stat-score'),
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
  btnHome: document.getElementById('btn-home'),
};

let state = createLevelState(0);
let lastTick = 0;
let animId = 0;
let touchStart = null;

function unlockedMaxLevel() {
  return Math.max(getLocalMaxLevel(), 1);
}

function refreshStats() {
  const lv = getLevel(state.levelIndex);
  el.level.textContent = `第 ${lv.id} 关 · ${lv.name}`;
  el.food.textContent = `${state.foodEaten} / ${lv.targetFood}`;
  el.score.textContent = String(state.score);
  el.best.textContent = String(getLocalBestScore());
  el.hint.textContent = lv.hint;
}

function cellSize() {
  const lv = state.level;
  const maxW = Math.min(window.innerWidth - 32, 520);
  const maxH = Math.min(window.innerHeight - 280, 420);
  const cs = Math.floor(
    Math.min(maxW / lv.cols, maxH / lv.rows, 28)
  );
  return Math.max(cs, 12);
}

function resizeCanvas() {
  const lv = state.level;
  const cs = cellSize();
  canvas.width = lv.cols * cs;
  canvas.height = lv.rows * cs;
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
    drawCell(ox, oy, '#5c4d3c');
  }

  for (const { x, y } of getMoverCells(state)) {
    drawCell(x, y, '#e67e22');
  }

  drawCell(state.food.x, state.food.y, '#e74c3c', 0.35);

  state.snake.forEach((seg, i) => {
    const t = i === 0 ? '#7bed9f' : '#2ed573';
    drawCell(seg.x, seg.y, t, i === 0 ? 0.35 : 0.2);
  });
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

async function saveProgressIfNeeded() {
  const levelUnlocked = state.allComplete
    ? TOTAL_LEVELS
    : state.levelComplete
      ? state.levelIndex + 2
      : state.levelIndex + 1;
  await persistProgress({
    score: state.score,
    levelUnlocked: Math.min(levelUnlocked, TOTAL_LEVELS),
    nickname: getNickname(),
  });
  refreshStats();
  renderLeaderboard();
}

function loop(now) {
  animId = requestAnimationFrame(loop);
  const lv = state.level;
  if (!state.paused && !state.gameOver && !state.levelComplete) {
    if (now - lastTick >= lv.speedMs) {
      lastTick = now;
      tick(state, now);
      refreshStats();
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
  showOverlay('哎呀，撞到了！', `本局得分 ${state.score} 分。再试一次？`, [
    {
      label: '重新开始本关',
      primary: true,
      onClick: () => {
        hideOverlay();
        state = createLevelState(state.levelIndex);
        state.score = 0;
        lastTick = performance.now();
        refreshStats();
        resizeCanvas();
      },
    },
    {
      label: '从第 1 关开始',
      onClick: () => {
        hideOverlay();
        state = createLevelState(0);
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
      `太厉害了，景源！你完成了全部 ${TOTAL_LEVELS} 关，最终得分 ${state.score} 分！`,
      [
        {
          label: '再玩一遍',
          primary: true,
          onClick: () => {
            hideOverlay();
            state = createLevelState(0);
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
    `第 ${state.level.id} 关过关！下一关：${nextLv.name}。`,
    [
      {
        label: '进入下一关',
        primary: true,
        onClick: () => {
          hideOverlay();
          state = advanceToNextLevel(state);
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

  document.querySelectorAll('[data-dir]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setDirection(state, btn.dataset.dir);
    });
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
    state = createLevelState(state.levelIndex);
    state.paused = false;
    el.btnPause.textContent = '暂停';
    lastTick = performance.now();
    refreshStats();
    hideOverlay();
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
    `共 ${TOTAL_LEVELS} 关，每关吃够苹果就升级。键盘方向键 / WASD，手机上可以滑动或点方向钮。`,
    [
      {
        label: '开始游戏',
        primary: true,
        onClick: () => {
          hideOverlay();
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

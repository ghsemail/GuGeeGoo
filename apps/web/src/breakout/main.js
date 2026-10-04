import './breakout.css';
import { CANVAS_H, CANVAS_W, createBreakoutState, launchBall, tickBreakout } from './game.js';
import { LEVELS } from './levels.js';
import { drawBreakout } from './render.js';
import { getBestScore, getLifetimeEarned, recordRunScore } from './storage.js';

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game-canvas'));
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

const screenMenu = document.getElementById('screen-menu');
const screenLevels = document.getElementById('screen-levels');
const screenGame = document.getElementById('screen-game');
const overlay = document.getElementById('overlay');

/** @type {ReturnType<createBreakoutState> | null} */
let state = null;
let raf = 0;
let lastTs = 0;
let pointerActive = false;

function showScreen(name) {
  screenMenu.hidden = name !== 'menu';
  screenLevels.hidden = name !== 'levels';
  screenGame.hidden = name !== 'game';
}

function refreshMenuStats() {
  document.getElementById('menu-best').textContent = String(getBestScore());
  document.getElementById('menu-lifetime').textContent = String(getLifetimeEarned());
}

function refreshHud() {
  if (!state) return;
  document.getElementById('hud-score').textContent = String(state.score);
  document.getElementById('hud-lives').textContent = '❤️'.repeat(Math.max(0, state.lives));
  document.getElementById('hud-level').textContent = `第 ${state.levelIndex + 1} 关`;
}

function showOverlay(title, msg, actions) {
  document.getElementById('overlay-title').textContent = title;
  document.getElementById('overlay-msg').textContent = msg;
  const box = document.getElementById('overlay-actions');
  box.innerHTML = '';
  for (const a of actions) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn ${a.primary ? 'btn-primary' : ''}`;
    btn.textContent = a.label;
    btn.addEventListener('click', a.onClick);
    box.appendChild(btn);
  }
  overlay.hidden = false;
}

function hideOverlay() {
  overlay.hidden = true;
}

function fitCanvas() {
  const wrap = canvas.parentElement;
  const zone = wrap?.parentElement;
  if (!wrap || !zone) return;
  const r = zone.getBoundingClientRect();
  let displayW = Math.min(r.width, (r.height * CANVAS_W) / CANVAS_H);
  let displayH = (displayW * CANVAS_H) / CANVAS_W;
  if (displayH > r.height) {
    displayH = r.height;
    displayW = (displayH * CANVAS_W) / CANVAS_H;
  }
  displayW = Math.floor(displayW);
  displayH = Math.floor(displayH);
  if (displayW < 16 || displayH < 16) return;
  wrap.style.width = `${displayW}px`;
  wrap.style.height = `${displayH}px`;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(displayW * dpr));
  canvas.height = Math.max(1, Math.floor(displayH * dpr));
  canvas.style.width = `${displayW}px`;
  canvas.style.height = `${displayH}px`;
}

function endRun() {
  cancelAnimationFrame(raf);
  raf = 0;
  if (!state) return;
  const rec = recordRunScore(state.score);
  refreshMenuStats();
  if (state.won && state.levelIndex < LEVELS.length - 1) {
    showOverlay('🎉 过关！', `得分 +${state.score}\n下一关准备好了吗？`, [
      {
        label: '下一关',
        primary: true,
        onClick: () => {
          hideOverlay();
          startLevel(state.levelIndex + 1);
        },
      },
      {
        label: '回主菜单',
        onClick: () => {
          hideOverlay();
          showScreen('menu');
        },
      },
    ]);
    return;
  }
  const title = state.won ? '🏆 全通关！' : '游戏结束';
  showOverlay(title, `本局 ${state.score} 分 · 最高 ${rec.best}`, [
    {
      label: '再来一局',
      primary: true,
      onClick: () => {
        hideOverlay();
        showScreen('levels');
      },
    },
    {
      label: '回主菜单',
      onClick: () => {
        hideOverlay();
        showScreen('menu');
      },
    },
  ]);
}

function loop(ts) {
  if (!state) return;
  if (!lastTs) lastTs = ts;
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;
  if (state.running && !state.paused) {
    tickBreakout(state, dt);
    refreshHud();
    if (!state.running) {
      endRun();
      return;
    }
  }
  drawBreakout(ctx, state, canvas);
  raf = requestAnimationFrame(loop);
}

function startLevel(index) {
  state = createBreakoutState(index);
  lastTs = 0;
  showScreen('game');
  fitCanvas();
  refreshHud();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
}

function paddleFromClientX(clientX) {
  if (!state) return;
  const r = canvas.getBoundingClientRect();
  const sx = CANVAS_W / r.width;
  const x = (clientX - r.left) * sx;
  state.paddleX = Math.max(50, Math.min(CANVAS_W - 50, x));
}

function bindInput() {
  const zone = document.querySelector('.breakout-input-zone');
  const onMove = (e) => {
    if (!state?.running || state.paused) return;
    const x = e.clientX ?? e.touches?.[0]?.clientX;
    if (x != null) paddleFromClientX(x);
  };
  zone?.addEventListener('pointermove', onMove);
  zone?.addEventListener('pointerdown', (e) => {
    pointerActive = true;
    onMove(e);
    launchBall(state);
    e.preventDefault();
  });
  window.addEventListener('pointerup', () => {
    pointerActive = false;
  });

  window.addEventListener('keydown', (e) => {
    if (!state || !state.running || state.paused) return;
    const step = 22;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      state.paddleX -= step;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      state.paddleX += step;
    }
    state.paddleX = Math.max(50, Math.min(CANVAS_W - 50, state.paddleX));
    if (e.key === ' ' || e.key === 'Enter') launchBall(state);
  });

  document.addEventListener('mousemove', (e) => {
    if (pointerActive) return;
    if (!state || screenGame.hidden) return;
    paddleFromClientX(e.clientX);
  });
}

function renderLevelGrid() {
  const root = document.getElementById('level-grid');
  root.innerHTML = '';
  LEVELS.forEach((lv, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `${lv.id}. ${lv.name}`;
    btn.addEventListener('click', () => {
      hideOverlay();
      startLevel(i);
    });
    root.appendChild(btn);
  });
}

document.getElementById('btn-menu-play').addEventListener('click', () => {
  showScreen('levels');
});
document.getElementById('btn-menu-levels').addEventListener('click', () => {
  showScreen('levels');
});
document.getElementById('btn-levels-back').addEventListener('click', () => {
  showScreen('menu');
});
document.getElementById('btn-pause').addEventListener('click', () => {
  if (!state?.running) return;
  state.paused = !state.paused;
  document.getElementById('btn-pause').textContent = state.paused ? '继续' : '暂停';
});
document.getElementById('btn-exit').addEventListener('click', () => {
  cancelAnimationFrame(raf);
  if (state) state.running = false;
  showScreen('menu');
  refreshMenuStats();
});

bindInput();
renderLevelGrid();
window.addEventListener('resize', fitCanvas);
refreshMenuStats();
showScreen('menu');

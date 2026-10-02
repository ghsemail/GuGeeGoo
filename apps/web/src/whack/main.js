import './whack.css';
import {
  createWhackState,
  holeIndexFromPoint,
  tickWhack,
  whackHole,
} from './game.js';
import { drawWhack } from './render.js';
import { getBestScore, getLifetimeEarned, recordRunScore } from './storage.js';

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game-canvas'));
const ctx = canvas.getContext('2d');
const screenMenu = document.getElementById('screen-menu');
const screenGame = document.getElementById('screen-game');
const overlay = document.getElementById('overlay');

let state = createWhackState();
let toast = '';
let toastTimer = 0;
let raf = 0;
let lastTs = 0;

function showScreen(name) {
  screenMenu.hidden = name !== 'menu';
  screenGame.hidden = name !== 'game';
}

function refreshMenuStats() {
  document.getElementById('menu-best').textContent = String(getBestScore());
  document.getElementById('menu-lifetime').textContent = String(getLifetimeEarned());
}

function refreshHud() {
  document.getElementById('hud-score').textContent = String(state.score);
  document.getElementById('hud-time').textContent = String(Math.ceil(state.timeLeft));
  document.getElementById('hud-lives').textContent = '❤️'.repeat(Math.max(0, state.lives));
  document.getElementById('hud-grid').textContent =
    state.gridSize === 4 ? '4×4' : '3×3';
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

function endRun() {
  cancelAnimationFrame(raf);
  raf = 0;
  const rec = recordRunScore(state.score);
  refreshMenuStats();
  const won = state.timeLeft <= 0 && state.lives > 0;
  showOverlay(
    won ? '⏱️ 时间到！' : state.lives <= 0 ? '💔 没生命了' : '游戏结束',
    `本局得分 ${state.score} 分\n累计 ${rec.lifetime} · 最高 ${rec.best}`,
    [
      {
        label: '再来一局',
        primary: true,
        onClick: () => {
          hideOverlay();
          startGame();
        },
      },
      {
        label: '回主菜单',
        onClick: () => {
          hideOverlay();
          showScreen('menu');
          refreshMenuStats();
        },
      },
    ]
  );
}

function fitCanvas() {
  const wrap = canvas.parentElement;
  if (!wrap) return;
  const r = wrap.getBoundingClientRect();
  const size = Math.floor(Math.min(r.width, r.height));
  canvas.width = 400;
  canvas.height = 400;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
}

function loop(ts) {
  if (!lastTs) lastTs = ts;
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;
  if (state.running && !state.paused) {
    tickWhack(state, dt);
    refreshHud();
    if (!state.running) {
      endRun();
      return;
    }
  }
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) toast = '';
  }
  drawWhack(ctx, state, canvas.width, canvas.height, toast);
  raf = requestAnimationFrame(loop);
}

function startGame() {
  state = createWhackState();
  state._spawnAcc = 0;
  lastTs = 0;
  toast = '';
  showScreen('game');
  fitCanvas();
  refreshHud();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
}

function pointerToCanvas(e) {
  const r = canvas.getBoundingClientRect();
  const sx = canvas.width / r.width;
  const sy = canvas.height / r.height;
  const clientX = e.clientX ?? e.touches?.[0]?.clientX;
  const clientY = e.clientY ?? e.touches?.[0]?.clientY;
  return {
    x: (clientX - r.left) * sx,
    y: (clientY - r.top) * sy,
  };
}

function onTap(e) {
  if (!state.running || state.paused) return;
  e.preventDefault();
  const { x, y } = pointerToCanvas(e);
  const idx = holeIndexFromPoint(state.gridSize, x, y, canvas.width, canvas.height);
  if (idx < 0) return;
  const res = whackHole(state, idx);
  if (res.message) {
    toast = res.message;
    toastTimer = 0.8;
  }
  refreshHud();
  if (!state.running) endRun();
}

canvas.addEventListener('pointerdown', onTap);

document.getElementById('btn-menu-play').addEventListener('click', () => {
  hideOverlay();
  startGame();
});

document.getElementById('btn-pause').addEventListener('click', () => {
  if (!state.running) return;
  state.paused = !state.paused;
  document.getElementById('btn-pause').textContent = state.paused ? '继续' : '暂停';
});

document.getElementById('btn-exit').addEventListener('click', () => {
  cancelAnimationFrame(raf);
  state.running = false;
  showScreen('menu');
  refreshMenuStats();
});

window.addEventListener('resize', fitCanvas);
refreshMenuStats();
showScreen('menu');

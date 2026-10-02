import './2048.css';
import {
  create2048State,
  hasMoves,
  maxTile,
  moveGrid,
  spawnTile,
  cloneGrid,
} from './game.js';
import { tileColor, tileTextColor } from './tile-colors.js';
import { getBestScore, getLifetimeEarned, recordRunScore } from './storage.js';

const board = document.getElementById('game-board');
const screenMenu = document.getElementById('screen-menu');
const screenGame = document.getElementById('screen-game');
const overlay = document.getElementById('overlay');

/** @type {ReturnType<create2048State>} */
let state = create2048State();
/** @type {HTMLElement[]} */
let cells = [];

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
  document.getElementById('hud-best').textContent = String(getBestScore());
  document.getElementById('btn-undo').disabled = state.undoUsed || !state.undoSnapshot;
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

function buildBoardDom() {
  board.innerHTML = '';
  cells = [];
  for (let i = 0; i < 16; i++) {
    const cell = document.createElement('div');
    cell.className = 'tile-cell';
    board.appendChild(cell);
    cells.push(cell);
  }
}

function renderBoard(animateNew) {
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const idx = y * 4 + x;
      const cell = cells[idx];
      const v = state.grid[y][x];
      cell.innerHTML = '';
      if (v) {
        const t = document.createElement('div');
        t.className = 'tile' + (animateNew ? ' tile-new' : '');
        t.style.background = tileColor(v);
        t.style.color = tileTextColor(v);
        t.style.fontSize = v >= 1024 ? '22px' : v >= 128 ? '26px' : '30px';
        t.textContent = String(v);
        cell.appendChild(t);
      }
    }
  }
  refreshHud();
}

function checkEnd() {
  if (!state.continueAfterWin && maxTile(state.grid) >= 2048 && !state.won) {
    state.won = true;
    showOverlay('🎉 2048！', '太厉害了！要继续冲更高数字吗？', [
      {
        label: '继续玩',
        primary: true,
        onClick: () => {
          state.continueAfterWin = true;
          hideOverlay();
        },
      },
      {
        label: '结束本局',
        onClick: () => finishRun(),
      },
    ]);
    return;
  }
  if (!hasMoves(state.grid)) {
    state.over = true;
    finishRun();
  }
}

function finishRun() {
  const rec = recordRunScore(state.score);
  refreshMenuStats();
  showOverlay('游戏结束', `得分 ${state.score}\n最高 ${rec.best} · 累计 ${rec.lifetime}`, [
    {
      label: '新游戏',
      primary: true,
      onClick: () => {
        hideOverlay();
        newGame();
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
  ]);
}

function newGame() {
  state = create2048State();
  renderBoard(false);
  showScreen('game');
}

/**
 * @param {'up'|'down'|'left'|'right'} dir
 */
function applyMove(dir) {
  if (state.over) return;
  if (state.won && !state.continueAfterWin) return;

  state.undoSnapshot = {
    grid: cloneGrid(state.grid),
    score: state.score,
  };

  const { moved, scoreGain } = moveGrid(state.grid, dir);
  if (!moved) {
    state.undoSnapshot = null;
    return;
  }
  state.score += scoreGain;
  const spawned = spawnTile(state.grid);
  renderBoard(!!spawned);
  if (state.score > getBestScore()) {
    localStorage.setItem('gugeegoo_2048_best_score', String(state.score));
  }
  checkEnd();
}

function undoOnce() {
  if (state.undoUsed || !state.undoSnapshot || state.over) return;
  state.grid = cloneGrid(state.undoSnapshot.grid);
  state.score = state.undoSnapshot.score;
  state.undoSnapshot = null;
  state.undoUsed = true;
  renderBoard(false);
}

function bindSwipe() {
  let sx = 0;
  let sy = 0;
  const min = 28;
  board.addEventListener(
    'pointerdown',
    (e) => {
      sx = e.clientX;
      sy = e.clientY;
      e.preventDefault();
    },
    { passive: false }
  );
  board.addEventListener(
    'pointerup',
    (e) => {
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.abs(dx) < min && Math.abs(dy) < min) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        applyMove(dx > 0 ? 'right' : 'left');
      } else {
        applyMove(dy > 0 ? 'down' : 'up');
      }
    },
    { passive: false }
  );
}

window.addEventListener('keydown', (e) => {
  if (screenGame.hidden) return;
  const map = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up',
    W: 'up',
    s: 'down',
    S: 'down',
    a: 'left',
    A: 'left',
    d: 'right',
    D: 'right',
  };
  const dir = map[e.key];
  if (dir) {
    e.preventDefault();
    applyMove(dir);
  }
});

document.getElementById('btn-menu-play').addEventListener('click', () => {
  hideOverlay();
  newGame();
});
document.getElementById('btn-new').addEventListener('click', () => {
  if (
    state.score > 0 &&
    !state.over &&
    !confirm('开始新游戏？当前进度会丢失。')
  ) {
    return;
  }
  hideOverlay();
  newGame();
});
document.getElementById('btn-undo').addEventListener('click', undoOnce);
document.getElementById('btn-exit').addEventListener('click', () => {
  if (state.score > 0) recordRunScore(state.score);
  showScreen('menu');
  refreshMenuStats();
});

buildBoardDom();
bindSwipe();
refreshMenuStats();
showScreen('menu');

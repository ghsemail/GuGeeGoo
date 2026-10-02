/** @typedef {'normal'|'golden'|'bomb'} MoleKind */

/**
 * @param {number} gridSize
 * @param {number} elapsed
 */
export function spawnIntervalSec(gridSize, elapsed) {
  const base = gridSize === 3 ? 0.85 : 0.65;
  return Math.max(0.28, base - elapsed * 0.008);
}

export function gridSizeForScore(score) {
  return score >= 120 ? 4 : 3;
}

export function createWhackState() {
  return {
    score: 0,
    lives: 3,
    timeLeft: 60,
    elapsed: 0,
    gridSize: 3,
    /** @type {(null | { kind: MoleKind, ttl: number })[]} */
    holes: Array(9).fill(null),
    running: true,
    paused: false,
    hits: 0,
    misses: 0,
    _spawnAcc: 0,
  };
}

/**
 * @param {ReturnType<createWhackState>} state
 */
export function resizeHoles(state) {
  const n = state.gridSize * state.gridSize;
  while (state.holes.length < n) state.holes.push(null);
  state.holes.length = n;
  for (let i = 0; i < n; i++) {
    if (state.holes[i] && i >= n) state.holes[i] = null;
  }
}

/**
 * @param {ReturnType<createWhackState>} state
 * @param {number} dt
 */
export function tickWhack(state, dt) {
  if (!state.running || state.paused) return;
  state.elapsed += dt;
  state.timeLeft -= dt;
  if (state.timeLeft <= 0) {
    state.running = false;
    return;
  }

  const nextGrid = gridSizeForScore(state.score);
  if (nextGrid !== state.gridSize) {
    state.gridSize = nextGrid;
    resizeHoles(state);
  }

  const n = state.gridSize * state.gridSize;
  for (let i = 0; i < n; i++) {
    const h = state.holes[i];
    if (h) {
      h.ttl -= dt;
      if (h.ttl <= 0) {
        if (h.kind === 'bomb') {
          /* bomb left alone — no penalty */
        } else {
          state.misses += 1;
        }
        state.holes[i] = null;
      }
    }
  }

  state._spawnAcc = (state._spawnAcc || 0) + dt;
  const interval = spawnIntervalSec(state.gridSize, state.elapsed);
  while (state._spawnAcc >= interval) {
    state._spawnAcc -= interval;
    trySpawnMole(state);
  }
}

/**
 * @param {ReturnType<createWhackState>} state
 */
function trySpawnMole(state) {
  const n = state.gridSize * state.gridSize;
  const empty = [];
  for (let i = 0; i < n; i++) {
    if (!state.holes[i]) empty.push(i);
  }
  if (!empty.length) return;
  const idx = empty[Math.floor(Math.random() * empty.length)];
  const r = Math.random();
  /** @type {MoleKind} */
  let kind = 'normal';
  if (r < 0.12) kind = 'bomb';
  else if (r < 0.22) kind = 'golden';
  const stay = kind === 'bomb' ? 1.1 : kind === 'golden' ? 0.95 : 0.75;
  state.holes[idx] = { kind, ttl: stay };
}

/**
 * @param {ReturnType<createWhackState>} state
 * @param {number} holeIndex
 * @returns {{ ok: boolean, message?: string }}
 */
export function whackHole(state, holeIndex) {
  if (!state.running || state.paused) return { ok: false };
  const h = state.holes[holeIndex];
  if (!h) return { ok: false };
  state.holes[holeIndex] = null;
  if (h.kind === 'normal') {
    state.score += 10;
    state.hits += 1;
  } else if (h.kind === 'golden') {
    state.score += 35;
    state.hits += 1;
  } else {
    state.score = Math.max(0, state.score - 25);
    state.lives -= 1;
    if (state.lives <= 0) state.running = false;
    return { ok: true, message: '💣 打错了！' };
  }
  return { ok: true };
}

export function holeIndexFromPoint(gridSize, x, y, w, h) {
  const pad = w * 0.06;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const cellW = innerW / gridSize;
  const cellH = innerH / gridSize;
  const cx = x - pad;
  const cy = y - pad;
  if (cx < 0 || cy < 0 || cx >= innerW || cy >= innerH) return -1;
  const col = Math.floor(cx / cellW);
  const row = Math.floor(cy / cellH);
  return row * gridSize + col;
}

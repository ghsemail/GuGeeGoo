/**
 * 贪吃蛇核心逻辑：网格、蛇身、食物、障碍与移动块
 */
import { getLevel, TOTAL_LEVELS } from './levels.js';
import { createDefaultEffects } from './item-effects.js';
import { tickWeaponSystems, isMoverFrozen } from './game-combat.js';

export const DIR = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function keyToDir(key) {
  const k = key.toLowerCase();
  if (key === 'ArrowUp' || k === 'w') return 'up';
  if (key === 'ArrowDown' || k === 's') return 'down';
  if (key === 'ArrowLeft' || k === 'a') return 'left';
  if (key === 'ArrowRight' || k === 'd') return 'right';
  return null;
}

function opposite(a, b) {
  return a.x + b.x === 0 && a.y + b.y === 0;
}

function cellKey(x, y) {
  return `${x},${y}`;
}

/** 右下角方向键占用的安全区（蛇不在此出生） */
export function isDpadSafeZone(x, y, cols, rows) {
  const reserveX = Math.min(6, Math.max(4, Math.ceil(cols * 0.34)));
  const reserveY = Math.min(6, Math.max(4, Math.ceil(rows * 0.34)));
  return x >= cols - reserveX && y >= rows - reserveY;
}

function randomEmptyCell(cols, rows, blocked, avoidDpad = false) {
  const tries = cols * rows;
  for (let i = 0; i < tries; i++) {
    const x = Math.floor(Math.random() * cols);
    const y = Math.floor(Math.random() * rows);
    if (avoidDpad && isDpadSafeZone(x, y, cols, rows)) continue;
    if (!blocked.has(cellKey(x, y))) return { x, y };
  }
  for (let i = 0; i < tries; i++) {
    const x = Math.floor(Math.random() * cols);
    const y = Math.floor(Math.random() * rows);
    if (!blocked.has(cellKey(x, y))) return { x, y };
  }
  return { x: 0, y: 0 };
}

function pickSpawn(level, blocked) {
  const { cols, rows } = level;
  const candidates = [];

  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if (isDpadSafeZone(x, y, cols, rows)) continue;
      const segs = [
        { x, y },
        { x: x - 1, y },
        { x: x - 2, y },
      ];
      if (segs.some((s) => s.x < 0 || s.y < 0 || s.y >= rows)) continue;
      if (segs.some((s) => blocked.has(cellKey(s.x, s.y)))) continue;
      if (segs.some((s) => isDpadSafeZone(s.x, s.y, cols, rows))) continue;
      candidates.push({ head: segs[0], snake: segs, score: x + y });
    }
  }

  if (!candidates.length) {
    const hx = Math.max(2, Math.floor(cols * 0.2));
    const hy = Math.floor(rows / 2);
    return {
      snake: [
        { x: hx, y: hy },
        { x: hx - 1, y: hy },
        { x: hx - 2, y: hy },
      ],
      direction: DIR.right,
    };
  }

  candidates.sort((a, b) => a.score - b.score);
  return { snake: candidates[0].snake, direction: DIR.right };
}

/** 创建某一关的初始状态 */
export function createLevelState(levelIndex) {
  const level = getLevel(levelIndex);
  const blocked = new Set();
  for (const [ox, oy] of level.obstacles) {
    blocked.add(cellKey(ox, oy));
  }
  for (const m of level.movers) {
    const p = m.path[0];
    blocked.add(cellKey(p[0], p[1]));
  }

  const spawn = pickSpawn(level, blocked);
  const snake = spawn.snake;
  for (const seg of snake) {
    blocked.add(cellKey(seg.x, seg.y));
  }
  const food = randomEmptyCell(level.cols, level.rows, blocked, true);

  const moverStates = level.movers.map((m) => ({
    pathIndex: 0,
    lastStep: 0,
  }));

  return {
    levelIndex,
    level,
    snake,
    direction: spawn.direction,
    nextDirection: spawn.direction,
    food,
    foodEaten: 0,
    score: 0,
    moverStates,
    paused: false,
    gameOver: false,
    levelComplete: false,
    allComplete: false,
    tickCount: 0,
    effects: createDefaultEffects(),
    projectiles: [],
    weaponRuntime: null,
    moverFreezeTicks: {},
  };
}

function getMoverCells(state) {
  const cells = [];
  const { level, moverStates } = state;
  level.movers.forEach((m, i) => {
    const idx = moverStates[i].pathIndex;
    const [x, y] = m.path[idx];
    cells.push({ x, y });
  });
  return cells;
}

function advanceMovers(state, now) {
  const { level, moverStates } = state;
  level.movers.forEach((m, i) => {
    if (isMoverFrozen(state, i)) return;
    const st = moverStates[i];
    if (now - st.lastStep >= m.stepMs) {
      st.lastStep = now;
      st.pathIndex = (st.pathIndex + 1) % m.path.length;
    }
  });
}

function buildBlockedSet(state, includeSnake = true) {
  const set = new Set();
  const { level, snake } = state;
  for (const [ox, oy] of level.obstacles) {
    set.add(cellKey(ox, oy));
  }
  for (const { x, y } of getMoverCells(state)) {
    set.add(cellKey(x, y));
  }
  if (includeSnake) {
    for (const seg of snake) {
      set.add(cellKey(seg.x, seg.y));
    }
  }
  return set;
}

function buildSnakeBodySet(state, excludeTail = false) {
  const set = new Set();
  const snake = state.snake;
  const limit = excludeTail ? snake.length - 1 : snake.length;
  for (let i = 0; i < limit; i++) {
    const seg = snake[i];
    set.add(cellKey(seg.x, seg.y));
  }
  return set;
}

function tryUseShield(state) {
  const fx = state.effects;
  if (!fx || fx.shieldCharges <= 0) return false;
  fx.shieldCharges -= 1;
  return true;
}

function pullFoodWithMagnet(state) {
  const fx = state.effects;
  if (!fx?.magnetActive) return;
  const head = state.snake[0];
  const food = state.food;
  const dx = food.x - head.x;
  const dy = food.y - head.y;
  const dist = Math.abs(dx) + Math.abs(dy);
  if (dist <= 0 || dist > 4) return;
  if (dx !== 0 && dy !== 0) return;

  let nx = food.x;
  let ny = food.y;
  if (dx !== 0) nx += dx > 0 ? -1 : 1;
  if (dy !== 0) ny += dy > 0 ? -1 : 1;

  const blocked = buildBlockedSet(state, true);
  blocked.delete(cellKey(food.x, food.y));
  if (!blocked.has(cellKey(nx, ny))) {
    state.food = { x: nx, y: ny };
  }
}

/** 移动一格 */
export function tick(state, now) {
  if (state.paused || state.gameOver || state.levelComplete) {
    return { moved: false };
  }

  advanceMovers(state, now);
  tickWeaponSystems(state);

  const fx = state.effects || createDefaultEffects();
  if (fx.ghostTicksLeft > 0) {
    fx.ghostTicksLeft -= 1;
  }

  if (!opposite(state.direction, state.nextDirection)) {
    state.direction = state.nextDirection;
  }

  const head = state.snake[0];
  const d = state.direction;
  const newHead = { x: head.x + d.x, y: head.y + d.y };
  const { cols, rows, targetFood } = state.level;
  const ghost = fx.ghostTicksLeft > 0;

  const outOfBounds =
    newHead.x < 0 ||
    newHead.x >= cols ||
    newHead.y < 0 ||
    newHead.y >= rows;

  if (outOfBounds) {
    if (tryUseShield(state)) {
      return { moved: false, shieldUsed: true };
    }
    state.gameOver = true;
    return { moved: false, reason: 'wall' };
  }

  const tail = state.snake[state.snake.length - 1];
  const willGrow =
    newHead.x === state.food.x && newHead.y === state.food.y;

  const bodyBlocked = buildSnakeBodySet(state, !willGrow);
  if (bodyBlocked.has(cellKey(newHead.x, newHead.y))) {
    if (tryUseShield(state)) {
      return { moved: false, shieldUsed: true };
    }
    state.gameOver = true;
    return { moved: false, reason: 'hit' };
  }

  if (!ghost) {
    const blocked = buildBlockedSet(state, true);
    if (!willGrow) {
      blocked.delete(cellKey(tail.x, tail.y));
    }
    if (blocked.has(cellKey(newHead.x, newHead.y))) {
      if (tryUseShield(state)) {
        return { moved: false, shieldUsed: true };
      }
      state.gameOver = true;
      return { moved: false, reason: 'hit' };
    }
  }

  state.snake.unshift(newHead);
  state.tickCount += 1;

  const scoreMul = fx.scoreMultiplier || 1;

  if (willGrow) {
    state.foodEaten += 1;
    state.score += Math.round(10 * scoreMul);
    if (state.foodEaten >= targetFood) {
      state.levelComplete = true;
      state.score += Math.round(50 * scoreMul);
      if (state.levelIndex >= TOTAL_LEVELS - 1) {
        state.allComplete = true;
      }
    } else {
      const blockedFood = buildBlockedSet(state, true);
      state.food = randomEmptyCell(cols, rows, blockedFood, true);
    }
  } else {
    state.snake.pop();
  }

  pullFoodWithMagnet(state);

  return { moved: true, ateFood: willGrow };
}

export function getEffectiveSpeedMs(state) {
  const lv = state.level;
  const bonus = state.effects?.speedBonusMs || 0;
  return lv.speedMs + bonus;
}

export function setDirectionFromKey(state, key) {
  const name = keyToDir(key);
  if (!name) return false;
  const nd = DIR[name];
  if (opposite(state.direction, nd)) return false;
  state.nextDirection = nd;
  return true;
}

export function setDirection(state, dirName) {
  const nd = DIR[dirName];
  if (!nd || opposite(state.direction, nd)) return false;
  state.nextDirection = nd;
  return true;
}

export function advanceToNextLevel(state) {
  const carryScore = state.score;
  const next = createLevelState(state.levelIndex + 1);
  next.score = carryScore;
  return next;
}

export { getLevel, TOTAL_LEVELS, getMoverCells, buildBlockedSet };
export {
  initWeaponRuntime,
  tryFireWeapon,
  isMoverFrozen,
} from './game-combat.js';

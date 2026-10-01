/**
 * 贪吃蛇核心逻辑：网格、蛇身、食物、障碍与移动块
 */
import { getLevel, TOTAL_LEVELS } from './levels.js';

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

function randomEmptyCell(cols, rows, blocked) {
  const tries = cols * rows;
  for (let i = 0; i < tries; i++) {
    const x = Math.floor(Math.random() * cols);
    const y = Math.floor(Math.random() * rows);
    if (!blocked.has(cellKey(x, y))) return { x, y };
  }
  return { x: 0, y: 0 };
}

/** 创建某一关的初始状态 */
export function createLevelState(levelIndex) {
  const level = getLevel(levelIndex);
  const startX = Math.floor(level.cols / 2);
  const startY = Math.floor(level.rows / 2);
  const snake = [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY },
  ];
  const blocked = new Set();
  for (const [ox, oy] of level.obstacles) {
    blocked.add(cellKey(ox, oy));
  }
  for (const seg of snake) {
    blocked.add(cellKey(seg.x, seg.y));
  }
  for (const m of level.movers) {
    const p = m.path[0];
    blocked.add(cellKey(p[0], p[1]));
  }
  const food = randomEmptyCell(level.cols, level.rows, blocked);

  const moverStates = level.movers.map((m) => ({
    pathIndex: 0,
    lastStep: 0,
  }));

  return {
    levelIndex,
    level,
    snake,
    direction: DIR.right,
    nextDirection: DIR.right,
    food,
    foodEaten: 0,
    score: 0,
    moverStates,
    paused: false,
    gameOver: false,
    levelComplete: false,
    allComplete: false,
    tickCount: 0,
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

/** 移动一格；返回 { ok, reason } */
export function tick(state, now) {
  if (state.paused || state.gameOver || state.levelComplete) {
    return { moved: false };
  }

  advanceMovers(state, now);

  if (!opposite(state.direction, state.nextDirection)) {
    state.direction = state.nextDirection;
  }

  const head = state.snake[0];
  const d = state.direction;
  const newHead = { x: head.x + d.x, y: head.y + d.y };
  const { cols, rows, targetFood } = state.level;

  if (
    newHead.x < 0 ||
    newHead.x >= cols ||
    newHead.y < 0 ||
    newHead.y >= rows
  ) {
    state.gameOver = true;
    return { moved: false, reason: 'wall' };
  }

  const blocked = buildBlockedSet(state, true);
  const tail = state.snake[state.snake.length - 1];
  const willGrow =
    newHead.x === state.food.x && newHead.y === state.food.y;
  if (!willGrow) {
    blocked.delete(cellKey(tail.x, tail.y));
  }

  if (blocked.has(cellKey(newHead.x, newHead.y))) {
    state.gameOver = true;
    return { moved: false, reason: 'hit' };
  }

  state.snake.unshift(newHead);
  state.tickCount += 1;

  if (willGrow) {
    state.foodEaten += 1;
    state.score += 10;
    if (state.foodEaten >= targetFood) {
      state.levelComplete = true;
      state.score += 50;
      if (state.levelIndex >= TOTAL_LEVELS - 1) {
        state.allComplete = true;
      }
    } else {
      const blockedFood = buildBlockedSet(state, true);
      state.food = randomEmptyCell(cols, rows, blockedFood);
    }
  } else {
    state.snake.pop();
  }

  return { moved: true };
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

export function restartCurrentLevel(levelIndex) {
  const prevScore = 0;
  return createLevelState(levelIndex);
}

export function advanceToNextLevel(state) {
  const carryScore = state.score;
  const next = createLevelState(state.levelIndex + 1);
  next.score = carryScore;
  return next;
}

export { getLevel, TOTAL_LEVELS, getMoverCells, buildBlockedSet };

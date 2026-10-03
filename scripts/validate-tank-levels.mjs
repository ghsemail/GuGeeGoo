#!/usr/bin/env node
/**
 * 校验坦克关卡：矩形、全钢外框、1 个 P、≥1 个 E、BFS 可达性（B 可穿过，S 阻挡）
 */
import { LEVELS } from '../apps/web/src/tank/levels.js';
import { createMapFromLevel } from '../apps/web/src/tank/map.js';
import { findBossSpawn } from '../apps/web/src/tank/boss.js';
import { TILE } from '../apps/web/src/tank/constants.js';

const PASSABLE = new Set([TILE.EMPTY, TILE.BRICK, TILE.BASE]);

function charAt(grid, x, y) {
  return grid[y]?.[x] ?? '';
}

function bfsReachable(grid, startX, startY) {
  const rows = grid.length;
  const cols = grid[0].length;
  const seen = new Set();
  const q = [[startX, startY]];
  seen.add(`${startX},${startY}`);
  const key = (x, y) => `${x},${y}`;

  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const ch = charAt(grid, nx, ny);
      if (ch === 'S' || ch === 's') continue;
      if (!PASSABLE.has(tileFromChar(ch)) && ch !== 'P' && ch !== 'E') continue;
      if (seen.has(key(nx, ny))) continue;
      seen.add(key(nx, ny));
      q.push([nx, ny]);
    }
  }
  return seen;
}

function tileFromChar(ch) {
  if (ch === 'B' || ch === 'b') return TILE.BRICK;
  if (ch === 'S' || ch === 's') return TILE.STEEL;
  if (ch === 'H') return TILE.BASE;
  return TILE.EMPTY;
}

function validateLevel(level) {
  const issues = [];
  const grid = level.grid;
  const rows = grid.length;
  const cols = grid[0]?.length || 0;

  for (let y = 0; y < rows; y++) {
    if (grid[y].length !== cols) {
      issues.push(`行 ${y + 1} 宽度 ${grid[y].length} ≠ ${cols}`);
    }
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const onEdge = y === 0 || y === rows - 1 || x === 0 || x === cols - 1;
      if (onEdge && grid[y][x] !== 'S') {
        issues.push(`外框 (${x},${y}) 应为 S，实为 ${grid[y][x]}`);
      }
    }
  }

  let pCount = 0;
  let pPos = null;
  const ePos = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = grid[y][x];
      if (ch === 'P') {
        pCount += 1;
        pPos = [x, y];
      }
      if (ch === 'E') ePos.push([x, y]);
    }
  }
  if (pCount !== 1) issues.push(`P 数量应为 1，实际 ${pCount}`);
  if (ePos.length < 1) issues.push('至少 1 个 E');

  if (pPos) {
    const seen = bfsReachable(grid, pPos[0], pPos[1]);
    for (const [ex, ey] of ePos) {
      if (!seen.has(`${ex},${ey}`)) {
        issues.push(`敌人 (${ex},${ey}) 从玩家不可达`);
      }
    }
  }

  let mapOk = true;
  try {
    const map = createMapFromLevel(level);
    for (let y = 0; y < map.rows; y++) {
      for (let x = 0; x < map.cols; x++) {
        const onEdge = y === 0 || y === map.rows - 1 || x === 0 || x === map.cols - 1;
        if (onEdge && map.cells[y][x] !== TILE.STEEL) {
          issues.push(`建图后外框 (${x},${y}) 非 STEEL`);
          mapOk = false;
        }
      }
    }
  } catch (e) {
    issues.push(`createMapFromLevel: ${e.message}`);
    mapOk = false;
  }

  try {
    const map = createMapFromLevel(level);
    if (!findBossSpawn(map)) {
      issues.push('找不到 BOSS 2×2 出生点');
    }
  } catch (e) {
    issues.push(`BOSS 出生点: ${e.message}`);
  }

  return {
    id: level.id,
    name: level.name,
    size: `${cols}×${rows}`,
    enemies: ePos.length,
    mapOk,
    ok: issues.length === 0,
    issues,
  };
}

const results = LEVELS.map(validateLevel);
console.log(JSON.stringify({ results }, null, 2));
if (results.some((r) => !r.ok)) process.exit(1);

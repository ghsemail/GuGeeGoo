/**
 * 地图：把 levels.js 里的字母变成可查询、可修改的格子数组。
 * 碰撞检测会问「这一格是不是墙？」
 */
import { TILE, TILE_SIZE } from './constants.js';

const CHAR_TO_TILE = {
  '.': TILE.EMPTY,
  ' ': TILE.EMPTY,
  B: TILE.BRICK,
  b: TILE.BRICK,
  S: TILE.STEEL,
  s: TILE.STEEL,
  H: TILE.BASE,
  P: TILE.EMPTY,
  E: TILE.EMPTY,
};

/**
 * @param {import('./levels.js').TankLevel} levelDef
 */
export function createMapFromLevel(levelDef) {
  const rows = levelDef.grid.length;
  const cols = levelDef.grid[0]?.length || 0;
  /** @type {number[][]} */
  const cells = [];
  /** @type {{ x: number, y: number }[]} */
  const enemySpawns = [];
  let playerSpawn = { x: cols / 2, y: rows - 2 };

  for (let y = 0; y < rows; y++) {
    const row = levelDef.grid[y] || '';
    cells[y] = [];
    for (let x = 0; x < cols; x++) {
      const ch = row[x] || '.';
      if (ch === 'P') {
        playerSpawn = { x: x + 0.5, y: y + 0.5 };
        cells[y][x] = TILE.EMPTY;
      } else if (ch === 'E') {
        enemySpawns.push({ x: x + 0.5, y: y + 0.5 });
        cells[y][x] = TILE.EMPTY;
      } else {
        cells[y][x] = CHAR_TO_TILE[ch] ?? TILE.EMPTY;
      }
    }
  }

  return {
    cols,
    rows,
    cells,
    playerSpawn,
    enemySpawns,
    tileSize: TILE_SIZE,
  };
}

export function tileAt(map, tx, ty) {
  if (ty < 0 || ty >= map.rows || tx < 0 || tx >= map.cols) {
    return TILE.STEEL;
  }
  return map.cells[ty][tx];
}

export function isBlockingTile(tile) {
  return tile === TILE.BRICK || tile === TILE.STEEL || tile === TILE.BASE;
}

/** 把像素坐标换成格子坐标 */
export function worldToTile(x, y, map) {
  return {
    tx: Math.floor(x),
    ty: Math.floor(y),
  };
}

/**
 * 子弹打中墙：砖块变空地，钢块不变
 * @returns {'brick'|'steel'|'empty'|'oob'}
 */
/** 导弹爆炸：半径内砖块清除，钢块保留 */
export function explodeArea(map, centerTx, centerTy, radius = 1) {
  let bricks = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const tx = centerTx + dx;
      const ty = centerTy + dy;
      if (ty < 0 || ty >= map.rows || tx < 0 || tx >= map.cols) continue;
      if (map.cells[ty][tx] === TILE.BRICK) {
        map.cells[ty][tx] = TILE.EMPTY;
        bricks += 1;
      }
    }
  }
  return bricks;
}

export function damageTileAt(map, tx, ty) {
  if (ty < 0 || ty >= map.rows || tx < 0 || tx >= map.cols) return 'oob';
  const t = map.cells[ty][tx];
  if (t === TILE.BRICK) {
    map.cells[ty][tx] = TILE.EMPTY;
    return 'brick';
  }
  if (t === TILE.STEEL) return 'steel';
  if (t === TILE.BASE) {
    map.cells[ty][tx] = TILE.EMPTY;
    return 'base';
  }
  return 'empty';
}

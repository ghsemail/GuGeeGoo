/**
 * BOSS 网格移动：逐格路径、BFS/Dijkstra、砖块射击
 */
import {
  BOSS_SIZE,
  BOSS_SPEED,
  TILE,
  DIR,
  DIR_NAMES,
} from './constants.js';
import { tileAt, damageTileAt } from './map.js';
import { tryMoveTank, tankBodyClearAt } from './collision.js';

/** 2×2 左上角 (tx,ty) → 像素中心（格线交点，对齐碰撞体） */
export function bossCenterFromBlock(tx, ty, tileSize) {
  return {
    x: (tx + 1) * tileSize,
    y: (ty + 1) * tileSize,
    cellX: tx + 1,
    cellY: ty + 1,
  };
}

const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
const EMPTY_STEP_COST = 1;
const ARRIVE_EPS = 1.2;
const PROGRESS_MIN_PX = 10;

export function initBossGridState(boss, map) {
  const ts = map.tileSize;
  const block = pixelToBlockTopLeft(boss.x, boss.y, ts);
  boss.gridTx = block.tx;
  boss.gridTy = block.ty;
  const c = bossCenterFromBlock(boss.gridTx, boss.gridTy, ts);
  boss.x = c.x;
  boss.y = c.y;
  boss.moveCommitDir = null;
  boss.plannedBlock = null;
  boss.atCellCenter = true;
  boss.lastProgressX = boss.x;
  boss.lastProgressY = boss.y;
  boss.progressStuck = 0;
  boss.forceDetour = false;
  boss.breakBrickCd = 0;
}

export function pixelToBlockTopLeft(x, y, ts) {
  return {
    tx: Math.round(x / ts) - 1,
    ty: Math.round(y / ts) - 1,
  };
}

function dirBetween(a, b) {
  const dx = b.tx - a.tx;
  const dy = b.ty - a.ty;
  if (dx === 1 && dy === 0) return 'right';
  if (dx === -1 && dy === 0) return 'left';
  if (dy === 1 && dx === 0) return 'down';
  if (dy === -1 && dx === 0) return 'up';
  return null;
}

function footprintTiles(map, tx, ty) {
  const tiles = [];
  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      tiles.push(tileAt(map, tx + dx, ty + dy));
    }
  }
  return tiles;
}

/** 2×2 落脚格：仅空地可站；砖块由「前方射击」清除，不能作为路径节点 */
export function blockFootprintCost(map, tx, ty) {
  if (tx < 1 || ty < 1 || tx >= map.cols - 2 || ty >= map.rows - 2) {
    return Infinity;
  }
  const tiles = footprintTiles(map, tx, ty);
  if (tiles.some((t) => t === TILE.STEEL || t === TILE.BRICK || t === TILE.BASE)) {
    return Infinity;
  }
  const c = bossCenterFromBlock(tx, ty, map.tileSize);
  if (!tankBodyClearAt(map, c.x, c.y, BOSS_SIZE)) return Infinity;
  return EMPTY_STEP_COST;
}

export function bossBlockHasMoveNeighbor(map, tx, ty) {
  for (const dir of DIR_NAMES) {
    const d = DIR[dir];
    if (blockFootprintCost(map, tx + d.x, ty + d.y) < Infinity) return true;
  }
  return false;
}

function canPlaceFootprint(map, tx, ty) {
  return blockFootprintCost(map, tx, ty) < Infinity;
}

function brickAheadOfFootprint(map, tx, ty, dir) {
  const d = DIR[dir];
  const ts = map.tileSize;
  /** 检查移动方向前沿 2×2 外侧一格 */
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      let cx = tx + j;
      let cy = ty + i;
      cx += d.x * 2;
      cy += d.y * 2;
      if (tileAt(map, cx, cy) === TILE.BRICK) {
        return { tx: cx, ty: cy };
      }
    }
  }
  const c = bossCenterFromBlock(tx, ty, ts);
  const reach = BOSS_SIZE * 0.45 + ts * 0.5;
  const px = c.x + d.x * reach;
  const py = c.y + d.y * reach;
  const btx = Math.floor(px / ts);
  const bty = Math.floor(py / ts);
  if (tileAt(map, btx, bty) === TILE.BRICK) return { tx: btx, ty: bty };
  return null;
}

function steelBlocksLine(map, x0, y0, x1, y1) {
  const ts = map.tileSize;
  const tx0 = Math.floor(x0 / ts);
  const ty0 = Math.floor(y0 / ts);
  const tx1 = Math.floor(x1 / ts);
  const ty1 = Math.floor(y1 / ts);
  if (ty0 === ty1) {
    const lo = Math.min(tx0, tx1);
    const hi = Math.max(tx0, tx1);
    for (let tx = lo + 1; tx < hi; tx++) {
      if (tileAt(map, tx, ty0) === TILE.STEEL) return true;
    }
    return false;
  }
  if (tx0 === tx1) {
    const lo = Math.min(ty0, ty1);
    const hi = Math.max(ty0, ty1);
    for (let ty = lo + 1; ty < hi; ty++) {
      if (tileAt(map, tx0, ty) === TILE.STEEL) return true;
    }
    return false;
  }
  return true;
}

export function hasLineOfFireFromBlock(map, tx, ty, player) {
  const ts = map.tileSize;
  const cx = (tx + 1) * ts;
  const cy = (ty + 1) * ts;
  const alignY = Math.abs(cy - player.y) < ts * 0.55;
  const alignX = Math.abs(cx - player.x) < ts * 0.55;
  if (alignY && !steelBlocksLine(map, cx, cy, player.x, player.y)) return true;
  if (alignX && !steelBlocksLine(map, cx, cy, player.x, player.y)) return true;
  return false;
}

function playerBlockTopLeft(player, ts) {
  return pixelToBlockTopLeft(player.x, player.y, ts);
}

function dijkstraPath(map, start, goalTx, goalTy) {
  const key = (tx, ty) => `${tx},${ty}`;
  /** @type {Map<string, { tx: number, ty: number, cost: number, prev: string | null }>} */
  const dist = new Map();
  const startK = key(start.tx, start.ty);
  dist.set(startK, { tx: start.tx, ty: start.ty, cost: 0, prev: null });
  /** @type {{ tx: number, ty: number }[]} */
  const heap = [{ tx: start.tx, ty: start.ty, cost: 0 }];
  let bestGoal = null;
  let bestCost = Infinity;

  while (heap.length) {
    heap.sort((a, b) => a.cost - b.cost);
    const cur = heap.shift();
    const ck = key(cur.tx, cur.ty);
    const rec = dist.get(ck);
    if (!rec || rec.cost !== cur.cost) continue;

    if (cur.tx === goalTx && cur.ty === goalTy) {
      bestGoal = cur;
      bestCost = cur.cost;
      break;
    }
    const manhattan = Math.abs(cur.tx - goalTx) + Math.abs(cur.ty - goalTy);
    if (manhattan <= 1 && cur.cost < bestCost) {
      bestGoal = cur;
      bestCost = cur.cost;
    }

    for (const dir of DIR_NAMES) {
      const d = DIR[dir];
      const nx = cur.tx + d.x;
      const ny = cur.ty + d.y;
      const stepCost = blockFootprintCost(map, nx, ny);
      if (!Number.isFinite(stepCost)) continue;
      const nc = cur.cost + stepCost;
      const nk = key(nx, ny);
      const old = dist.get(nk);
      if (old && old.cost <= nc) continue;
      dist.set(nk, { tx: nx, ty: ny, cost: nc, prev: ck });
      heap.push({ tx: nx, ty: ny, cost: nc });
    }
  }

  if (!bestGoal) return null;
  /** @type {{ tx: number, ty: number }[]} */
  const path = [];
  let k = key(bestGoal.tx, bestGoal.ty);
  while (k) {
    const node = dist.get(k);
    if (!node) break;
    path.push({ tx: node.tx, ty: node.ty });
    k = node.prev;
  }
  path.reverse();
  return path;
}

function pickGoalBlock(map, player, start) {
  const ts = map.tileSize;
  const pb = playerBlockTopLeft(player, ts);
  /** @type {{ tx: number, ty: number, score: number }[]} */
  const los = [];
  for (let ty = 1; ty < map.rows - 2; ty++) {
    for (let tx = 1; tx < map.cols - 2; tx++) {
      if (!canPlaceFootprint(map, tx, ty)) continue;
      if (hasLineOfFireFromBlock(map, tx, ty, player)) {
        const d = Math.abs(tx - start.tx) + Math.abs(ty - start.ty);
        los.push({ tx, ty, score: -d });
      }
    }
  }
  if (los.length) {
    los.sort((a, b) => b.score - a.score);
    return los[0];
  }
  return { tx: pb.tx, ty: pb.ty };
}

function randomNeighborBlock(map, start, avoidDir) {
  const dirs = DIR_NAMES.slice().sort(() => Math.random() - 0.5);
  for (const dir of dirs) {
    if (avoidDir && dir === OPP[avoidDir]) continue;
    const d = DIR[dir];
    const nx = start.tx + d.x;
    const ny = start.ty + d.y;
    if (canPlaceFootprint(map, nx, ny)) return { tx: nx, ty: ny, dir };
  }
  return null;
}

function replanBossPath(boss, map, player) {
  const start = { tx: boss.gridTx, ty: boss.gridTy };
  if (boss.forceDetour) {
    boss.forceDetour = false;
    const roam = randomNeighborBlock(map, start, boss.moveCommitDir);
    if (roam) {
      boss.plannedBlock = { tx: roam.tx, ty: roam.ty };
      boss.plannedDir = roam.dir;
      return;
    }
  }
  const goal = pickGoalBlock(map, player, start);
  const path = dijkstraPath(map, start, goal.tx, goal.ty);
  if (!path || path.length < 2) {
    const roam = randomNeighborBlock(map, start, boss.moveCommitDir);
    if (roam) {
      boss.plannedBlock = { tx: roam.tx, ty: roam.ty };
      boss.plannedDir = roam.dir;
    } else {
      boss.plannedBlock = null;
      boss.plannedDir = null;
    }
    return;
  }
  let stepIdx = 1;
  let dir = dirBetween(path[0], path[1]);
  if (
    boss.moveCommitDir &&
    dir === OPP[boss.moveCommitDir] &&
    path.length > 2
  ) {
    stepIdx = 2;
    dir = dirBetween(path[0], path[2]);
  }
  boss.plannedBlock = path[stepIdx];
  boss.plannedDir = dir;
}

export function trackBossProgress(boss, dt) {
  const moved = Math.hypot(
    boss.x - boss.lastProgressX,
    boss.y - boss.lastProgressY
  );
  if (moved >= PROGRESS_MIN_PX) {
    boss.lastProgressX = boss.x;
    boss.lastProgressY = boss.y;
    boss.progressStuck = 0;
  } else {
    boss.progressStuck = (boss.progressStuck || 0) + dt;
  }
  if (boss.progressStuck >= 1) {
    boss.forceDetour = true;
    boss.progressStuck = 0;
  }
}

/**
 * @param {object} boss
 * @param {number} dt
 * @param {object} state
 * @param {{ onShootBrick?: () => void }} [hooks]
 */
export function updateBossMovement(boss, dt, state, hooks = {}) {
  const { map, player } = state;
  const ts = map.tileSize;
  boss.breakBrickCd = Math.max(0, (boss.breakBrickCd || 0) - dt);
  trackBossProgress(boss, dt);
  boss.moving = false;

  if (!boss.atCellCenter) {
    moveAlongCommittedCell(boss, map, dt, player);
    return;
  }

  const c = bossCenterFromBlock(boss.gridTx, boss.gridTy, ts);
  boss.x = c.x;
  boss.y = c.y;

  if (!boss.plannedBlock || boss.plannedDir == null) {
    replanBossPath(boss, map, player);
  }

  if (!boss.plannedBlock || !boss.plannedDir) return;

  const brick = brickAheadOfFootprint(
    map,
    boss.gridTx,
    boss.gridTy,
    boss.plannedDir
  );
  if (brick && boss.breakBrickCd <= 0) {
    damageTileAt(map, brick.tx, brick.ty);
    boss.breakBrickCd = 0.28;
    if (hooks.onShootBrick) hooks.onShootBrick();
    replanBossPath(boss, map, player);
    return;
  }

  if (
    boss.plannedBlock.tx === boss.gridTx &&
    boss.plannedBlock.ty === boss.gridTy
  ) {
    replanBossPath(boss, map, player);
    return;
  }

  boss.moveCommitDir = boss.plannedDir;
  boss.commitBlockTx = boss.plannedBlock.tx;
  boss.commitBlockTy = boss.plannedBlock.ty;
  boss.atCellCenter = false;
  boss.cellTarget = bossCenterFromBlock(
    boss.plannedBlock.tx,
    boss.plannedBlock.ty,
    ts
  );
  boss.plannedBlock = null;
  boss.plannedDir = null;
  moveAlongCommittedCell(boss, map, dt, player);
}

function moveAlongCommittedCell(boss, map, dt, player) {
  const ts = map.tileSize;
  const d = DIR[boss.moveCommitDir];
  if (!d || !boss.cellTarget) {
    boss.atCellCenter = true;
    return;
  }
  const target = boss.cellTarget;
  const step = BOSS_SPEED * dt;
  let nx = boss.x + d.x * step;
  let ny = boss.y + d.y * step;

  if (d.x > 0) nx = Math.min(nx, target.x);
  if (d.x < 0) nx = Math.max(nx, target.x);
  if (d.y > 0) ny = Math.min(ny, target.y);
  if (d.y < 0) ny = Math.max(ny, target.y);

  if (tryMoveTank(boss, nx, ny, map)) {
    boss.moving = true;
    boss.dir = boss.moveCommitDir;
  } else {
    const brick = brickAheadOfFootprint(
      map,
      boss.gridTx,
      boss.gridTy,
      boss.moveCommitDir
    );
    if (brick && boss.breakBrickCd <= 0) {
      damageTileAt(map, brick.tx, brick.ty);
      boss.breakBrickCd = 0.28;
    }
    boss.atCellCenter = true;
    boss.forceDetour = true;
    return;
  }

  const dx = Math.abs(boss.x - target.x);
  const dy = Math.abs(boss.y - target.y);
  if (dx <= ARRIVE_EPS && dy <= ARRIVE_EPS) {
    boss.x = target.x;
    boss.y = target.y;
    boss.gridTx = boss.commitBlockTx;
    boss.gridTy = boss.commitBlockTy;
    boss.commitBlockTx = null;
    boss.commitBlockTy = null;
    boss.atCellCenter = true;
    boss.moveCommitDir = null;
    boss.cellTarget = null;
    boss.moving = false;
    replanBossPath(boss, map, player);
  }
}

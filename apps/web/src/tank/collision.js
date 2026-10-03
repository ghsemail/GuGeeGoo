/**
 * 碰撞检测：判断坦克/子弹会不会撞到墙或打到谁。
 * 思路：坦克用「小方块」近似，子弹用「圆点」，去查地图格子或和其他物体距离。
 */
import { isBlockingTile, tileAt, damageTileAt, breakSteelAt } from './map.js';
import { tankAabb } from './entities.js';
import { TILE_SIZE } from './constants.js';

/** 坦克四个角落在哪些格子里，任意一格是墙就不能走 */
function cornersForTank(tank, map) {
  const h = tank.size / 2 - 1;
  const px = tank.x;
  const py = tank.y;
  const ts = map.tileSize;
  return [
    { tx: Math.floor((px - h) / ts), ty: Math.floor((py - h) / ts) },
    { tx: Math.floor((px + h) / ts), ty: Math.floor((py - h) / ts) },
    { tx: Math.floor((px - h) / ts), ty: Math.floor((py + h) / ts) },
    { tx: Math.floor((px + h) / ts), ty: Math.floor((py + h) / ts) },
  ];
}

export function tankHitsWall(tank, map) {
  for (const { tx, ty } of cornersForTank(tank, map)) {
    if (isBlockingTile(tileAt(map, tx, ty))) return true;
  }
  return false;
}

/** BOSS 在 (x,y) 用真实 size 是否不与墙重叠 */
export function tankBodyClearAt(map, x, y, size) {
  return !tankHitsWall({ x, y, size }, map);
}

/** 移动前先试探：如果新位置撞墙就返回 false */
export function tryMoveTank(tank, nx, ny, map) {
  const oldX = tank.x;
  const oldY = tank.y;
  tank.x = nx;
  tank.y = ny;
  if (tankHitsWall(tank, map)) {
    tank.x = oldX;
    tank.y = oldY;
    return false;
  }
  return true;
}

/** 两个坦克是否重叠（简单 AABB） */
export function tanksOverlap(a, b) {
  const ha = a.size / 2;
  const hb = b.size / 2;
  return (
    Math.abs(a.x - b.x) < ha + hb && Math.abs(a.y - b.y) < ha + hb
  );
}

/** 子弹中心落在哪一格 */
function bulletTile(bullet, map) {
  const ts = map.tileSize;
  return {
    tx: Math.floor(bullet.x / ts),
    ty: Math.floor(bullet.y / ts),
  };
}

/**
 * 子弹 vs 地图
 * @returns {'hit'|'none'|'steel'}
 */
export function bulletHitsMap(bullet, map) {
  const { tx, ty } = bulletTile(bullet, map);
  const result = damageTileAt(map, tx, ty);
  if (result === 'brick' || result === 'base') return 'hit';
  if (result === 'steel') {
    if (bullet.pierceSteel && breakSteelAt(map, tx, ty)) return 'hit';
    return 'steel';
  }
  if (result === 'oob') return 'steel';
  return 'none';
}

/** 子弹是否打中某个坦克（圆 vs 方块近似） */
export function bulletHitsTank(bullet, tank) {
  const box = tankAabb(tank);
  const closestX = Math.max(box.left, Math.min(bullet.x, box.right));
  const closestY = Math.max(box.top, Math.min(bullet.y, box.bottom));
  const dx = bullet.x - closestX;
  const dy = bullet.y - closestY;
  return dx * dx + dy * dy <= bullet.radius * bullet.radius;
}

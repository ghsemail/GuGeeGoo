/**
 * 游戏里的「角色」：坦克、子弹
 * 以后加道具、不同敌人类型，可以在这里扩展。
 */
import {
  BULLET_RADIUS,
  BULLET_SPEED,
  ENEMY_FIRE_COOLDOWN,
  ENEMY_SPEED,
  MISSILE_SPEED,
  PLAYER_FIRE_COOLDOWN,
  PLAYER_SPEED,
  TANK_SIZE,
  TILE_SIZE,
  BOSS_SIZE,
} from './constants.js';
import { getBarrelMuzzle } from './tank-geometry.js';

let nextId = 1;

export function createPlayer(spawn) {
  return {
    id: nextId++,
    kind: 'player',
    x: spawn.x * TILE_SIZE,
    y: spawn.y * TILE_SIZE,
    dir: 'up',
    speed: PLAYER_SPEED,
    size: TANK_SIZE,
    lives: 1,
    fireCooldown: 0,
    fireCooldownMax: PLAYER_FIRE_COOLDOWN,
    fireCooldownMaxBase: PLAYER_FIRE_COOLDOWN,
    missileCooldown: 0,
    invuln: 0,
    rapidUntil: 0,
    shieldUntil: 0,
    armorShotsLeft: 0,
    moving: false,
  };
}

export function createEnemy(spawn, index = 0) {
  return {
    id: nextId++,
    kind: 'enemy',
    index,
    x: spawn.x * TILE_SIZE,
    y: spawn.y * TILE_SIZE,
    dir: 'down',
    speed: ENEMY_SPEED,
    size: TANK_SIZE,
    hp: 1,
    fireCooldown: 0.5 + index * 0.3,
    fireCooldownMax: ENEMY_FIRE_COOLDOWN,
    turnTimer: 1,
    moving: true,
  };
}

export function createMissile(tank) {
  const m = getBarrelMuzzle(tank);
  return {
    id: nextId++,
    ownerKind: 'player',
    ownerId: tank.id,
    kind: 'missile',
    x: m.x,
    y: m.y,
    vx: m.dx * MISSILE_SPEED,
    vy: m.dy * MISSILE_SPEED,
    radius: BULLET_RADIUS + 2,
    alive: true,
  };
}

export function createBullet(owner, tank, opts = {}) {
  const m = getBarrelMuzzle(tank);
  const mul = opts.speedMul ?? 1;
  return {
    id: nextId++,
    ownerKind: owner,
    ownerId: tank.id,
    x: m.x,
    y: m.y,
    vx: m.dx * BULLET_SPEED * mul,
    vy: m.dy * BULLET_SPEED * mul,
    radius: opts.radius ?? BULLET_RADIUS,
    pierceSteel: !!opts.pierceSteel,
    effect: opts.effect || null,
    damage: opts.damage ?? 1,
    alive: true,
  };
}

/** BOSS 导弹（略追踪玩家） */
export function createBossMissile(boss, player) {
  const m = getBarrelMuzzle(boss);
  let dx = player.x - boss.x;
  let dy = player.y - boss.y;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  return {
    id: nextId++,
    ownerKind: 'boss',
    ownerId: boss.id,
    kind: 'missile',
    x: m.x,
    y: m.y,
    vx: dx * MISSILE_SPEED * 0.85,
    vy: dy * MISSILE_SPEED * 0.85,
    radius: BULLET_RADIUS + 3,
    alive: true,
    homing: true,
  };
}

/** 把出生点从「格中心 0.5」换成像素中心 */
export function placeTankAtCell(tank, cellX, cellY, tileSize) {
  tank.x = cellX * tileSize;
  tank.y = cellY * tileSize;
}

export function tankAabb(tank) {
  const h = tank.size / 2;
  return {
    left: tank.x - h,
    right: tank.x + h,
    top: tank.y - h,
    bottom: tank.y + h,
  };
}

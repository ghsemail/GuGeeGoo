/**
 * 游戏里的「角色」：坦克、子弹
 * 以后加道具、不同敌人类型，可以在这里扩展。
 */
import {
  BULLET_RADIUS,
  BULLET_SPEED,
  DIR,
  ENEMY_FIRE_COOLDOWN,
  ENEMY_SPEED,
  MISSILE_SPEED,
  PLAYER_FIRE_COOLDOWN,
  PLAYER_SPEED,
  TANK_SIZE,
  TILE_SIZE,
} from './constants.js';

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
    missileCooldown: 0,
    invuln: 0,
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
  const d = DIR[tank.dir];
  const cx = tank.x + (d.x * tank.size) / 2;
  const cy = tank.y + (d.y * tank.size) / 2;
  return {
    id: nextId++,
    ownerKind: 'player',
    ownerId: tank.id,
    kind: 'missile',
    x: cx,
    y: cy,
    vx: d.x * MISSILE_SPEED,
    vy: d.y * MISSILE_SPEED,
    radius: BULLET_RADIUS + 2,
    alive: true,
  };
}

export function createBullet(owner, tank) {
  const d = DIR[tank.dir];
  const cx = tank.x + (d.x * tank.size) / 2;
  const cy = tank.y + (d.y * tank.size) / 2;
  return {
    id: nextId++,
    ownerKind: owner,
    ownerId: tank.id,
    x: cx,
    y: cy,
    vx: d.x * BULLET_SPEED,
    vy: d.y * BULLET_SPEED,
    radius: BULLET_RADIUS,
    alive: true,
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

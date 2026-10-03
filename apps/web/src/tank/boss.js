/**
 * BOSS：出生点、HP、AI 与武器轮换
 */
import {
  BOSS_SPEED,
  BOSS_SIZE,
  BOSS_HP_BY_LEVEL,
  BOSS_REWARD_PER_LEVEL,
  BOSS_FREEZE_FACTOR,
  BULLET_SPEED,
  DIR,
  DIR_NAMES,
} from './constants.js';
import { isBlockingTile, tileAt } from './map.js';
import { tryMoveTank, tankBodyClearAt } from './collision.js';
import { createBullet, createBossMissile } from './entities.js';
import { isEnemyFrozen } from './consumables.js';

/** @param {number} levelId 1-based */
export function bossMaxHp(levelId) {
  return BOSS_HP_BY_LEVEL[levelId - 1] ?? BOSS_HP_BY_LEVEL[0];
}

/** 2×2 左上角 (tx,ty) → 像素中心（格线交点，对齐碰撞体） */
export function bossCenterFromBlock(tx, ty, tileSize) {
  return {
    x: (tx + 1) * tileSize,
    y: (ty + 1) * tileSize,
    cellX: tx + 1,
    cellY: ty + 1,
  };
}

/**
 * @param {import('./map.js').createMapFromLevel extends (...args: any) => infer R ? R : never} map
 * @param {number} [size]
 */
export function bossFitsAt(map, x, y, size = BOSS_SIZE) {
  return tankBodyClearAt(map, x, y, size);
}

function countOpenAround(map, tx, ty, radius = 2) {
  let n = 0;
  for (let dy = -radius; dy <= radius + 1; dy++) {
    for (let dx = -radius; dx <= radius + 1; dx++) {
      const x = tx + dx;
      const y = ty + dy;
      if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) continue;
      if (!isBlockingTile(tileAt(map, x, y))) n += 1;
    }
  }
  return n;
}

function scoreBossSpawn(map, tx, ty) {
  const ts = map.tileSize;
  const center = bossCenterFromBlock(tx, ty, ts);
  const py = Math.floor(map.playerSpawn.y);
  const px = Math.floor(map.playerSpawn.x);

  let avgEy = 0;
  if (map.enemySpawns?.length) {
    avgEy =
      map.enemySpawns.reduce((s, e) => s + Math.floor(e.y), 0) /
      map.enemySpawns.length;
  } else {
    avgEy = map.rows * 0.25;
  }

  const openness = countOpenAround(map, tx, ty, 2);
  const topBias = (map.rows - center.cellY) * 4;
  const enemySideBias = Math.max(0, avgEy - center.cellY) * 2;
  const distPlayer = Math.abs(center.cellX - px) + Math.abs(center.cellY - py);
  const centerBias = -Math.abs(center.cellX - map.cols / 2) * 0.5;

  return (
    topBias + enemySideBias + openness * 3 + centerBias - distPlayer * 0.15
  );
}

/**
 * @param {import('./map.js').createMapFromLevel extends (...args: any) => infer R ? R : never} map
 */
export function findBossSpawn(map) {
  const ts = map.tileSize;
  /** @type {{ tx: number, ty: number, score: number }[]} */
  const candidates = [];

  for (let ty = 1; ty < map.rows - 2; ty++) {
    for (let tx = 1; tx < map.cols - 2; tx++) {
      if (!canPlaceBossAt(map, tx, ty)) continue;
      candidates.push({ tx, ty, score: scoreBossSpawn(map, tx, ty) });
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  const pick = candidates[0];
  return bossCenterFromBlock(pick.tx, pick.ty, ts);
}

function canPlaceBossAt(map, tx, ty) {
  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      const t = tileAt(map, tx + dx, ty + dy);
      if (isBlockingTile(t)) return false;
    }
  }
  const c = bossCenterFromBlock(tx, ty, map.tileSize);
  return bossFitsAt(map, c.x, c.y, BOSS_SIZE);
}

export function createBossEntity(spawn, levelId) {
  const maxHp = bossMaxHp(levelId);
  return {
    id: 9000 + levelId,
    kind: 'boss',
    x: spawn.x,
    y: spawn.y,
    dir: 'down',
    speed: BOSS_SPEED,
    size: BOSS_SIZE,
    hp: maxHp,
    maxHp,
    fireCooldown: 1.2,
    fireCooldownMax: 1.35,
    turnTimer: 0.6,
    moving: false,
    weaponIndex: 0,
    chargeTtl: 0,
    hitFlashTtl: 0,
    aimDir: 'down',
    roamDir: 'down',
    stuckTimer: 0,
  };
}

export function damageBoss(boss, amount, state) {
  if (!boss || boss.hp <= 0) return;
  boss.hp = Math.max(0, boss.hp - amount);
  boss.hitFlashTtl = 0.18;
  if (boss.hp <= 0) {
    onBossDefeated(state);
  }
}

export function onBossDefeated(state) {
  const lv = state.levelDef.id;
  const bonus = BOSS_REWARD_PER_LEVEL * lv;
  state.score += bonus;
  state.bossRewardFlash = 1.8;
  state.bossRewardText = `+${bonus} BOSS 奖励！`;
  for (let i = 0; i < 6; i++) {
    state.explosions.push({
      x: state.boss.x + (Math.random() - 0.5) * 40,
      y: state.boss.y + (Math.random() - 0.5) * 40,
      ttl: 0.5 + Math.random() * 0.3,
    });
  }
  state.boss = null;
  state.lastBossBonus = bonus;
  state.score += state.levelClearBonus ?? 50;
  state.phase = 'win';
}

function dirsTowardPlayer(boss, player) {
  const dx = player.x - boss.x;
  const dy = player.y - boss.y;
  return DIR_NAMES.slice().sort((a, b) => {
    const da = DIR[a];
    const db = DIR[b];
    const dotA = da.x * dx + da.y * dy;
    const dotB = db.x * dx + db.y * dy;
    return dotB - dotA;
  });
}

function moveBossBody(boss, map, dirName, dist) {
  const d = DIR[dirName];
  return tryMoveTank(boss, boss.x + d.x * dist, boss.y + d.y * dist, map);
}

export function updateBossAI(boss, dt, state) {
  const { map, player, bullets, time } = state;
  if (isEnemyFrozen(boss, time)) return;

  boss.hitFlashTtl = Math.max(0, (boss.hitFlashTtl || 0) - dt);
  if (boss.chargeTtl > 0) {
    boss.chargeTtl -= dt;
    if (boss._pendingMissile && boss.chargeTtl <= 0) {
      boss._pendingMissile = false;
      bullets.push(createBossMissile(boss, player));
    }
    return;
  }

  const dx = player.x - boss.x;
  const dy = player.y - boss.y;
  if (Math.abs(dx) > Math.abs(dy)) boss.aimDir = dx > 0 ? 'right' : 'left';
  else boss.aimDir = dy > 0 ? 'down' : 'up';

  const speed = boss.speed * dt;
  const tryOrder = dirsTowardPlayer(boss, player);
  if (boss.stuckTimer > 0.4) {
    boss.roamDir = tryOrder[(boss.weaponIndex + 1) % 4];
    boss.stuckTimer = 0;
  }

  boss.moving = false;
  for (const dir of tryOrder) {
    if (moveBossBody(boss, map, dir, speed)) {
      boss.moving = true;
      boss.dir = dir;
      boss.roamDir = dir;
      boss.stuckTimer = 0;
      break;
    }
  }
  if (!boss.moving) {
    boss.stuckTimer = (boss.stuckTimer || 0) + dt;
    if (moveBossBody(boss, map, boss.roamDir, speed * 0.85)) {
      boss.moving = true;
      boss.dir = boss.roamDir;
    }
  }

  boss.dir = boss.aimDir;

  boss.fireCooldown -= dt;
  if (boss.fireCooldown > 0) return;

  const weapon = boss.weaponIndex % 4;
  boss.weaponIndex += 1;
  boss.fireCooldown = boss.fireCooldownMax + (weapon === 1 ? 0.4 : 0);

  if (weapon === 0) {
    fireBossNormal(boss, bullets, 1);
  } else if (weapon === 1) {
    boss.chargeTtl = 0.65;
    boss._pendingMissile = true;
    return;
  } else if (weapon === 2) {
    fireBossFreeze(boss, bullets);
  } else {
    fireBossSpread(boss, bullets);
  }
}

function fireBossNormal(boss, bullets, speedMul = 1) {
  const saved = boss.dir;
  boss.dir = boss.aimDir;
  const b = createBullet('boss', boss, { speedMul: 1.15 * speedMul });
  boss.dir = saved;
  bullets.push(b);
}

function fireBossFreeze(boss, bullets) {
  const saved = boss.dir;
  boss.dir = boss.aimDir;
  const b = createBullet('boss', boss, { effect: 'freeze', speedMul: 0.95 });
  b.radius = 4;
  boss.dir = saved;
  bullets.push(b);
}

function fireBossSpread(boss, bullets) {
  const base = DIR[boss.aimDir].angle;
  const saved = boss.dir;
  boss.dir = boss.aimDir;
  for (const off of [-0.28, 0, 0.28]) {
    const ang = base + off;
    bullets.push({
      id: Date.now() + Math.random(),
      ownerKind: 'boss',
      ownerId: boss.id,
      x: boss.x + Math.cos(ang) * boss.size * 0.45,
      y: boss.y + Math.sin(ang) * boss.size * 0.45,
      vx: Math.cos(ang) * BULLET_SPEED * 0.9,
      vy: Math.sin(ang) * BULLET_SPEED * 0.9,
      radius: 3,
      alive: true,
    });
  }
  boss.dir = saved;
}

export function applyFreezeToBoss(boss, until, now) {
  const dur = until - now;
  boss.frozenUntil = now + dur * BOSS_FREEZE_FACTOR;
}

export function bossRewardForLevel(levelId) {
  return BOSS_REWARD_PER_LEVEL * levelId;
}

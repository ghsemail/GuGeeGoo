/**
 * 敌方坦克的简单 AI（占位）：随机转向、遇墙转弯、偶尔开火、偶发埋雷。
 */
import {
  DIR_NAMES,
  ENEMY_TURN_MIN,
  ENEMY_TURN_MAX,
} from './constants.js';
import { tryMoveTank } from './collision.js';
import { createBullet } from './entities.js';
import {
  ENEMY_MINE_LAY_CHANCE,
  ENEMY_MINE_LAY_COOLDOWN,
  tryLayEnemyMine,
} from './mines.js';

export function updateEnemyAI(enemy, dt, state) {
  const { map, player, bullets } = state;
  enemy.turnTimer -= dt;
  if (enemy.turnTimer <= 0) {
    enemy.turnTimer =
      ENEMY_TURN_MIN +
      Math.random() * (ENEMY_TURN_MAX - ENEMY_TURN_MIN);
    const options = DIR_NAMES.filter((d) => d !== opposite(enemy.dir));
    enemy.dir = options[Math.floor(Math.random() * options.length)];
  }

  const speed = enemy.speed * dt;
  const d = dirVec(enemy.dir);
  enemy.moving = tryMoveTank(
    enemy,
    enemy.x + d.x * speed,
    enemy.y + d.y * speed,
    map
  );
  if (!enemy.moving) {
    enemy.dir = DIR_NAMES[Math.floor(Math.random() * DIR_NAMES.length)];
    enemy.turnTimer = 0.4;
  }

  enemy.mineLayCd = (enemy.mineLayCd ?? ENEMY_MINE_LAY_COOLDOWN * 0.5) - dt;
  if (
    enemy.moving &&
    enemy.mineLayCd <= 0 &&
    Math.random() < ENEMY_MINE_LAY_CHANCE
  ) {
    if (tryLayEnemyMine(state, enemy)) {
      enemy.mineLayCd = ENEMY_MINE_LAY_COOLDOWN;
    } else {
      enemy.mineLayCd = 1.2;
    }
  }

  enemy.fireCooldown -= dt;
  if (enemy.fireCooldown <= 0) {
    enemy.fireCooldown = enemy.fireCooldownMax;
    if (Math.random() < 0.55) {
      bullets.push(createBullet('enemy', enemy));
    }
  }
}

function dirVec(name) {
  const table = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  return table[name] || table.down;
}

function opposite(dir) {
  const map = { up: 'down', down: 'up', left: 'right', right: 'left' };
  return map[dir] || 'up';
}

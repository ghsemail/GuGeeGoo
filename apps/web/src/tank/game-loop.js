/**
 * 游戏循环：requestAnimationFrame + 固定时间步更新。
 *
 * 什么是游戏循环？
 * 每一帧：先算「过了多少秒」(delta)，再更新位置/碰撞，最后画到 canvas 上。
 * 固定时间步：把一大段 delta 切成很多小步（例如 1/60 秒一步），避免卡顿时穿墙。
 */
import { LOGIC_STEPS_PER_SEC, START_LIVES, SCORE_PER_ENEMY } from './constants.js';
import { getLevel } from './levels.js';
import { createMapFromLevel } from './map.js';
import {
  createPlayer,
  createEnemy,
  createBullet,
  placeTankAtCell,
} from './entities.js';
import { tryMoveTank, bulletHitsMap, bulletHitsTank, tanksOverlap } from './collision.js';
import { updateEnemyAI } from './ai.js';
import { desiredPlayerDir } from './input.js';
import { DIR } from './constants.js';

const STEP = 1 / LOGIC_STEPS_PER_SEC;

export function createGameState(levelIndex) {
  const levelDef = getLevel(levelIndex);
  const map = createMapFromLevel(levelDef);
  const player = createPlayer(map.playerSpawn);
  placeTankAtCell(
    player,
    map.playerSpawn.x,
    map.playerSpawn.y,
    map.tileSize
  );
  player.dir = 'up';

  const enemies = map.enemySpawns.map((s, i) => {
    const e = createEnemy(s, i);
    placeTankAtCell(e, s.x, s.y, map.tileSize);
    return e;
  });

  return {
    levelIndex,
    levelDef,
    map,
    player,
    enemies,
    bullets: [],
    score: 0,
    lives: START_LIVES,
    paused: false,
    phase: 'playing', // playing | win | lose
    accumulator: 0,
  };
}

function movePlayer(state, dt, input) {
  const { player, map } = state;
  const want = desiredPlayerDir(input);
  if (want) player.dir = want;

  const d = DIR[player.dir];
  const speed = player.speed * dt;
  if (want) {
    tryMoveTank(player, player.x + d.x * speed, player.y + d.y * speed, map);
  }

  player.fireCooldown -= dt;
  if (player.invuln > 0) player.invuln -= dt;

  const wantFire = input.fire || input.firePressed;
  if (wantFire && player.fireCooldown <= 0) {
    input.firePressed = false;
    player.fireCooldown = player.fireCooldownMax;
    state.bullets.push(createBullet('player', player));
  }
}

function updateBullets(state, dt) {
  const { map, bullets, player, enemies } = state;
  const ts = map.tileSize;
  const maxX = map.cols * ts;
  const maxY = map.rows * ts;

  for (const b of bullets) {
    if (!b.alive) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (b.x < 0 || b.y < 0 || b.x > maxX || b.y > maxY) {
      b.alive = false;
      continue;
    }

    const mapHit = bulletHitsMap(b, map);
    if (mapHit === 'hit' || mapHit === 'steel') {
      b.alive = false;
      continue;
    }

    if (b.ownerKind === 'player') {
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        if (bulletHitsTank(b, e)) {
          e.hp = 0;
          b.alive = false;
          state.score += SCORE_PER_ENEMY;
          break;
        }
      }
    } else if (b.ownerKind === 'enemy') {
      if (player.invuln <= 0 && bulletHitsTank(b, player)) {
        b.alive = false;
        onPlayerHit(state);
      }
    }
  }

  state.bullets = bullets.filter((b) => b.alive);
  state.enemies = enemies.filter((e) => e.hp > 0);
}

function onPlayerHit(state) {
  state.lives -= 1;
  state.player.invuln = 2;
  if (state.lives <= 0) {
    state.phase = 'lose';
    return;
  }
  const sp = state.map.playerSpawn;
  placeTankAtCell(state.player, sp.x, sp.y, state.map.tileSize);
  state.player.dir = 'up';
}

function resolveTankTank(state) {
  const { player, enemies } = state;
  for (const e of enemies) {
    if (tanksOverlap(player, e)) {
      tryMoveTank(player, player.x - DIR[player.dir].x * 4, player.y - DIR[player.dir].y * 4, state.map);
    }
  }
}

/**
 * 固定时间步：一次 frame 可能跑多步 logic
 */
export function updateGame(state, frameDelta, input) {
  if (state.phase !== 'playing' || state.paused) return;

  state.accumulator += frameDelta;
  let steps = 0;
  while (state.accumulator >= STEP && steps < 5) {
    state.accumulator -= STEP;
    steps += 1;
    stepGame(state, STEP, input);
  }
}

function stepGame(state, dt, input) {
  movePlayer(state, dt, input);
  for (const e of state.enemies) {
    updateEnemyAI(e, dt, state.map, state.player, state.bullets);
  }
  resolveTankTank(state);
  updateBullets(state, dt);

  if (state.enemies.length === 0) {
    state.phase = 'win';
  }
}

export function togglePause(state) {
  if (state.phase !== 'playing') return;
  state.paused = !state.paused;
}

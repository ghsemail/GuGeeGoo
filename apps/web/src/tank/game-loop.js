/**
 * 游戏循环：requestAnimationFrame + 固定时间步更新。
 */
import {
  LOGIC_STEPS_PER_SEC,
  START_LIVES,
  SCORE_ENEMY_NORMAL,
  SCORE_MISSILE_KILL_BONUS,
  SCORE_LEVEL_CLEAR,
  MISSILE_EXPLOSION_RADIUS,
} from './constants.js';
import { getLevel } from './levels.js';
import { createMapFromLevel, explodeArea, isBlockingTile, tileAt } from './map.js';
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
import { getItemCount } from './storage.js';
import { getSelectedItemId } from './inventory-select.js';
import {
  tryUseSelectedItem,
  updateMines,
  syncPlayerBuffs,
  isEnemyFrozen,
  playerFireCooldownMax,
  isPlayerShielded,
} from './consumables.js';

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
    mines: [],
    explosions: [],
    score: 0,
    lives: START_LIVES,
    paused: false,
    phase: 'playing',
    accumulator: 0,
    bgScroll: 0,
    time: 0,
  };
}

function detonateMissile(state, b) {
  const ts = state.map.tileSize;
  const tx = Math.floor(b.x / ts);
  const ty = Math.floor(b.y / ts);
  explodeArea(state.map, tx, ty, MISSILE_EXPLOSION_RADIUS);
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    const etx = Math.floor(e.x / ts);
    const ety = Math.floor(e.y / ts);
    if (
      Math.abs(etx - tx) <= MISSILE_EXPLOSION_RADIUS &&
      Math.abs(ety - ty) <= MISSILE_EXPLOSION_RADIUS
    ) {
      e.hp = 0;
      state.score += SCORE_ENEMY_NORMAL + SCORE_MISSILE_KILL_BONUS;
    }
  }
  state.explosions.push({
    x: b.x,
    y: b.y,
    ttl: 0.35,
  });
  b.alive = false;
}

function tryUseItemInput(state, input) {
  const want = input.useItem || input.useItemPressed;
  if (!want) return;
  input.useItemPressed = false;
  tryUseSelectedItem(state);
}

function movePlayer(state, dt, input) {
  const { player, map } = state;
  syncPlayerBuffs(player, state.time);
  const want = desiredPlayerDir(input);
  if (want) player.dir = want;

  const d = DIR[player.dir];
  const speed = player.speed * dt;
  player.moving = false;
  if (want) {
    player.moving = tryMoveTank(
      player,
      player.x + d.x * speed,
      player.y + d.y * speed,
      map
    );
  }

  player.fireCooldown -= dt;
  player.missileCooldown -= dt;
  if (player.invuln > 0) player.invuln -= dt;

  tryUseItemInput(state, input);

  const wantFire = input.fire || input.firePressed;
  if (wantFire && player.fireCooldown <= 0) {
    input.firePressed = false;
    const cd = playerFireCooldownMax(player, state.time);
    player.fireCooldown = cd;
    const pierce = player.armorShotsLeft > 0;
    if (pierce) player.armorShotsLeft -= 1;
    state.bullets.push(
      createBullet('player', player, { pierceSteel: pierce })
    );
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
      if (b.kind === 'missile') detonateMissile(state, b);
      else b.alive = false;
      continue;
    }

    if (b.kind === 'missile') {
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        if (bulletHitsTank(b, e)) {
          detonateMissile(state, b);
          break;
        }
      }
      if (!b.alive) continue;
      const tx = Math.floor(b.x / ts);
      const ty = Math.floor(b.y / ts);
      if (isBlockingTile(tileAt(map, tx, ty))) {
        detonateMissile(state, b);
        continue;
      }
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
          state.score += SCORE_ENEMY_NORMAL;
          break;
        }
      }
    } else if (b.ownerKind === 'enemy') {
      if (
        player.invuln <= 0 &&
        !isPlayerShielded(player, state.time) &&
        bulletHitsTank(b, player)
      ) {
        b.alive = false;
        onPlayerHit(state);
      }
    }
  }

  state.bullets = bullets.filter((b) => b.alive);
  state.enemies = enemies.filter((e) => e.hp > 0);
  state.explosions = (state.explosions || [])
    .map((ex) => ({ ...ex, ttl: ex.ttl - dt }))
    .filter((ex) => ex.ttl > 0);
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
      tryMoveTank(
        player,
        player.x - DIR[player.dir].x * 4,
        player.y - DIR[player.dir].y * 4,
        state.map
      );
    }
  }
}

export function updateGame(state, frameDelta, input) {
  if (state.phase !== 'playing' || state.paused) return;

  state.time += frameDelta;
  state.accumulator += frameDelta;
  let steps = 0;
  while (state.accumulator >= STEP && steps < 5) {
    state.accumulator -= STEP;
    steps += 1;
    stepGame(state, STEP, input);
  }
}

function stepGame(state, dt, input) {
  if (state.phase !== 'playing') return;
  movePlayer(state, dt, input);
  for (const e of state.enemies) {
    if (!isEnemyFrozen(e, state.time)) {
      updateEnemyAI(e, dt, state.map, state.player, state.bullets);
    }
  }
  resolveTankTank(state);
  updateMines(state);
  updateBullets(state, dt);

  if (state.enemies.length === 0) {
    state.score += SCORE_LEVEL_CLEAR;
    state.phase = 'win';
  }
}

export function getSelectedItemCount() {
  return getItemCount(getSelectedItemId());
}

export function togglePause(state) {
  if (state.phase !== 'playing') return;
  state.paused = !state.paused;
}

/** @deprecated use getSelectedItemCount */
export function getMissileCount() {
  return getItemCount('item_missile');
}

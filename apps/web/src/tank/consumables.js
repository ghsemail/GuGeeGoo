/**
 * 道具使用与对局内效果
 */
import {
  MISSILE_COOLDOWN_SEC,
  MAX_LIVES,
  SCORE_ENEMY_NORMAL,
  SCORE_MISSILE_KILL_BONUS,
} from './constants.js';
import { DIR } from './constants.js';
import { createMissile } from './entities.js';
import { explodeArea } from './map.js';
import { tanksOverlap } from './collision.js';
import { consumeInventoryItem, getItemCount } from './storage.js';
import { getSelectedItemId } from './inventory-select.js';
import { getShopItem } from './items.js';

function oppositeDir(d) {
  return { up: 'down', down: 'up', left: 'right', right: 'left' }[d] || 'down';
}

function detonateAt(state, cx, cy, radius = 1) {
  const ts = state.map.tileSize;
  const tx = Math.floor(cx / ts);
  const ty = Math.floor(cy / ts);
  explodeArea(state.map, tx, ty, radius);
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    const etx = Math.floor(e.x / ts);
    const ety = Math.floor(e.y / ts);
    if (Math.abs(etx - tx) <= radius && Math.abs(ety - ty) <= radius) {
      e.hp = 0;
      state.score += SCORE_ENEMY_NORMAL + SCORE_MISSILE_KILL_BONUS;
    }
  }
  state.explosions.push({ x: cx, y: cy, ttl: 0.35 });
}

function useMissile(state) {
  const p = state.player;
  if (p.missileCooldown > 0) return false;
  if (!consumeInventoryItem('item_missile')) return false;
  p.missileCooldown = MISSILE_COOLDOWN_SEC;
  state.bullets.push(createMissile(p));
  return true;
}

function useMine(state) {
  if (!consumeInventoryItem('item_mine')) return false;
  const p = state.player;
  const ts = state.map.tileSize;
  const back = DIR[oppositeDir(p.dir)];
  const tx = Math.floor((p.x - back.x * ts * 0.55) / ts);
  const ty = Math.floor((p.y - back.y * ts * 0.55) / ts);
  state.mines.push({
    tx,
    ty,
    x: (tx + 0.5) * ts,
    y: (ty + 0.5) * ts,
    alive: true,
  });
  return true;
}

function useRapid(state) {
  if (!consumeInventoryItem('item_rapid')) return false;
  state.player.rapidUntil = state.time + 8;
  return true;
}

function useShield(state) {
  if (!consumeInventoryItem('item_shield')) return false;
  state.player.shieldUntil = state.time + 6;
  return true;
}

function useFreeze(state) {
  if (!consumeInventoryItem('item_freeze')) return false;
  const until = state.time + 4;
  for (const e of state.enemies) {
    e.frozenUntil = until;
  }
  return true;
}

function useLife(state) {
  if (state.lives >= MAX_LIVES) return false;
  if (!consumeInventoryItem('item_life')) return false;
  state.lives += 1;
  return true;
}

function useArmor(state) {
  if (!consumeInventoryItem('item_armor')) return false;
  state.player.armorShotsLeft = (state.player.armorShotsLeft || 0) + 5;
  return true;
}

const HANDLERS = {
  missile: useMissile,
  mine: useMine,
  rapid: useRapid,
  shield: useShield,
  freeze: useFreeze,
  life: useLife,
  armor: useArmor,
};

export function tryUseSelectedItem(state) {
  const id = getSelectedItemId();
  const item = getShopItem(id);
  if (!item || getItemCount(id) <= 0) return false;
  const fn = HANDLERS[item.useKind];
  return fn ? fn(state) : false;
}

export function updateMines(state) {
  const ts = state.map.tileSize;
  for (const m of state.mines) {
    if (!m.alive) continue;
    for (const e of state.enemies) {
      if (e.hp <= 0) continue;
      if (tanksOverlap({ x: m.x, y: m.y, size: ts * 0.35 }, e)) {
        m.alive = false;
        detonateAt(state, m.x, m.y, 1);
        break;
      }
    }
  }
  state.mines = state.mines.filter((m) => m.alive);
}

export function syncPlayerBuffs(player, time) {
  if (player.rapidUntil && time >= player.rapidUntil) player.rapidUntil = 0;
  if (player.shieldUntil && time >= player.shieldUntil) player.shieldUntil = 0;
}

export function isEnemyFrozen(enemy, time) {
  return enemy.frozenUntil && time < enemy.frozenUntil;
}

export function playerFireCooldownMax(player, time) {
  if (player.rapidUntil && time < player.rapidUntil) return 0.12;
  return player.fireCooldownMaxBase;
}

export function isPlayerShielded(player, time) {
  return player.shieldUntil && time < player.shieldUntil;
}

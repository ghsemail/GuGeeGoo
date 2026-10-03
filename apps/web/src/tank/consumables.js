/**
 * 道具使用与对局内效果
 */
import {
  MISSILE_COOLDOWN_SEC,
  MAX_LIVES,
  SCORE_ENEMY_NORMAL,
  SCORE_MISSILE_KILL_BONUS,
  BOSS_MINE_DAMAGE,
} from './constants.js';
import { damageBoss, applyFreezeToBoss } from './boss.js';
import { createMissile } from './entities.js';
import { explodeArea } from './map.js';
import { consumeInventoryItem, getItemCount } from './storage.js';
import { getSelectedItemId } from './inventory-select.js';
import { getShopItem, SHOP_ITEMS } from './items.js';
import { createPlayerMine, mineHitRadius, tankHitsMine } from './mines.js';
import { hurtPlayer } from './player-life.js';
import { tryDropPickupFromEnemy } from './pickups.js';

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
      if (e.hp > 0) tryDropPickupFromEnemy(state, e);
      e.hp = 0;
      state.score += SCORE_ENEMY_NORMAL + SCORE_MISSILE_KILL_BONUS;
    }
  }
  if (state.boss) {
    const bx = Math.floor(state.boss.x / ts);
    const by = Math.floor(state.boss.y / ts);
    if (Math.abs(bx - tx) <= radius + 1 && Math.abs(by - ty) <= radius + 1) {
      damageBoss(state.boss, BOSS_MINE_DAMAGE, state);
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
  createPlayerMine(state, state.player);
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
  if (state.boss) {
    applyFreezeToBoss(state.boss, until, state.time);
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

export function tryUseItemById(state, itemId) {
  const item = getShopItem(itemId);
  if (!item || getItemCount(itemId) <= 0) return false;
  const fn = HANDLERS[item.useKind];
  return fn ? fn(state) : false;
}

export function tryUseItemByIndex(state, oneBased) {
  const item = SHOP_ITEMS?.[oneBased - 1];
  if (!item) return false;
  return tryUseItemById(state, item.id);
}

export function tryUseSelectedItem(state) {
  return tryUseItemById(state, getSelectedItemId());
}

export function updateMines(state) {
  const ts = state.map.tileSize;
  const player = state.player;
  for (const m of state.mines) {
    if (!m.alive) continue;
    const faction = m.faction === 'enemy' ? 'enemy' : 'player';
    if (faction === 'player') {
      for (const e of state.enemies) {
        if (e.hp <= 0) continue;
        if (tankHitsMine(e, m, ts)) {
          m.alive = false;
          detonateAt(state, m.x, m.y, 1);
          break;
        }
      }
      if (m.alive && state.boss && tankHitsMine(state.boss, m, ts)) {
        m.alive = false;
        detonateAt(state, m.x, m.y, 1);
      }
    } else if (
      tankHitsMine(player, m, ts) &&
      player.invuln <= 0 &&
      !isPlayerShielded(player, state.time)
    ) {
      m.alive = false;
      state.explosions.push({ x: m.x, y: m.y, ttl: 0.4 });
      hurtPlayer(state);
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

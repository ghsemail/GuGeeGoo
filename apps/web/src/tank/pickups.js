/**
 * 战场拾取：敌人掉落、定时刷新、收集入武器库
 */
import { TILE } from './constants.js';
import { tileAt, isBlockingTile } from './map.js';
import { tankBodyClearAt } from './collision.js';
import { tanksOverlap } from './collision.js';
import { addInventoryItem, getItemCount } from './storage.js';
import { getShopItem } from './items.js';

export const PICKUP_ITEM_IDS = ['item_missile', 'item_mine', 'item_freeze'];
export const PICKUP_SPAWN_INTERVAL_SEC = 20;
export const PICKUP_MAX_ON_MAP = 2;
export const PICKUP_LIFETIME_SEC = 12;
export const ENEMY_PICKUP_DROP_CHANCE = 0.25;

const PICKUP_HIT_SIZE = 18;

function randomPickupItemId() {
  const id = PICKUP_ITEM_IDS[Math.floor(Math.random() * PICKUP_ITEM_IDS.length)];
  return id;
}

function pickupLabel(itemId) {
  return getShopItem(itemId)?.name || '道具';
}

function countPickups(state) {
  return (state.pickups || []).length;
}

function tileClearForPickup(map, tx, ty) {
  if (isBlockingTile(tileAt(map, tx, ty))) return false;
  const ts = map.tileSize;
  const cx = (tx + 0.5) * ts;
  const cy = (ty + 0.5) * ts;
  return tankBodyClearAt(map, cx, cy, ts * 0.85);
}

function findRandomPickupCell(map) {
  const candidates = [];
  for (let ty = 1; ty < map.rows - 1; ty++) {
    for (let tx = 1; tx < map.cols - 1; tx++) {
      if (tileAt(map, tx, ty) !== TILE.EMPTY) continue;
      if (tileClearForPickup(map, tx, ty)) candidates.push({ tx, ty });
    }
  }
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function spawnPickupAt(state, tx, ty, itemId) {
  const item = getShopItem(itemId);
  if (!item) return false;
  if (countPickups(state) >= PICKUP_MAX_ON_MAP) return false;
  const ts = state.map.tileSize;
  if (!tileClearForPickup(state.map, tx, ty)) return false;
  state.pickups.push({
    itemId,
    x: (tx + 0.5) * ts,
    y: (ty + 0.5) * ts,
    ttl: PICKUP_LIFETIME_SEC,
  });
  return true;
}

export function tryDropPickupFromEnemy(state, enemy) {
  if (Math.random() >= ENEMY_PICKUP_DROP_CHANCE) return;
  if (countPickups(state) >= PICKUP_MAX_ON_MAP) return;
  const ts = state.map.tileSize;
  const tx = Math.floor(enemy.x / ts);
  const ty = Math.floor(enemy.y / ts);
  spawnPickupAt(state, tx, ty, randomPickupItemId());
}

export function pushFloatText(state, x, y, text) {
  if (!state.floatTexts) state.floatTexts = [];
  state.floatTexts.push({ x, y, text, ttl: 1.15, vy: -32 });
}

function collectPickup(state, p) {
  const item = getShopItem(p.itemId);
  if (!item) return;
  const before = getItemCount(p.itemId);
  addInventoryItem(p.itemId, 1);
  const after = getItemCount(p.itemId);
  if (after > before) {
    pushFloatText(state, p.x, p.y - 8, `+1 ${pickupLabel(p.itemId)}`);
  } else {
    pushFloatText(state, p.x, p.y - 8, '武器库已满');
  }
}

export function updatePickups(state, dt) {
  if (!state.pickups) state.pickups = [];
  state.pickupSpawnTimer = (state.pickupSpawnTimer || 0) + dt;
  if (
    state.pickupSpawnTimer >= PICKUP_SPAWN_INTERVAL_SEC &&
    countPickups(state) < PICKUP_MAX_ON_MAP
  ) {
    state.pickupSpawnTimer = 0;
    const cell = findRandomPickupCell(state.map);
    if (cell) spawnPickupAt(state, cell.tx, cell.ty, randomPickupItemId());
  }

  const player = state.player;
  const hitBox = { x: player.x, y: player.y, size: PICKUP_HIT_SIZE };

  state.pickups = state.pickups.filter((p) => {
    p.ttl -= dt;
    if (p.ttl <= 0) return false;
    if (tanksOverlap(hitBox, { x: p.x, y: p.y, size: PICKUP_HIT_SIZE })) {
      collectPickup(state, p);
      return false;
    }
    return true;
  });

  if (state.floatTexts) {
    for (const f of state.floatTexts) {
      f.ttl -= dt;
      f.y += f.vy * dt;
    }
    state.floatTexts = state.floatTexts.filter((f) => f.ttl > 0);
  }
}

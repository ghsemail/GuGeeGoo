/**
 * 道具商店：兑换、装备、下关携带
 */
import { ITEMS, getItemById, isCosmetic, isConsumable } from './items.js';
import {
  getSpendableBalance,
  getItemCount,
  addInventoryItem,
  toggleEquippedCosmetic,
  toggleLoadoutConsumable,
  getEquippedCosmeticIds,
  getLoadoutIds,
  spendPoints,
  persistWallet,
} from './storage.js';

export { ITEMS };

export function canRedeemItem(itemId) {
  const item = getItemById(itemId);
  if (!item) return { ok: false, reason: 'unknown' };
  if (isCosmetic(item) && getItemCount(itemId) >= 1) {
    return { ok: false, reason: 'owned' };
  }
  if (isConsumable(item)) {
    const max = item.maxStack ?? 20;
    if (getItemCount(itemId) >= max) {
      return { ok: false, reason: 'full' };
    }
  }
  if (getSpendableBalance() < item.price) {
    return { ok: false, reason: 'insufficient' };
  }
  return { ok: true, item };
}

export async function redeemItem(itemId) {
  const check = canRedeemItem(itemId);
  if (!check.ok) return check;

  const spend = spendPoints(check.item.price);
  if (!spend.ok) return spend;

  addInventoryItem(itemId, 1);
  if (isCosmetic(check.item)) {
    const equipped = getEquippedCosmeticIds();
    if (!equipped.includes(itemId)) {
      toggleEquippedCosmetic(itemId);
    }
  }

  await persistWallet();
  return { ok: true, item: check.item, wallet: spend };
}

export async function equipToggle(itemId) {
  const item = getItemById(itemId);
  if (!item || !isCosmetic(item) || getItemCount(itemId) < 1) {
    return { ok: false, reason: 'not_owned' };
  }
  toggleEquippedCosmetic(itemId);
  await persistWallet();
  return { ok: true, equipped: getEquippedCosmeticIds() };
}

export async function toggleLoadout(itemId) {
  const item = getItemById(itemId);
  if (!item || !isConsumable(item) || getItemCount(itemId) < 1) {
    return { ok: false, reason: 'not_owned' };
  }
  const next = toggleLoadoutConsumable(itemId);
  await persistWallet();
  return { ok: true, loadout: next };
}

export function getShopItemState(itemId) {
  const item = getItemById(itemId);
  if (!item) return null;
  const count = getItemCount(itemId);
  const equipped = getEquippedCosmeticIds().includes(itemId);
  const inLoadout = getLoadoutIds().includes(itemId);
  return { item, count, equipped, inLoadout };
}

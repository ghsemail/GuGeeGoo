import { getShopItem, SHOP_ITEMS } from './items.js';
import {
  getSpendableBalance,
  getItemCount,
  addInventoryItem,
  spendPoints,
} from './storage.js';

export { SHOP_ITEMS };

export function canBuyItem(itemId) {
  const item = getShopItem(itemId);
  if (!item) return { ok: false, reason: 'unknown' };
  const count = getItemCount(itemId);
  if (count >= item.maxStack) return { ok: false, reason: 'full' };
  if (getSpendableBalance() < item.price) {
    return { ok: false, reason: 'insufficient' };
  }
  return { ok: true, item };
}

export function buyItem(itemId) {
  const check = canBuyItem(itemId);
  if (!check.ok) return check;
  const spend = spendPoints(check.item.price);
  if (!spend.ok) return spend;
  addInventoryItem(itemId, 1);
  return { ok: true, item: check.item, count: getItemCount(itemId) };
}

export function getShopItemState(itemId) {
  const item = getShopItem(itemId);
  if (!item) return null;
  return {
    item,
    count: getItemCount(itemId),
    canBuy: canBuyItem(itemId),
  };
}

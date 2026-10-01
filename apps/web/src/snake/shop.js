/**
 * 道具商店：兑换与占位逻辑
 */
import { ITEMS, getItemById } from './items.js';
import {
  getSpendableBalance,
  getOwnedItemIds,
  spendPoints,
  recordOwnedItem,
  persistWallet,
} from './storage.js';

export { ITEMS };

export function canRedeemItem(itemId) {
  const item = getItemById(itemId);
  if (!item) return { ok: false, reason: 'unknown' };
  if (item.placeholder) return { ok: false, reason: 'placeholder' };
  if (getOwnedItemIds().includes(itemId)) {
    return { ok: false, reason: 'owned' };
  }
  if (getSpendableBalance() < item.price) {
    return { ok: false, reason: 'insufficient' };
  }
  return { ok: true, item };
}

/** 兑换道具（占位商品不可兑换；真道具将来走同一入口） */
export async function redeemItem(itemId) {
  const check = canRedeemItem(itemId);
  if (!check.ok) return check;

  const spend = spendPoints(check.item.price);
  if (!spend.ok) return spend;

  recordOwnedItem(itemId);
  await persistWallet();
  return { ok: true, item: check.item, wallet: spend };
}

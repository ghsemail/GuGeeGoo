/**
 * 道具商店配置。以后要加真道具：在这里加条目并实现 apply。
 */

/** @typedef {{ id: string, name: string, description: string, price: number, emoji: string, placeholder?: boolean, apply?: (state: object) => object }} ShopItem */

/** @type {ShopItem[]} */
export const ITEMS = [
  {
    id: 'skin_rainbow',
    name: '彩虹蛇皮肤',
    emoji: '🌈',
    description: '敬请期待 — 以后让蛇变成彩虹色！',
    price: 500,
    placeholder: true,
  },
  {
    id: 'power_slow',
    name: '慢速糖果',
    emoji: '🍬',
    description: '敬请期待 — 下一关开始时短暂变慢。',
    price: 300,
    placeholder: true,
  },
  {
    id: 'power_shield',
    name: '护盾气泡',
    emoji: '🫧',
    description: '敬请期待 — 多一次撞墙保护。',
    price: 800,
    placeholder: true,
  },
];

export function getItemById(id) {
  return ITEMS.find((item) => item.id === id);
}

/**
 * 开局或进入关卡时应用已拥有道具（占位道具暂无效果）
 * @param {object} gameState
 * @param {string[]} ownedIds
 */
export function applyOwnedItems(gameState, ownedIds) {
  let next = gameState;
  for (const id of ownedIds) {
    const item = getItemById(id);
    if (item?.apply && !item.placeholder) {
      next = item.apply(next) ?? next;
    }
  }
  return next;
}

/**
 * 单个道具效果（供将来在关卡内主动使用）
 */
export function applyItem(itemId, gameState) {
  const item = getItemById(itemId);
  if (!item?.apply || item.placeholder) return gameState;
  return item.apply(gameState) ?? gameState;
}

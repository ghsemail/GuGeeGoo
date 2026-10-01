/**
 * 道具商店配置
 * type: cosmetic（永久，可装备）| consumable（消耗品，可叠数量）
 */

/** @typedef {'cosmetic' | 'consumable'} ItemType */

/**
 * @typedef {object} ShopItem
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {number} price
 * @property {string} emoji
 * @property {ItemType} type
 * @property {number} [maxStack]
 */

/** @type {ShopItem[]} */
export const ITEMS = [
  {
    id: 'skin_rainbow',
    name: '彩虹蛇皮肤',
    emoji: '🌈',
    type: 'cosmetic',
    description: '永久：蛇身变成彩虹色（可在商店装备/卸下）。',
    price: 400,
    maxStack: 1,
  },
  {
    id: 'cosmetic_hat',
    name: '派对帽',
    emoji: '🎩',
    type: 'cosmetic',
    description: '永久：蛇头上多一顶小帽子（可装备/卸下）。',
    price: 350,
    maxStack: 1,
  },
  {
    id: 'power_slow',
    name: '慢速糖果',
    emoji: '🍬',
    type: 'consumable',
    description: '下一关整关变慢，更容易转弯（兑换后点「下关使用」）。',
    price: 90,
    maxStack: 20,
  },
  {
    id: 'power_shield',
    name: '护盾气泡',
    emoji: '🫧',
    type: 'consumable',
    description: '下关多一次保护：撞墙或石头时不输，护盾消失。',
    price: 120,
    maxStack: 20,
  },
  {
    id: 'power_magnet',
    name: '苹果磁铁',
    emoji: '🧲',
    type: 'consumable',
    description: '下关苹果会朝你慢慢靠近（同一条直线时）。',
    price: 100,
    maxStack: 20,
  },
  {
    id: 'power_double',
    name: '双倍积分',
    emoji: '✨',
    type: 'consumable',
    description: '下关吃苹果和过关奖励分数 ×2。',
    price: 130,
    maxStack: 20,
  },
  {
    id: 'power_ghost',
    name: '幽灵斗篷',
    emoji: '👻',
    type: 'consumable',
    description: '下关开始约 6 秒可穿过石头（仍不能撞墙和身体）。',
    price: 150,
    maxStack: 20,
  },
];

export function getItemById(id) {
  return ITEMS.find((item) => item.id === id);
}

export function isCosmetic(item) {
  return item?.type === 'cosmetic';
}

export function isConsumable(item) {
  return item?.type === 'consumable';
}

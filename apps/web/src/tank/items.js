/**
 * 坦克道具商店配置（以后加新道具在这里加一条）
 */

/** @typedef {{ id: string, name: string, description: string, price: number, emoji: string, maxStack: number }} TankShopItem */

/** @type {TankShopItem[]} */
export const SHOP_ITEMS = [
  {
    id: 'item_missile',
    name: '导弹',
    emoji: '🚀',
    description:
      '对局里按 K 发射（或点「导弹」钮）。爆炸打掉一小片砖墙，可一发击毁敌人；钢墙打不动。最多囤 8 枚。',
    price: 85,
    maxStack: 8,
  },
];

export function getShopItem(id) {
  return SHOP_ITEMS.find((i) => i.id === id);
}

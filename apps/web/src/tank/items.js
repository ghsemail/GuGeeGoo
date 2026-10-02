/**
 * 坦克道具商店配置
 */

/** @typedef {{ id: string, name: string, description: string, price: number, emoji: string, maxStack: number, useKind: string }} TankShopItem */

/** @type {TankShopItem[]} */
export const SHOP_ITEMS = [
  {
    id: 'item_missile',
    name: '导弹',
    emoji: '🚀',
    useKind: 'missile',
    description:
      '发射一枚导弹，爆炸清除周围砖墙并重创敌人；钢墙打不动。对局里按 L 或「使用」键。',
    price: 85,
    maxStack: 8,
  },
  {
    id: 'item_mine',
    name: '地雷',
    emoji: '💣',
    useKind: 'mine',
    description: '在坦克身后埋一颗地雷，敌人压上去会爆炸（只伤敌人）。最多囤 6 颗。',
    price: 55,
    maxStack: 6,
  },
  {
    id: 'item_rapid',
    name: '闪电连发',
    emoji: '⚡',
    useKind: 'rapid',
    description: '8 秒内普通炮弹连发，冷却超短！一次购买立即生效。',
    price: 70,
    maxStack: 5,
  },
  {
    id: 'item_shield',
    name: '能量护盾',
    emoji: '🛡️',
    useKind: 'shield',
    description: '6 秒内免疫敌方炮弹（撞墙照常）。一次购买立即生效。',
    price: 75,
    maxStack: 5,
  },
  {
    id: 'item_freeze',
    name: '冰冻弹',
    emoji: '❄️',
    useKind: 'freeze',
    description: '冰冻所有敌人约 4 秒，它们不能动也不能开火。',
    price: 90,
    maxStack: 4,
  },
  {
    id: 'item_life',
    name: '加命包',
    emoji: '❤️',
    useKind: 'life',
    description: '立刻增加 1 条命（最多 5 条）。',
    price: 120,
    maxStack: 3,
  },
  {
    id: 'item_armor',
    name: '穿甲弹匣',
    emoji: '🔥',
    useKind: 'armor',
    description: '接下来 5 发炮弹可以打穿钢墙！',
    price: 65,
    maxStack: 6,
  },
];

export function getShopItem(id) {
  return SHOP_ITEMS.find((i) => i.id === id);
}

export function getUseKind(itemId) {
  return getShopItem(itemId)?.useKind || '';
}

/**
 * 武器配置（在武器库购买，进关前装备）
 */

export const WEAPONS = [
  {
    id: 'weapon_sling',
    name: '弹弓',
    emoji: '🪨',
    description: '打坏一块固定石头（每关有限子弹）。',
    price: 0,
    ammoPerLevel: 5,
    cooldownTicks: 4,
    kind: 'break_one',
  },
  {
    id: 'weapon_freeze',
    name: '冰冻枪',
    emoji: '❄️',
    description: '冻住移动石头约 3 秒，它暂时不动。',
    price: 220,
    ammoPerLevel: 4,
    cooldownTicks: 6,
    kind: 'freeze_mover',
    freezeTicks: 14,
  },
  {
    id: 'weapon_rocket',
    name: '火箭炮',
    emoji: '🚀',
    description: '朝一个方向飞，直线打碎路上的固定石头（不能打穿外墙）。',
    price: 380,
    ammoPerLevel: 3,
    cooldownTicks: 8,
    kind: 'pierce_line',
  },
  {
    id: 'weapon_plane',
    name: '飞机',
    emoji: '✈️',
    description:
      '召唤小飞机沿你朝向的那一行或一列飞过，经过的固定石头都会被炸掉（每关 2 次）。',
    price: 520,
    ammoPerLevel: 2,
    cooldownTicks: 14,
    kind: 'air_strike',
  },
  {
    id: 'weapon_tank',
    name: '小坦克',
    emoji: '🚜',
    description:
      '在蛇旁边召唤小坦克约 4 秒，自动朝蛇头方向帮你看前方向上的石头（每关 2 次）。',
    price: 450,
    ammoPerLevel: 2,
    cooldownTicks: 10,
    kind: 'tank_buddy',
    buddyTicks: 48,
  },
];

export const DEFAULT_WEAPON_ID = 'weapon_sling';

export function getWeapon(id) {
  return WEAPONS.find((w) => w.id === id) || WEAPONS[0];
}

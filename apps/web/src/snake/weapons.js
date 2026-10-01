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
];

export const DEFAULT_WEAPON_ID = 'weapon_sling';

export function getWeapon(id) {
  return WEAPONS.find((w) => w.id === id) || WEAPONS[0];
}

/**
 * 导航页游戏列表：以后要加新游戏，在这里加一条即可。
 */

/** @typedef {{ id: string, title: string, emoji: string, href: string, description: string, statKeys?: { best: string, level: string } }} GameEntry */

/** @type {GameEntry[]} */
export const GAMES = [
  {
    id: 'snake',
    title: '贪吃蛇',
    emoji: '🐍',
    href: '/snake/',
    description:
      '15 关自由选关，积分换道具和武器，圆头蛇闯关——键盘、滑动或十字键都行！',
    statKeys: {
      best: 'gugeegoo_snake_best_score',
      level: 'gugeegoo_snake_max_level',
      lifetime: 'gugeegoo_snake_lifetime_earned',
    },
  },
  {
    id: 'tank',
    title: '坦克大战',
    emoji: '🛡️',
    href: '/tank/',
    description: '驾驶坦克保护基地、击毁敌人！框架已可玩，关卡和道具会陆续加入。',
    statKeys: {
      best: 'gugeegoo_tank_best_score',
      lifetime: 'gugeegoo_tank_lifetime_earned',
    },
  },
  {
    id: 'whack',
    title: '打地鼠',
    emoji: '🔨',
    href: '/whack/',
    description: '60 秒敲地鼠！⭐ 加分、💣 小心，分数高了格子变多。',
    statKeys: {
      best: 'gugeegoo_whack_best_score',
      lifetime: 'gugeegoo_whack_lifetime_earned',
    },
  },
  {
    id: 'breakout',
    title: '打砖块',
    emoji: '🧱',
    href: '/breakout/',
    description: '五关砖块、道具掉落，手指拖挡板或键盘 A/D 都行。',
    statKeys: {
      best: 'gugeegoo_breakout_best_score',
      lifetime: 'gugeegoo_breakout_lifetime_earned',
    },
  },
  {
    id: '2048',
    title: '2048',
    emoji: '🔢',
    href: '/2048/',
    description: '滑动合并数字，冲到 2048！每局可撤销一步。',
    statKeys: {
      best: 'gugeegoo_2048_best_score',
      lifetime: 'gugeegoo_2048_lifetime_earned',
    },
  },
];

/** 从 localStorage 读取某游戏的本地最高分与最高关卡（导航页展示用） */
export function readLocalGameStats(game) {
  if (!game.statKeys) {
    return { bestScore: null, maxLevel: null, lifetime: null };
  }
  const bestRaw = localStorage.getItem(game.statKeys.best);
  const levelRaw = localStorage.getItem(game.statKeys.level);
  const lifeRaw = game.statKeys.lifetime
    ? localStorage.getItem(game.statKeys.lifetime)
    : null;
  const bestScore = bestRaw ? Number(bestRaw) || 0 : 0;
  const maxLevel = levelRaw ? Number(levelRaw) || 1 : 1;
  const lifetime = lifeRaw ? Number(lifeRaw) || 0 : 0;
  const hasPlayed = bestRaw != null || levelRaw != null || lifeRaw != null;
  return { bestScore, maxLevel, lifetime, hasPlayed };
}

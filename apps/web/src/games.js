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
    description: '吃掉苹果、躲开障碍，一共 9 关，看看能不能全部通关！',
    statKeys: {
      best: 'gugeegoo_snake_best_score',
      level: 'gugeegoo_snake_max_level',
      lifetime: 'gugeegoo_snake_lifetime_earned',
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

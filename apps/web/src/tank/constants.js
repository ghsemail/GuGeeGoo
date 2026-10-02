/**
 * 坦克大战 · 全局常量（以后调难度主要改这里）
 */

/** 一格有多大（像素），画地图和算碰撞都用它 */
export const TILE_SIZE = 22;

/** 玩家最多几条命 */
export const START_LIVES = 3;

/** 加命道具上限 */
export const MAX_LIVES = 5;

/** 打掉一个敌人加多少分（和贪吃蛇「+10 吃苹果」同量级放大） */
export const SCORE_PER_ENEMY = 100;

/** 用普通炮弹击毁敌人（与 SCORE_PER_ENEMY 相同，便于以后拆分） */
export const SCORE_ENEMY_NORMAL = 100;

/** 导弹直接击毁敌人额外奖励 */
export const SCORE_MISSILE_KILL_BONUS = 50;

/** 过关奖励（类似贪吃蛇过关 +50） */
export const SCORE_LEVEL_CLEAR = 50;

/** 导弹飞行与冷却 */
export const MISSILE_SPEED = 320;
export const MISSILE_COOLDOWN_SEC = 2;
export const MISSILE_EXPLOSION_RADIUS = 1;

/** 逻辑更新：每秒跑多少步（固定时间步，让不同电脑速度一致） */
export const LOGIC_STEPS_PER_SEC = 60;

/** 坦克移动速度（像素/秒） */
export const PLAYER_SPEED = 120;
export const ENEMY_SPEED = 90;

/** 子弹速度（像素/秒） */
export const BULLET_SPEED = 220;

/** 双方开火冷却（秒） */
export const PLAYER_FIRE_COOLDOWN = 0.45;
export const ENEMY_FIRE_COOLDOWN = 1.6;

/** 敌人随机转向间隔（秒） */
export const ENEMY_TURN_MIN = 0.8;
export const ENEMY_TURN_MAX = 2.2;

/** 坦克碰撞盒边长（像素，比一格略小一点好通过窄道） */
export const TANK_SIZE = 22;

/** 子弹半径 */
export const BULLET_RADIUS = 3;

/** 地图格子类型（和 levels.js 里的字母对应） */
export const TILE = {
  EMPTY: 0,
  BRICK: 1,
  STEEL: 2,
  BASE: 3, // 预留：以后可做「保护基地」
};

/** 方向：用 x/y 偏移表示，方便算子弹往哪飞 */
export const DIR = {
  up: { x: 0, y: -1, angle: -Math.PI / 2 },
  down: { x: 0, y: 1, angle: Math.PI / 2 },
  left: { x: -1, y: 0, angle: Math.PI },
  right: { x: 1, y: 0, angle: 0 },
};

export const DIR_NAMES = ['up', 'down', 'left', 'right'];

export const LS_BEST_SCORE = 'gugeegoo_tank_best_score';

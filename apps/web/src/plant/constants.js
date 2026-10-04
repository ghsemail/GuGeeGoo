/**
 * 养苔藓 — 可调参数（改这里就能让游戏变快/变慢）
 */

/** 存档在浏览器里的名字 */
export const SAVE_KEY = 'gugeegoo_plant_save';

/** 存档格式版本（以后改结构时 +1） */
export const SAVE_VERSION = 1;

/** 每隔多久自动存一次盘（毫秒） */
export const AUTO_SAVE_MS = 4000;

/** 关掉网页后，最多算多少时间的「离线消耗」（毫秒，30 分钟） */
export const OFFLINE_DRAIN_CAP_MS = 30 * 60 * 1000;

/** 游戏心跳：每隔多久更新一次状态（毫秒） */
export const TICK_INTERVAL_MS = 1000;

/** 浇水 / 晒太阳 / 施肥 按钮冷却（毫秒） */
export const CARE_COOLDOWN_MS = 2800;

/** 每秒自然下降多少（0～100 的条） */
export const DRAIN_PER_SEC = {
  water: 0.072,
  light: 0.048,
  nutrient: 0.026,
};

/** 点一次按钮加多少 */
export const ACTION_BOOST = {
  water: 26,
  light: 20,
  nutrient: 8,
};

/** 心情好时，每秒长多少「总进度」（0～100；约 12 分钟养满） */
export const GROWTH_PER_SEC_HEALTHY = 0.138;

/** 连续照顾不当时，多少秒后开始明显变黄（秒） */
export const STRESS_VISIBLE_SEC = 25;

/** 连续照顾不当累计多少秒后枯死（秒） */
export const WITHER_AFTER_NEGLECT_SEC = 200;

/** 种下新苔藓时的起始条 */
export const START_STATS = {
  water: 62,
  light: 42,
  nutrient: 22,
};

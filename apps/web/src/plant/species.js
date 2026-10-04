/**
 * 苔藓种类 — 习性说明 + 游戏里用的「理想数值」
 * 理想范围来自 habit 文字（半阴、很湿、少施肥等）
 */

/**
 * @typedef {'liverwort'|'moss'} PlantGroup
 * @typedef {{
 *   id: string,
 *   group: PlantGroup,
 *   groupTitle: string,
 *   nameZh: string,
 *   latin: string,
 *   icon: string,
 *   summary: string,
 *   habit: string,
 *   ideals: { water: Range, light: Range, nutrient: Range },
 *   maxLight: number,
 *   maxNutrient: number,
 *   minWater: number,
 * }} BryophyteSpecies
 * @typedef {{ low: number, high: number, sweet: number }} Range
 */

/** @type {BryophyteSpecies[]} */
export const BRYOPHYTE_SPECIES = [
  {
    id: 'marchantia',
    group: 'liverwort',
    groupTitle: '地钱类（苔类）',
    nameZh: '地钱',
    latin: 'Marchantia polymorpha',
    icon: '🌿',
    summary: '半阴 · 常湿 · 15～22℃',
    habit:
      '散射光、半阴就好，怕暴晒。土要常润、空气要潮，但别泡烂。15～22℃ 最舒服，别超过 28℃。几乎不用施肥。',
    ideals: {
      water: { low: 52, high: 88, sweet: 72 },
      light: { low: 18, high: 42, sweet: 30 },
      nutrient: { low: 8, high: 28, sweet: 16 },
    },
    maxLight: 58,
    maxNutrient: 42,
    minWater: 28,
  },
  {
    id: 'conocephalum',
    group: 'liverwort',
    groupTitle: '地钱类（苔类）',
    nameZh: '蛇苔',
    latin: 'Conocephalum conicum',
    icon: '🍀',
    summary: '散射光 · 中湿 · 15～25℃',
    habit:
      '明亮散射光，忌暴晒。喜欢湿石头和湿土，湿度大约 50～70%。15～25℃ 左右。几乎不用施肥。',
    ideals: {
      water: { low: 48, high: 82, sweet: 65 },
      light: { low: 22, high: 48, sweet: 36 },
      nutrient: { low: 10, high: 30, sweet: 18 },
    },
    maxLight: 62,
    maxNutrient: 44,
    minWater: 26,
  },
  {
    id: 'riccia',
    group: 'liverwort',
    groupTitle: '地钱类（苔类）',
    nameZh: '叉钱苔（鹿角苔）',
    latin: 'Riccia fluitans',
    icon: '🌱',
    summary: '中亮 · 很湿 · 18～26℃',
    habit:
      '中偏亮散射光，别长时间暴晒。喜欢很湿：可漂在水上或绑在沉木上。18～26℃ 最好。几乎不用施肥。',
    ideals: {
      water: { low: 62, high: 95, sweet: 82 },
      light: { low: 28, high: 52, sweet: 40 },
      nutrient: { low: 8, high: 26, sweet: 14 },
    },
    maxLight: 65,
    maxNutrient: 40,
    minWater: 38,
  },
  {
    id: 'leucobryum',
    group: 'moss',
    groupTitle: '其他苔藓（藓类）',
    nameZh: '白发藓',
    latin: 'Leucobryum',
    icon: '🌿',
    summary: '半阴 · 高湿 · 20～25℃',
    habit:
      '半阴、散射光，别直射。空气湿 70% 上下，土微湿别积水。20～25℃ 左右，夏天别太热。弱酸土；几乎不用施肥。',
    ideals: {
      water: { low: 50, high: 85, sweet: 68 },
      light: { low: 20, high: 44, sweet: 32 },
      nutrient: { low: 10, high: 28, sweet: 17 },
    },
    maxLight: 56,
    maxNutrient: 42,
    minWater: 30,
  },
  {
    id: 'hypnum',
    group: 'moss',
    groupTitle: '其他苔藓（藓类）',
    nameZh: '大灰藓',
    latin: 'Hypnum plumaeforme',
    icon: '🍀',
    summary: '半阴 · 润土 · 18～25℃',
    habit:
      '像林下那种半阴散射光，忌烈日。湿度 60～80%，土要润。18～25℃ 较合适。几乎不用施肥。',
    ideals: {
      water: { low: 46, high: 80, sweet: 62 },
      light: { low: 22, high: 46, sweet: 34 },
      nutrient: { low: 10, high: 30, sweet: 18 },
    },
    maxLight: 60,
    maxNutrient: 44,
    minWater: 28,
  },
  {
    id: 'polytrichum',
    group: 'moss',
    groupTitle: '其他苔藓（藓类）',
    nameZh: '金发藓',
    latin: 'Polytrichum',
    icon: '🌱',
    summary: '稍耐光 · 喜湿 · 15～25℃',
    habit:
      '比很多藓更能耐一点光，但仍忌夏日暴晒。喜湿酸性土，可喷雾。15～25℃ 较舒适。几乎不用施肥。',
    ideals: {
      water: { low: 44, high: 78, sweet: 58 },
      light: { low: 30, high: 58, sweet: 44 },
      nutrient: { low: 10, high: 32, sweet: 20 },
    },
    maxLight: 72,
    maxNutrient: 46,
    minWater: 26,
  },
  {
    id: 'funaria',
    group: 'moss',
    groupTitle: '其他苔藓（藓类）',
    nameZh: '葫芦藓',
    latin: 'Funaria hygrometrica',
    icon: '🌿',
    summary: '阴湿散射 · 常微湿 · 15～25℃',
    habit:
      '阴湿、明亮散射光，不要直射。土要常微湿，空气也要潮。15～25℃，冬天别低于 5℃。几乎不用施肥。',
    ideals: {
      water: { low: 50, high: 86, sweet: 70 },
      light: { low: 18, high: 42, sweet: 28 },
      nutrient: { low: 8, high: 28, sweet: 16 },
    },
    maxLight: 55,
    maxNutrient: 40,
    minWater: 30,
  },
];

/** @param {string} id */
export function getSpeciesById(id) {
  return BRYOPHYTE_SPECIES.find((s) => s.id === id) ?? null;
}

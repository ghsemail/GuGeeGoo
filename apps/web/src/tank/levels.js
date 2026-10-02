/**
 * 关卡数据：用字符串画地图，一行是一排格子。
 * 字母含义见 constants.js 的 TILE 说明；'.' 或 ' ' 是空地。
 *
 * 以后加新关：复制一份 grid，改字母就行。
 */

/** @typedef {{ id: number, name: string, hint: string, grid: string[] }} TankLevel */

/** @type {TankLevel[]} */
export const LEVELS = [
  {
    id: 1,
    name: '练习场',
    hint: '打掉所有敌方坦克就过关！砖墙可以打穿，钢墙打不动。',
    grid: [
      'SSSSSSSSSSSSS',
      'S...........S',
      'S..BBBBBBB..S',
      'S..B.....B..S',
      'S..B.BEB.B..S',
      'S..B.....B..S',
      'S....P......S',
      'S..B.....B..S',
      'S..B.BEB.B..S',
      'S..B.....B..S',
      'S..BBBBBBB..S',
      'S...........S',
      'SSSSSSSSSSSSS',
    ],
  },
  {
    id: 2,
    name: '小迷宫',
    hint: '敌人变多了，注意别卡在墙角里！',
    grid: [
      'SSSSSSSSSSSSS',
      'S...........S',
      'S.BBBB.BBBB.S',
      'S.B..B....B.S',
      'S.B.BE..E.B.S',
      'S....B.B....S',
      'S.BBBB.PBBBB.S',
      'S....B.B....S',
      'S.B.BE..E.B.S',
      'S.B..B....B.S',
      'S.BBBB.BBBB.S',
      'S...........S',
      'SSSSSSSSSSSSS',
    ],
  },
];

export const TOTAL_LEVELS = LEVELS.length;

export function getLevel(index) {
  const i = Math.max(0, Math.min(LEVELS.length - 1, index));
  return LEVELS[i];
}

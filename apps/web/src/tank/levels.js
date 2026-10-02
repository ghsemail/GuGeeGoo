/**
 * 关卡数据（19×19 或 21×17）
 * 每行：S + 内区 + S，内区长度固定（19 宽地图 → 17，21 宽 → 19）
 */

/** @typedef {{ id: number, name: string, hint: string, grid: string[] }} TankLevel */

/** @param {number} innerW @param {string} inner */
function bordered(innerW, inner) {
  if (inner.length !== innerW) {
    throw new Error(`内区应为 ${innerW} 字，实际 ${inner.length}：${JSON.stringify(inner)}`);
  }
  const line = `S${inner}S`;
  if (line.length !== innerW + 2) {
    throw new Error(`行宽错误：${line.length}`);
  }
  return line;
}

const b17 = (inner) => bordered(17, inner);
const b19 = (inner) => bordered(19, inner);

/** @type {TankLevel[]} */
export const LEVELS = [
  {
    id: 1,
    name: '练习场',
    hint: '大地图练手！打掉所有敌人；砖墙可打穿，钢墙不行。Q 切换道具，L 使用。',
    grid: [
      b17('SSSSSSSSSSSSSSSSS'),
      b17('.................'),
      b17('..BBBB.....BBBB..'),
      b17('..B..B.....B..B..'),
      b17('..B..B..E..B..B..'),
      b17('..BBBB.....BBBB..'),
      b17('.................'),
      b17('..BBBBSSBBBB.....'),
      b17('..B.........B....'),
      b17('.E.B...P...B.E...'),
      b17('..B.........B....'),
      b17('..BBBBSSBBBB.....'),
      b17('.................'),
      b17('..BBBB.....BBBB..'),
      b17('..B..B..E..B..B..'),
      b17('..B..B.....B..B..'),
      b17('..BBBB.....BBBB..'),
      b17('.................'),
      b17('SSSSSSSSSSSSSSSSS'),
    ],
  },
  {
    id: 2,
    name: '砖堡攻防',
    hint: '敌人更多了，利用砖墙当掩体；试试 💣 地雷和 🚀 导弹！',
    grid: [
      b17('SSSSSSSSSSSSSSSSS'),
      b17('.E.....E.....E...'),
      b17('.BBBB..BBB..BBBB.'),
      b17('.B..B..B.B..B..B.'),
      b17('.B..B..B.B..B..B.'),
      b17('..BB....B....BB..'),
      b17('...BBBBSBBBB.....'),
      b17('...B.......B.....'),
      b17('.E..B...P...B.E..'),
      b17('...B.......B.....'),
      b17('...BBBBSBBBB.....'),
      b17('..BB....B....BB..'),
      b17('.B..B..B.B..B..B.'),
      b17('.B..B..B.B..B..B.'),
      b17('.BBBB..BBB..BBBB.'),
      b17('....E.....E......'),
      b17('..BBBBBBBBBBBBB..'),
      b17('.................'),
      b17('SSSSSSSSSSSSSSSSS'),
    ],
  },
  {
    id: 3,
    name: '横向争夺',
    hint: '21×17 宽地图！左右包抄，注意别被堵在窄道里。',
    grid: [
      b19('SSSSSSSSSSSSSSSSSSS'),
      b19('...................'),
      b19('.BBBB..BBBB..BBBBB.'),
      b19('.B..B..B..B..B..B..'),
      b19('.E..B..B.E.B..E..B.'),
      b19('.BBBB..BBBB..BBBBB.'),
      b19('......B......B.....'),
      b19('..SSSSB.SSSSB..SSS.'),
      b19('..S..B..S.P.B..S..S'),
      b19('..SSSSB.SSSSB..SSS.'),
      b19('......B......B.....'),
      b19('.BBBB..BBBB..BBBBB.'),
      b19('.B..B..B..B..B..B..'),
      b19('.E..B..B.E.B..E..B.'),
      b19('.BBBB..BBBB..BBBBB.'),
      b19('...................'),
      b19('SSSSSSSSSSSSSSSSSSS'),
    ],
  },
  {
    id: 4,
    name: '钢铁迷宫',
    hint: '钢墙更多！囤 🔥 穿甲弹打穿钢墙，或 ❄️ 冰冻敌人再慢慢打。',
    grid: [
      b17('SSSSSSSSSSSSSSSSS'),
      b17('.E.....S.....E...'),
      b17('.BBBB.S.S.BBBB...'),
      b17('.B..B.S.S.B..B...'),
      b17('.E....S....E.....'),
      b17('..BBB.S.S.BBB....'),
      b17('...B..S.S..B.....'),
      b17('.......P.........'),
      b17('...B..S.S..B.....'),
      b17('..BBB.S.S.BBB....'),
      b17('.E....S....E.....'),
      b17('.B..B.S.S.B..B...'),
      b17('.BBBB.S.S.BBBB...'),
      b17('.E.....S.....E...'),
      b17('.................'),
      b17('.................'),
      b17('.................'),
      b17('.................'),
      b17('SSSSSSSSSSSSSSSSS'),
    ],
  },
];

export const TOTAL_LEVELS = LEVELS.length;

export function getLevel(index) {
  const i = Math.max(0, Math.min(LEVELS.length - 1, index));
  return LEVELS[i];
}

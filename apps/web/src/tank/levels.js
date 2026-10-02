/**
 * 关卡数据（19×19 或 21×17）
 */

/** @typedef {{ id: number, name: string, hint: string, grid: string[] }} TankLevel */

function pad19(line) {
  const s = line.padEnd(19, '.').slice(0, 19);
  if (s.length !== 19) throw new Error(`row not 19: ${s}`);
  return s;
}

function pad21(line) {
  const s = line.padEnd(21, '.').slice(0, 21);
  if (s.length !== 21) throw new Error(`row not 21: ${s}`);
  return s;
}

/** @type {TankLevel[]} */
export const LEVELS = [
  {
    id: 1,
    name: '练习场',
    hint: '大地图练手！打掉所有敌人；砖墙可打穿，钢墙不行。Q 切换道具，L 使用。',
    grid: [
      pad19('SSSSSSSSSSSSSSSSSSS'),
      pad19('S.................S'),
      pad19('S..BBBB.....BBBB..S'),
      pad19('S..B..B.....B..B..S'),
      pad19('S..B..B..E..B..B..S'),
      pad19('S..BBBB.....BBBB..S'),
      pad19('S.................S'),
      pad19('S....BBBBSSBBBB....S'),
      pad19('S....B........B....S'),
      pad19('S..E.B....P....B.E.S'),
      pad19('S....B........B....S'),
      pad19('S....BBBBSSBBBB....S'),
      pad19('S.................S'),
      pad19('S..BBBB.....BBBB..S'),
      pad19('S..B..B..E..B..B..S'),
      pad19('S..B..B.....B..B..S'),
      pad19('S..BBBB.....BBBB..S'),
      pad19('S.................S'),
      pad19('SSSSSSSSSSSSSSSSSSS'),
    ],
  },
  {
    id: 2,
    name: '砖堡攻防',
    hint: '敌人更多了，利用砖墙当掩体；试试 💣 地雷和 🚀 导弹！',
    grid: [
      pad19('SSSSSSSSSSSSSSSSSSS'),
      pad19('S.E.......E.......E.S'),
      pad19('S.BBBB...BBB...BBBB.S'),
      pad19('S.B..B...B.B...B..B.S'),
      pad19('S.B..B...B.B...B..B.S'),
      pad19('S..BB.....B.....BB..S'),
      pad19('S.....BBBBSBBBB.....S'),
      pad19('S.....B.......B.....S'),
      pad19('S..E..B...P...B..E..S'),
      pad19('S.....B.......B.....S'),
      pad19('S.....BBBBSBBBB.....S'),
      pad19('S..BB.....B.....BB..S'),
      pad19('S.B..B...B.B...B..B.S'),
      pad19('S.B..B...B.B...B..B.S'),
      pad19('S.BBBB...BBB...BBBB.S'),
      pad19('S.......E...E.......S'),
      pad19('S..BBBBBBBBBBBBBB..S'),
      pad19('S..................S'),
      pad19('SSSSSSSSSSSSSSSSSSS'),
    ],
  },
  {
    id: 3,
    name: '横向争夺',
    hint: '21×17 宽地图！左右包抄，注意别被堵在窄道里。',
    grid: [
      pad21('SSSSSSSSSSSSSSSSSSSSS'),
      pad21('S...................S'),
      pad21('S.BBBB..BBBB..BBBBB.S'),
      pad21('S.B..B..B..B..B..B..S'),
      pad21('S.E..B..B..E..B..E..S'),
      pad21('S.BBBB..BBBB..BBBBB.S'),
      pad21('S......B......B.....S'),
      pad21('S..SSSSB..SSSSB..SSS.S'),
      pad21('S..S...B..S.P.B..S..S'),
      pad21('S..SSSSB..SSSSB..SSS.S'),
      pad21('S......B......B.....S'),
      pad21('S.BBBB..BBBB..BBBBB.S'),
      pad21('S.B..B..B..B..B..B..S'),
      pad21('S.E..B..B..E..B..E..S'),
      pad21('S.BBBB..BBBB..BBBBB.S'),
      pad21('S...................S'),
      pad21('SSSSSSSSSSSSSSSSSSSSS'),
    ],
  },
  {
    id: 4,
    name: '钢铁迷宫',
    hint: '钢墙更多！囤 🔥 穿甲弹打穿钢墙，或 ❄️ 冰冻敌人再慢慢打。',
    grid: [
      pad19('SSSSSSSSSSSSSSSSSSS'),
      pad19('S.E.....SSS.....E.S'),
      pad19('S.BBBB..S.S..BBBB.S'),
      pad19('S.B..B..S.S..B..B.S'),
      pad19('S.B..B..S.S..B..B.S'),
      pad19('S..BB...S.S...BB..S'),
      pad19('S......BS.SB......S'),
      pad19('S.SSSSS.S.S.SSSSS.S'),
      pad19('S.S...S.S.S.S...S.S'),
      pad19('S.S.E.S.P.S.E.S.S.S'),
      pad19('S.S...S.S.S.S...S.S'),
      pad19('S.SSSSS.S.S.SSSSS.S'),
      pad19('S......BS.SB......S'),
      pad19('S..BB...S.S...BB..S'),
      pad19('S.B..B..S.S..B..B.S'),
      pad19('S.BBBB..S.S..BBBB.S'),
      pad19('S.E.....SSS.....E.S'),
      pad19('S.................S'),
      pad19('SSSSSSSSSSSSSSSSSSS'),
    ],
  },
];

export const TOTAL_LEVELS = LEVELS.length;

export function getLevel(index) {
  const i = Math.max(0, Math.min(LEVELS.length - 1, index));
  return LEVELS[i];
}

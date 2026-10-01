/**
 * 关卡配置表：每关吃够 targetFood 个食物即过关。
 * speedMs = 蛇移动一格的间隔（越小越快）
 * obstacles = 固定障碍格 [x,y]（网格坐标）
 * movers = 会移动的障碍：{ path: [[x,y],...], stepMs } 沿路径循环
 */

export const TOTAL_LEVELS = 9;

export const LEVELS = [
  {
    id: 1,
    name: '新手村',
    cols: 18,
    rows: 14,
    speedMs: 220,
    targetFood: 5,
    obstacles: [],
    movers: [],
    hint: '用方向键或 W A S D 移动，吃到 🍎 就长大！',
  },
  {
    id: 2,
    name: '小试身手',
    cols: 18,
    rows: 14,
    speedMs: 200,
    targetFood: 6,
    obstacles: [
      [9, 4],
      [9, 5],
      [9, 8],
      [9, 9],
    ],
    movers: [],
    hint: '中间有石头，绕过去吃苹果！',
  },
  {
    id: 3,
    name: '迷宫角',
    cols: 16,
    rows: 14,
    speedMs: 190,
    targetFood: 6,
    obstacles: [
      [4, 3],
      [4, 4],
      [4, 5],
      [11, 8],
      [11, 9],
      [11, 10],
    ],
    movers: [],
    hint: '地图变窄了，别撞墙！',
  },
  {
    id: 4,
    name: '加速区',
    cols: 16,
    rows: 14,
    speedMs: 165,
    targetFood: 7,
    obstacles: [
      [8, 2],
      [8, 3],
      [8, 10],
      [8, 11],
    ],
    movers: [],
    hint: '蛇变快了，提前想好方向！',
  },
  {
    id: 5,
    name: '移动石',
    cols: 16,
    rows: 14,
    speedMs: 160,
    targetFood: 7,
    obstacles: [
      [3, 7],
      [12, 7],
    ],
    movers: [
      {
        path: [
          [8, 5],
          [8, 6],
          [8, 7],
          [8, 8],
          [8, 9],
        ],
        stepMs: 400,
      },
    ],
    hint: '橙色石头会上下移动，躲开它！',
  },
  {
    id: 6,
    name: '双石阵',
    cols: 14,
    rows: 14,
    speedMs: 150,
    targetFood: 8,
    obstacles: [
      [7, 3],
      [7, 10],
    ],
    movers: [
      {
        path: [
          [3, 7],
          [4, 7],
          [5, 7],
          [6, 7],
        ],
        stepMs: 350,
      },
      {
        path: [
          [10, 7],
          [9, 7],
          [8, 7],
        ],
        stepMs: 350,
      },
    ],
    hint: '两块石头左右巡逻，找空档通过！',
  },
  {
    id: 7,
    name: '紧凑场',
    cols: 14,
    rows: 12,
    speedMs: 140,
    targetFood: 8,
    obstacles: [
      [2, 4],
      [2, 5],
      [11, 4],
      [11, 5],
      [7, 6],
      [7, 7],
    ],
    movers: [
      {
        path: [
          [5, 9],
          [6, 9],
          [7, 9],
          [8, 9],
          [9, 9],
        ],
        stepMs: 300,
      },
    ],
    hint: '地图更小，每一步都要想清楚。',
  },
  {
    id: 8,
    name: '高手路',
    cols: 14,
    rows: 12,
    speedMs: 125,
    targetFood: 9,
    obstacles: [
      [7, 2],
      [7, 3],
      [7, 8],
      [7, 9],
      [3, 6],
      [10, 6],
    ],
    movers: [
      {
        path: [
          [5, 5],
          [5, 6],
          [5, 7],
        ],
        stepMs: 280,
      },
      {
        path: [
          [9, 5],
          [9, 6],
          [9, 7],
        ],
        stepMs: 280,
      },
    ],
    hint: '离终点只差一步啦！',
  },
  {
    id: 9,
    name: '终极挑战',
    cols: 12,
    rows: 12,
    speedMs: 110,
    targetFood: 10,
    obstacles: [
      [6, 3],
      [6, 4],
      [6, 7],
      [6, 8],
      [3, 6],
      [8, 6],
    ],
    movers: [
      {
        path: [
          [2, 2],
          [2, 3],
          [2, 4],
          [2, 5],
          [2, 6],
          [2, 7],
          [2, 8],
          [2, 9],
        ],
        stepMs: 250,
      },
      {
        path: [
          [9, 2],
          [9, 3],
          [9, 4],
          [9, 5],
          [9, 6],
          [9, 7],
          [9, 8],
          [9, 9],
        ],
        stepMs: 250,
      },
    ],
    hint: '全部通关你就是贪吃蛇大师！',
  },
];

export function getLevel(levelIndex) {
  const idx = Math.max(0, Math.min(levelIndex, LEVELS.length - 1));
  return LEVELS[idx];
}

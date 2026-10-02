/**
 * 坦克炮管几何：和 render-tanks.js 绘制长度一致，子弹从炮口飞出
 */
import { DIR } from './constants.js';

/** 炮管长度 = size × 此比例（与 drawBarrel 一致） */
export const BARREL_LENGTH_RATIO = 0.55;

/** @returns {{ x: number, y: number, dx: number, dy: number }} 炮口坐标与单位方向 */
export function getBarrelMuzzle(tank) {
  const d = DIR[tank.dir];
  if (!d) {
    return { x: tank.x, y: tank.y, dx: 0, dy: -1 };
  }
  const len = tank.size * BARREL_LENGTH_RATIO;
  return {
    x: tank.x + d.x * len,
    y: tank.y + d.y * len,
    dx: d.x,
    dy: d.y,
  };
}

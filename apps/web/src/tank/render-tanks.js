/**
 * 坦克造型：车体、履带、炮塔、炮管（顶视）
 */
import { DIR } from './constants.js';
import { BARREL_LENGTH_RATIO } from './tank-geometry.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} tank
 * @param {{ hull: string, hullDark: string, track: string, turret: string }} palette
 * @param {number} animPhase 用于履带滚动（可用 bgScroll）
 * @param {boolean} blink
 */
export function drawDetailedTank(ctx, tank, palette, animPhase, blink = false) {
  if (blink && Math.floor(performance.now() / 120) % 2 === 0) return;

  const angle = DIR[tank.dir].angle;
  const moving = !!tank.moving;
  const phase = moving ? (animPhase * 0.35) % 1 : 0;
  const s = tank.size;

  ctx.save();
  ctx.translate(tank.x, tank.y);
  ctx.rotate(angle);

  drawTracks(ctx, s, palette.track, phase, moving);
  drawHull(ctx, s, palette);
  drawTurret(ctx, s, palette.turret);
  drawBarrel(ctx, s);

  ctx.restore();
}

function drawTracks(ctx, s, color, phase, moving) {
  const trackW = s * 0.22;
  const trackLen = s * 0.92;
  const segments = 5;
  const segH = trackLen / segments;

  for (const side of [-1, 1]) {
    const x = side * (s * 0.38);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - trackW / 2, -trackLen / 2, trackW, trackLen, 3);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < segments; i++) {
      let oy = -trackLen / 2 + i * segH + phase * segH;
      if (oy > trackLen / 2) oy -= trackLen;
      ctx.fillRect(x - trackW / 2 + 1, oy, trackW - 2, segH * 0.45);
    }
    if (!moving) {
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      for (let i = 0; i < segments; i++) {
        const oy = -trackLen / 2 + i * segH;
        ctx.strokeRect(x - trackW / 2 + 2, oy + 1, trackW - 4, segH - 2);
      }
    }
  }
}

function drawHull(ctx, s, palette) {
  const w = s * 0.72;
  const h = s * 0.78;
  const grad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  grad.addColorStop(0, palette.hullDark);
  grad.addColorStop(0.35, palette.hull);
  grad.addColorStop(1, palette.hullDark);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawTurret(ctx, s, color) {
  const r = s * 0.22;
  const g = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.2, 0, 0, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawBarrel(ctx, s) {
  const len = s * BARREL_LENGTH_RATIO;
  const bw = s * 0.12;
  ctx.fillStyle = '#37474F';
  ctx.beginPath();
  ctx.roundRect(0, -bw / 2, len, bw, 2);
  ctx.fill();
  ctx.fillStyle = '#263238';
  ctx.fillRect(len - 3, -bw / 2, 3, bw);
}

export const PLAYER_PALETTE = {
  hull: '#66BB6A',
  hullDark: '#2E7D32',
  track: '#1B5E20',
  turret: '#81C784',
};

export const ENEMY_PALETTE = {
  hull: '#EF5350',
  hullDark: '#B71C1C',
  track: '#4A148C',
  turret: '#FF8A80',
};

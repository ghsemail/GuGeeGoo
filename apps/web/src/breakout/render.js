import { CANVAS_H, CANVAS_W } from './game.js';

const BRICK_COLORS = ['', '#EF5350', '#FFA726', '#AB47BC'];

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./game.js').createBreakoutState extends () => infer S ? S : never} state
 */
export function drawBreakout(ctx, state) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  bg.addColorStop(0, '#1a237e');
  bg.addColorStop(1, '#283593');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  for (const b of state.bricks) {
    ctx.fillStyle = BRICK_COLORS[b.max] || '#78909C';
    ctx.globalAlpha = b.hp / b.max;
    roundRect(ctx, b.x, b.y, b.w, b.h, 4);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (b.max > 1) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(b.hp), b.x + b.w / 2, b.y + b.h / 2 + 4);
    }
  }

  const paddleW =
    state.elapsed < state.wideUntil ? state.paddleW * 1.55 : state.paddleW;
  const py = CANVAS_H - 48;
  ctx.fillStyle = '#4FC3F7';
  roundRect(ctx, state.paddleX - paddleW / 2, py, paddleW, 12, 6);
  ctx.fill();

  for (const p of state.powerups) {
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    const emoji = p.kind === 'wide' ? '↔️' : p.kind === 'multi' ? '🎾' : '🐢';
    ctx.fillText(emoji, p.x, p.y);
  }

  for (const ball of state.balls) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = '#FFEB3B';
    ctx.fill();
    ctx.strokeStyle = '#F57F17';
    ctx.stroke();
  }

  if (state.paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px PingFang SC,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('暂停', CANVAS_W / 2, CANVAS_H / 2);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

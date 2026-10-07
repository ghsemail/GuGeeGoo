/**
 * 战场爆炸特效（坦克击毁、导弹等）
 */

export function pushExplosion(state, x, y, opts = {}) {
  const maxTtl = opts.ttl ?? 0.48;
  state.explosions.push({
    x,
    y,
    ttl: maxTtl,
    maxTtl,
    kind: opts.kind ?? 'tank',
    scale: opts.scale ?? 1,
  });
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object[]} explosions
 * @param {number} tileSize
 * @param {number} time
 */
export function drawExplosions(ctx, explosions, tileSize, time) {
  for (const ex of explosions || []) {
    const maxTtl = ex.maxTtl ?? 0.48;
    const p = 1 - Math.max(0, ex.ttl / maxTtl);
    const baseR = tileSize * 0.55 * (ex.scale ?? 1);
    const r = baseR * (0.35 + p * 1.15);
    const flicker = Math.floor(time * 28) % 2 === 0;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const g = ctx.createRadialGradient(ex.x, ex.y, r * 0.05, ex.x, ex.y, r);
    g.addColorStop(0, `rgba(255,255,255,${0.95 * (1 - p * 0.3)})`);
    g.addColorStop(0.25, `rgba(255,235,59,${0.85 * (1 - p * 0.2)})`);
    g.addColorStop(0.55, `rgba(255,87,34,${0.65 * (1 - p * 0.5)})`);
    g.addColorStop(1, 'rgba(183,28,28,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = flicker
      ? `rgba(255,255,255,${0.75 * (1 - p)})`
      : `rgba(255,193,7,${0.55 * (1 - p)})`;
    ctx.lineWidth = Math.max(2, tileSize * 0.08 * (1 - p));
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, r * 0.72, 0, Math.PI * 2);
    ctx.stroke();

    const sparks = 6;
    for (let i = 0; i < sparks; i++) {
      const ang = (i / sparks) * Math.PI * 2 + p * 2.4;
      const dist = r * (0.4 + p * 0.9);
      const sx = ex.x + Math.cos(ang) * dist;
      const sy = ex.y + Math.sin(ang) * dist;
      ctx.fillStyle = `rgba(255,${flicker ? 250 : 160},50,${0.9 * (1 - p)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(2, tileSize * 0.06 * (1 - p)), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }
}

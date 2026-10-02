/** @typedef {import('./game.js').createWhackState extends () => infer S ? S : never} WhackState */

const COLORS = {
  grass: '#7CB342',
  grassDark: '#689F38',
  hole: '#4E342E',
  mole: '#8D6E63',
  golden: '#FFD54F',
  bomb: '#455A64',
};

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {WhackState} state
 * @param {number} w
 * @param {number} h
 * @param {string} [toast]
 */
export function drawWhack(ctx, state, w, h, toast = '') {
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, COLORS.grass);
  g.addColorStop(1, COLORS.grassDark);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const gs = state.gridSize;
  const pad = w * 0.06;
  const innerW = w - pad * 2;
  const cellW = innerW / gs;
  const cellH = (h - pad * 2) / gs;

  for (let row = 0; row < gs; row++) {
    for (let col = 0; col < gs; col++) {
      const i = row * gs + col;
      const cx = pad + col * cellW + cellW / 2;
      const cy = pad + row * cellH + cellH / 2;
      const r = Math.min(cellW, cellH) * 0.38;
      ctx.beginPath();
      ctx.ellipse(cx, cy + r * 0.15, r, r * 0.55, 0, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.hole;
      ctx.fill();
      ctx.strokeStyle = '#3E2723';
      ctx.lineWidth = 2;
      ctx.stroke();

      const mole = state.holes[i];
      if (mole) {
        const pop = Math.min(1, mole.ttl * 2);
        const my = cy - r * 0.35 * pop;
        ctx.beginPath();
        ctx.arc(cx, my, r * 0.72, 0, Math.PI * 2);
        if (mole.kind === 'golden') ctx.fillStyle = COLORS.golden;
        else if (mole.kind === 'bomb') ctx.fillStyle = COLORS.bomb;
        else ctx.fillStyle = COLORS.mole;
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.floor(r * 0.9)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const emoji =
          mole.kind === 'golden' ? '⭐' : mole.kind === 'bomb' ? '💣' : '🐹';
        ctx.fillText(emoji, cx, my);
      }
    }
  }

  if (toast) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(w * 0.15, h * 0.42, w * 0.7, h * 0.12);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(w * 0.05)}px PingFang SC, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(toast, w / 2, h * 0.48);
  }
}

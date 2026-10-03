/**
 * 拾取、地雷、导弹轨迹等战场特效绘制
 */
import { getShopItem } from './items.js';

export function drawPickups(ctx, state, ts, time) {
  for (const p of state.pickups || []) {
    const blink = p.ttl < 4 && Math.floor(time * 6) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.45;
    const r = ts * 0.42;
    const g = ctx.createRadialGradient(p.x, p.y - 2, 2, p.x, p.y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.55, 'rgba(129,212,250,0.75)');
    g.addColorStop(1, 'rgba(33,150,243,0.35)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(21,101,192,0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
    const item = getShopItem(p.itemId);
    ctx.font = `${Math.max(16, ts * 0.62)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item?.emoji || '📦', p.x, p.y - 1);
    ctx.font = `bold ${Math.max(9, ts * 0.28)}px PingFang SC, sans-serif`;
    ctx.fillStyle = '#0D47A1';
    ctx.fillText('拾取', p.x, p.y + r * 0.55);
    ctx.globalAlpha = 1;
  }
}

export function drawFloatTexts(ctx, state) {
  for (const f of state.floatTexts || []) {
    const a = Math.min(1, f.ttl / 0.35);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#FFF59D';
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 3;
    ctx.font = `bold ${Math.max(14, 13)}px PingFang SC, sans-serif`;
    ctx.textAlign = 'center';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillText(f.text, f.x, f.y);
    ctx.globalAlpha = 1;
  }
}

export function drawMines(ctx, state, ts, time) {
  for (const m of state.mines || []) {
    if (!m.alive) continue;
    const isPlayer = m.faction !== 'enemy';
    if (isPlayer) {
      ctx.fillStyle = 'rgba(76, 175, 80, 0.35)';
      ctx.beginPath();
      ctx.arc(m.x, m.y, ts * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2E7D32';
      ctx.beginPath();
      ctx.arc(m.x, m.y, ts * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#A5D6A7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(m.x, m.y, ts * 0.28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#E8F5E9';
      ctx.font = `bold ${Math.max(11, ts * 0.38)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓', m.x, m.y + 1);
    } else {
      const blink = Math.floor(time * 5) % 2 === 0;
      ctx.fillStyle = blink ? 'rgba(244, 67, 54, 0.55)' : 'rgba(33, 33, 33, 0.75)';
      ctx.beginPath();
      ctx.arc(m.x, m.y, ts * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#212121';
      ctx.beginPath();
      ctx.arc(m.x, m.y, ts * 0.2, 0, Math.PI * 2);
      ctx.fill();
      if (blink) {
        ctx.fillStyle = 'rgba(255, 82, 82, 0.9)';
        ctx.beginPath();
        ctx.arc(m.x + ts * 0.18, m.y - ts * 0.18, ts * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = `${Math.max(13, ts * 0.5)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💀', m.x, m.y);
    }
  }
}

export function drawMissile(ctx, b, time) {
  const isPlayer = b.ownerKind === 'player';
  const ang = Math.atan2(b.vy, b.vx);
  const len = isPlayer ? 14 : 16;
  const tx = b.x - Math.cos(ang) * len;
  const ty = b.y - Math.sin(ang) * len;

  if (isPlayer) {
    ctx.strokeStyle = 'rgba(129, 212, 250, 0.75)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = '#E3F2FD';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1565C0';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '12px sans-serif';
    ctx.fillText('🚀', b.x - 6, b.y + 4);
  } else {
    ctx.strokeStyle = 'rgba(96, 64, 64, 0.65)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 87, 34, 0.45)';
    ctx.beginPath();
    ctx.arc(tx, ty, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#D84315';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#BF360C';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    if (Math.floor(time * 12) % 2 === 0) {
      ctx.font = '13px sans-serif';
      ctx.fillText('🚀', b.x - 6, b.y + 4);
    }
  }
}

export function drawFreezeBullet(ctx, b) {
  ctx.fillStyle = '#81D4FA';
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '12px sans-serif';
  ctx.fillText('❄️', b.x - 6, b.y + 4);
}

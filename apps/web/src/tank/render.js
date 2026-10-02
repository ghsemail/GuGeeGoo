/**
 * 地图、视差背景、坦克与子弹绘制
 */
import { TILE } from './constants.js';
import { drawParallaxBackground, drawGrassTile } from './render-background.js';
import {
  drawDetailedTank,
  PLAYER_PALETTE,
  ENEMY_PALETTE,
} from './render-tanks.js';
import { isEnemyFrozen, isPlayerShielded } from './consumables.js';

export function computeCanvasSize(map) {
  return {
    width: map.cols * map.tileSize,
    height: map.rows * map.tileSize,
  };
}

function drawBrickTile(ctx, px, py, ts) {
  ctx.fillStyle = '#BF360C';
  ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
  ctx.fillStyle = '#D84315';
  const bw = (ts - 4) / 2;
  const bh = (ts - 4) / 2;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const ox = px + 2 + col * bw + (row % 2 ? bw / 2 : 0);
      const oy = py + 2 + row * bh;
      ctx.fillRect(ox, oy, bw - 1, bh - 1);
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 1.5, py + 1.5, ts - 3, ts - 3);
}

function drawSteelTile(ctx, px, py, ts) {
  const g = ctx.createLinearGradient(px, py, px + ts, py + ts);
  g.addColorStop(0, '#ECEFF1');
  g.addColorStop(0.5, '#90A4AE');
  g.addColorStop(1, '#546E7A');
  ctx.fillStyle = g;
  ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
  ctx.strokeStyle = '#37474F';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 2, py + 2, ts - 4, ts - 4);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(px + 3, py + 3, ts * 0.35, 2);
}

export function drawFrame(ctx, state) {
  const { map, player, enemies, bullets } = state;
  const ts = map.tileSize;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const scroll = state.bgScroll || 0;

  drawParallaxBackground(ctx, w, h, scroll);

  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      const t = map.cells[y][x];
      const px = x * ts;
      const py = y * ts;

      if (t === TILE.EMPTY) {
        drawGrassTile(ctx, px, py, ts, x, y, scroll);
      } else if (t === TILE.BRICK) {
        drawGrassTile(ctx, px, py, ts, x, y, scroll);
        drawBrickTile(ctx, px, py, ts);
      } else if (t === TILE.STEEL) {
        drawGrassTile(ctx, px, py, ts, x, y, scroll);
        drawSteelTile(ctx, px, py, ts);
      } else if (t === TILE.BASE) {
        drawGrassTile(ctx, px, py, ts, x, y, scroll);
        ctx.fillStyle = '#FDD835';
        ctx.fillRect(px + 4, py + 4, ts - 8, ts - 8);
      }
    }
  }

  ctx.strokeStyle = 'rgba(55, 71, 79, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

  for (const m of state.mines || []) {
    ctx.font = `${Math.max(14, map.tileSize * 0.55)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('💣', m.x, m.y + map.tileSize * 0.15);
  }

  for (const e of enemies) {
    const frozen = isEnemyFrozen(e, state.time);
    if (frozen) ctx.globalAlpha = 0.55;
    drawDetailedTank(ctx, e, ENEMY_PALETTE, scroll, frozen);
    if (frozen) ctx.globalAlpha = 1;
  }
  const shielded = isPlayerShielded(player, state.time);
  drawDetailedTank(
    ctx,
    player,
    PLAYER_PALETTE,
    scroll,
    player.invuln > 0 || shielded
  );
  if (shielded) {
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size * 0.85, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const b of bullets) {
    if (b.kind === 'missile') {
      ctx.fillStyle = '#ff7675';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '14px sans-serif';
      ctx.fillText('🚀', b.x - 7, b.y + 5);
      continue;
    }
    ctx.fillStyle = b.ownerKind === 'player' ? '#FFF59D' : '#FFAB91';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const ex of state.explosions || []) {
    ctx.fillStyle = 'rgba(255, 118, 117, 0.45)';
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, map.tileSize * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.paused && state.phase === 'playing') {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#37474F';
    ctx.font = 'bold 22px PingFang SC, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('暂停', w / 2, h / 2);
  }
}

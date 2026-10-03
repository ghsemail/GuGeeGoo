/**
 * 地图、视差背景、坦克与子弹绘制
 */
import { TILE } from './constants.js';
import { drawParallaxBackground, drawGrassTile } from './render-background.js';
import {
  drawDetailedTank,
  PLAYER_PALETTE,
  ENEMY_PALETTE,
  BOSS_PALETTE,
} from './render-tanks.js';
import { isEnemyFrozen, isPlayerShielded } from './consumables.js';
import {
  drawPickups,
  drawFloatTexts,
  drawMines,
  drawMissile,
  drawFreezeBullet,
} from './render-fx.js';

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
  const logicalW = map.cols * ts;
  const logicalH = map.rows * ts;
  const displayScale = state.displayScale ?? 1;
  const renderDpr = state.renderDpr ?? 1;
  const paintScale = displayScale * renderDpr;
  ctx.setTransform(paintScale, 0, 0, paintScale, 0, 0);
  const w = logicalW;
  const h = logicalH;
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

  drawPickups(ctx, state, ts, state.time);
  drawMines(ctx, state, ts, state.time);

  for (const e of enemies) {
    const frozen = isEnemyFrozen(e, state.time);
    if (frozen) ctx.globalAlpha = 0.55;
    drawDetailedTank(ctx, e, ENEMY_PALETTE, scroll, frozen);
    if (frozen) ctx.globalAlpha = 1;
  }

  const boss = state.boss;
  if (boss && boss.hp > 0) {
    const frozen = isEnemyFrozen(boss, state.time);
    if (boss.chargeTtl > 0 && Math.floor(state.time * 8) % 2 === 0) {
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = 'rgba(255, 87, 34, 0.35)';
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, boss.size * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (frozen) ctx.globalAlpha = 0.55;
    drawDetailedTank(ctx, boss, BOSS_PALETTE, scroll, boss.hitFlashTtl > 0);
    if (frozen) ctx.globalAlpha = 1;
    drawMiniBossBar(ctx, boss, ts);
  }

  const shielded = isPlayerShielded(player, state.time);
  const playerFrozen = player.frozenUntil && state.time < player.frozenUntil;
  drawDetailedTank(
    ctx,
    player,
    PLAYER_PALETTE,
    scroll,
    player.invuln > 0 || shielded
  );
  if (playerFrozen) {
    ctx.strokeStyle = 'rgba(129, 212, 250, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size * 0.75, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = '16px sans-serif';
    ctx.fillText('❄️', player.x - 8, player.y - player.size * 0.5);
  }
  if (shielded) {
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size * 0.85, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const b of bullets) {
    if (b.kind === 'missile') {
      drawMissile(ctx, b, state.time);
      continue;
    }
    if (b.effect === 'freeze') {
      drawFreezeBullet(ctx, b);
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

  if (state.boss && state.boss.hp > 0) {
    drawTopBossBar(ctx, state, w);
  }

  if (state.bossWarningTtl > 0 && !state.boss) {
    ctx.fillStyle = 'rgba(211, 47, 47, 0.82)';
    ctx.fillRect(w * 0.08, h * 0.38, w * 0.84, h * 0.12);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.max(18, w * 0.045)}px PingFang SC, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ BOSS 来了！', w / 2, h * 0.45);
  }

  if (state.bossRewardFlash > 0 && state.bossRewardText) {
    ctx.fillStyle = 'rgba(255, 193, 7, 0.85)';
    ctx.fillRect(w * 0.1, h * 0.12, w * 0.8, h * 0.1);
    ctx.fillStyle = '#4E342E';
    ctx.font = `bold ${Math.max(16, w * 0.04)}px PingFang SC, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`🎉 ${state.bossRewardText}`, w / 2, h * 0.18);
  }

  drawFloatTexts(ctx, state);

  if (state.paused && state.phase === 'playing') {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#37474F';
    ctx.font = 'bold 22px PingFang SC, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('暂停', w / 2, h / 2);
  }
}

function drawTopBossBar(ctx, state, w) {
  const boss = state.boss;
  if (!boss) return;
  const pad = 8;
  const barW = w - pad * 2;
  const barH = 14;
  const y = 6;
  const ratio = boss.hp / boss.maxHp;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(pad, y, barW, barH + 18);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px PingFang SC, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`BOSS 第${state.levelDef.id}关`, pad + 4, y + 12);
  ctx.textAlign = 'right';
  ctx.fillText(`${boss.hp} / ${boss.maxHp}`, pad + barW - 4, y + 12);
  ctx.fillStyle = '#424242';
  ctx.fillRect(pad + 4, y + 16, barW - 8, barH);
  ctx.fillStyle = boss.hitFlashTtl > 0 ? '#FFEB3B' : '#F44336';
  ctx.fillRect(pad + 4, y + 16, (barW - 8) * ratio, barH);
}

function drawMiniBossBar(ctx, boss, ts) {
  const w = boss.size * 1.1;
  const h = 5;
  const x = boss.x - w / 2;
  const y = boss.y - boss.size / 2 - 10;
  const ratio = boss.hp / boss.maxHp;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#FF7043';
  ctx.fillRect(x, y, w * ratio, h);
}

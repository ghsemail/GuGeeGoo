/**
 * 把地图、坦克、子弹画到 canvas 上（占位造型，以后可换贴图）。
 */
import { TILE } from './constants.js';
import { DIR } from './constants.js';

const COLORS = {
  groundA: '#2d3436',
  groundB: '#353b48',
  brick: '#c0392b',
  steel: '#95a5a6',
  base: '#f1c40f',
  player: '#2ecc71',
  enemy: '#e74c3c',
  bulletPlayer: '#ffeaa7',
  bulletEnemy: '#fab1a0',
};

export function computeCanvasSize(map) {
  return {
    width: map.cols * map.tileSize,
    height: map.rows * map.tileSize,
  };
}

export function drawFrame(ctx, state) {
  const { map, player, enemies, bullets } = state;
  const ts = map.tileSize;
  ctx.fillStyle = '#1e272e';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      const t = map.cells[y][x];
      const px = x * ts;
      const py = y * ts;
      if ((x + y) % 2 === 0) {
        ctx.fillStyle = COLORS.groundA;
      } else {
        ctx.fillStyle = COLORS.groundB;
      }
      ctx.fillRect(px, py, ts, ts);

      if (t === TILE.BRICK) {
        ctx.fillStyle = COLORS.brick;
        ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
      } else if (t === TILE.STEEL) {
        ctx.fillStyle = COLORS.steel;
        ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
      } else if (t === TILE.BASE) {
        ctx.fillStyle = COLORS.base;
        ctx.fillRect(px + 4, py + 4, ts - 8, ts - 8);
      }
    }
  }

  for (const e of enemies) {
    drawTank(ctx, e, COLORS.enemy);
  }
  drawTank(ctx, player, COLORS.player, player.invuln > 0);

  for (const b of bullets) {
    if (b.kind === 'missile') {
      ctx.fillStyle = '#ff7675';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fdcb6e';
      ctx.font = '14px sans-serif';
      ctx.fillText('🚀', b.x - 7, b.y + 5);
      continue;
    }
    ctx.fillStyle =
      b.ownerKind === 'player' ? COLORS.bulletPlayer : COLORS.bulletEnemy;
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
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px PingFang SC, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('暂停', ctx.canvas.width / 2, ctx.canvas.height / 2);
  }
}

function drawTank(ctx, tank, color, blink = false) {
  if (blink && Math.floor(performance.now() / 120) % 2 === 0) return;

  const angle = DIR[tank.dir].angle;
  ctx.save();
  ctx.translate(tank.x, tank.y);
  ctx.rotate(angle);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-tank.size / 2, -tank.size / 2, tank.size, tank.size, 4);
  ctx.fill();

  ctx.fillStyle = '#2d3436';
  ctx.fillRect(-3, -tank.size / 2 - 6, 6, 10);

  ctx.restore();
}

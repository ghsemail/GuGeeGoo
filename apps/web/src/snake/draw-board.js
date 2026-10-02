/**
 * 棋盘背景：野餐桌布 + 木头桌 + 边缘食物装饰（不用外链图片）
 */

const FOOD_DECOR = ['🍎', '🍇', '🥪', '🧃', '🍉', '🥨'];

/** 画整张 canvas 背景（在格子之下） */
export function drawPicnicBoard(ctx, width, height, cols, rows, cellSize) {
  ctx.fillStyle = '#8B5A2B';
  ctx.fillRect(0, 0, width, height);

  const margin = Math.max(6, Math.floor(cellSize * 0.35));
  const innerX = margin;
  const innerY = margin;
  const innerW = width - margin * 2;
  const innerH = height - margin * 2;

  const g = ctx.createLinearGradient(0, innerY, 0, innerY + innerH);
  g.addColorStop(0, '#DEB887');
  g.addColorStop(0.5, '#F5DEB3');
  g.addColorStop(1, '#D2B48C');
  ctx.fillStyle = g;
  ctx.fillRect(innerX, innerY, innerW, innerH);

  drawGingham(ctx, innerX, innerY, innerW, innerH, cellSize);

  ctx.strokeStyle = 'rgba(139, 90, 43, 0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(innerX + 1.5, innerY + 1.5, innerW - 3, innerH - 3);

  drawFoodDecor(ctx, width, height, cellSize);
}

function drawGingham(ctx, x, y, w, h, cellSize) {
  const step = Math.max(8, Math.floor(cellSize * 0.45));
  ctx.save();
  ctx.globalAlpha = 0.22;
  for (let py = y; py < y + h; py += step) {
    for (let px = x; px < x + w; px += step) {
      const ix = Math.floor((px - x) / step);
      const iy = Math.floor((py - y) / step);
      if ((ix + iy) % 2 === 0) {
        ctx.fillStyle = '#e74c3c';
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.fillRect(px, py, step, step);
    }
  }
  ctx.restore();
}

function drawFoodDecor(ctx, width, height, cellSize) {
  const fontSize = Math.max(14, Math.floor(cellSize * 0.85));
  ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const pad = fontSize * 0.55;
  const spots = [
    [pad, pad],
    [width - pad, pad],
    [pad, height - pad],
    [width - pad, height - pad],
    [width / 2, pad * 0.9],
    [width / 2, height - pad * 0.9],
  ];
  spots.forEach(([sx, sy], i) => {
    ctx.globalAlpha = 0.92;
    ctx.fillText(FOOD_DECOR[i % FOOD_DECOR.length], sx, sy);
  });
  ctx.globalAlpha = 1;
}

/** 单个格子的「草地/桌布」色，比原来更亮，方便看清蛇和石头 */
export function cellGroundColor(x, y) {
  const checker = (x + y) % 2 === 0;
  return checker ? '#C8E6C9' : '#A5D6A7';
}

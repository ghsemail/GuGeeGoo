/**
 * 视差背景：多层缓慢滚动（只用 canvas 渐变/形状，省 CPU）
 */

function drawCloud(ctx, x, y, r) {
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
  ctx.arc(x + r * 0.5, y - r * 0.15, r * 0.45, 0, Math.PI * 2);
  ctx.arc(x + r * 0.95, y, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

/** 整幅画布的天空 + 远景（在对战网格之下） */
export function drawParallaxBackground(ctx, width, height, timeSec) {
  const t = timeSec || 0;
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#B3E5FC');
  sky.addColorStop(0.45, '#DCEDC8');
  sky.addColorStop(1, '#FFF9C4');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 5; i++) {
    const speed = 6 + i * 2;
    const cx = ((t * speed + i * 95) % (width + 120)) - 60;
    const cy = 14 + (i % 3) * 22;
    drawCloud(ctx, cx, cy, 26 + (i % 2) * 10);
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.25;
  const hillOff = (t * 4) % width;
  ctx.fillStyle = '#A5D6A7';
  ctx.beginPath();
  ctx.moveTo(-hillOff, height);
  for (let x = -hillOff; x <= width + 40; x += 40) {
    const h = 18 + Math.sin(x * 0.04 + t) * 8;
    ctx.lineTo(x, height - h - 8);
  }
  ctx.lineTo(width + 40, height);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#8D6E63';
  const stripeW = 14;
  const off1 = (t * 18) % stripeW;
  for (let x = -off1; x < width + stripeW; x += stripeW) {
    ctx.fillRect(x, 0, stripeW / 2, height);
  }
  const off2 = (t * 28) % stripeW;
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#FBC02D';
  for (let x = -off2; x < width + stripeW; x += stripeW) {
    ctx.fillRect(x, height * 0.55, stripeW / 2, height);
  }
  ctx.restore();
}

/** 空地格子上的草皮 + 轻微滚动纹理 */
export function drawGrassTile(ctx, px, py, ts, worldX, worldY, timeSec) {
  const t = timeSec || 0;
  const even = (worldX + worldY) % 2 === 0;
  ctx.fillStyle = even ? '#AED581' : '#9CCC65';
  ctx.fillRect(px, py, ts, ts);

  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, ts, ts);
  ctx.clip();
  ctx.globalAlpha = 0.18;
  const drift = (t * 22 + worldX * 3) % 10;
  ctx.fillStyle = '#689F38';
  for (let i = -1; i <= 2; i++) {
    ctx.fillRect(px + i * 10 + drift - 5, py, 3, ts);
  }
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#FFFDE7';
  const drift2 = (t * 14 + worldY * 5) % 12;
  for (let j = -1; j <= 2; j++) {
    ctx.fillRect(px, py + j * 8 + drift2, ts, 2);
  }
  ctx.restore();
}

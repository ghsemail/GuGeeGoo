/**
 * 绘制圆滚滚的可爱蛇：圆头带眼睛、渐变身体、渐细尾巴
 */

function cellCenter(x, y, cs) {
  return { x: (x + 0.5) * cs, y: (y + 0.5) * cs };
}

function dirNameFromVector(dx, dy) {
  if (dx > 0) return 'right';
  if (dx < 0) return 'left';
  if (dy > 0) return 'down';
  if (dy < 0) return 'up';
  return 'right';
}

function segmentColor(index, total, rainbow) {
  if (rainbow) {
    const hue = (index * 36 + total * 8) % 360;
    return `hsl(${hue}, 78%, 58%)`;
  }
  const t = index / Math.max(total - 1, 1);
  const green = Math.floor(180 + t * 40);
  return index === 0 ? '#7bed9f' : `rgb(46, ${green}, 100)`;
}

/** @param {CanvasRenderingContext2D} ctx */
export function drawSnake(ctx, snake, direction, cs, effects = {}) {
  if (!snake.length) return;

  const rainbow = !!effects.rainbowSkin;
  const partyHat = !!effects.partyHat;
  const n = snake.length;
  const points = snake.map((seg) => cellCenter(seg.x, seg.y, cs));

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (n >= 2) {
    ctx.strokeStyle = rainbow ? 'rgba(255,255,255,0.35)' : '#1fa855';
    ctx.lineWidth = cs * 0.72;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  }

  for (let i = n - 1; i >= 0; i--) {
    const t = i / Math.max(n - 1, 1);
    const radius = cs * (0.22 + (1 - t) * 0.18);
    ctx.fillStyle = segmentColor(i, n, rainbow);
    ctx.beginPath();
    ctx.arc(points[i].x, points[i].y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = Math.max(1, cs * 0.04);
    ctx.stroke();
  }

  const head = points[0];
  const headR = cs * 0.38;
  ctx.fillStyle = rainbow ? segmentColor(0, n, true) : '#9dffbd';
  ctx.beginPath();
  ctx.arc(head.x, head.y, headR, 0, Math.PI * 2);
  ctx.fill();

  let face = dirNameFromVector(direction.x, direction.y);
  if (n >= 2) {
    const neck = points[1];
    face = dirNameFromVector(head.x - neck.x, head.y - neck.y);
  }

  if (partyHat) {
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    const hatW = cs * 0.35;
    const hatH = cs * 0.28;
    let hx = head.x;
    let hy = head.y - headR * 0.9;
    if (face === 'down') hy = head.y + headR * 0.5;
    if (face === 'left') {
      hx = head.x - headR * 0.85;
      hy = head.y;
    }
    if (face === 'right') {
      hx = head.x + headR * 0.85;
      hy = head.y;
    }
    ctx.moveTo(hx, hy - hatH);
    ctx.lineTo(hx - hatW / 2, hy);
    ctx.lineTo(hx + hatW / 2, hy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(hx, hy - hatH, cs * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }

  const eyeOffset = cs * 0.14;
  const eyeR = Math.max(2, cs * 0.07);
  const pupilR = Math.max(1.5, cs * 0.04);
  const eyes = [];

  switch (face) {
    case 'up':
      eyes.push(
        { x: head.x - eyeOffset, y: head.y - eyeOffset * 0.5 },
        { x: head.x + eyeOffset, y: head.y - eyeOffset * 0.5 }
      );
      break;
    case 'down':
      eyes.push(
        { x: head.x - eyeOffset, y: head.y + eyeOffset * 0.5 },
        { x: head.x + eyeOffset, y: head.y + eyeOffset * 0.5 }
      );
      break;
    case 'left':
      eyes.push(
        { x: head.x - eyeOffset * 0.5, y: head.y - eyeOffset },
        { x: head.x - eyeOffset * 0.5, y: head.y + eyeOffset }
      );
      break;
    default:
      eyes.push(
        { x: head.x + eyeOffset * 0.5, y: head.y - eyeOffset },
        { x: head.x + eyeOffset * 0.5, y: head.y + eyeOffset }
      );
  }

  for (const eye of eyes) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(eye.x, eye.y, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a2a1a';
    ctx.beginPath();
    ctx.arc(eye.x, eye.y, pupilR, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 与打地鼠 / 打砖块相同思路：在已 flex 分配好的区域内等比 fit 画布。
 * @param {{ width: number, height: number }} rect 可用区域（通常是 .canvas-wrap 或 .canvas-play-zone）
 * @param {number} logicalW
 * @param {number} logicalH
 * @param {{ square?: boolean }} [opts] square=true 时同打地鼠（min 边）；否则同打砖块（保持宽高比）
 */
export function displayBoundsInZone(rect, logicalW, logicalH, opts = {}) {
  const w = Math.max(0, rect.width);
  const h = Math.max(0, rect.height);
  if (w < 16 || h < 16) {
    return { maxW: Math.max(16, w), maxH: Math.max(16, h) };
  }

  const square =
    opts.square === true ||
    (opts.square !== false && Math.abs(logicalW - logicalH) < 0.5);

  if (square) {
    const side = Math.floor(Math.min(w, h));
    return { maxW: side, maxH: side };
  }

  let displayW = Math.min(w, (h * logicalW) / logicalH);
  let displayH = (displayW * logicalH) / logicalW;
  if (displayH > h) {
    displayH = h;
    displayW = (displayH * logicalW) / logicalH;
  }
  return {
    maxW: Math.max(16, Math.floor(displayW)),
    maxH: Math.max(16, Math.floor(displayH)),
  };
}

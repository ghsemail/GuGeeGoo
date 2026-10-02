export const TILE_BG = {
  0: 'rgba(238,228,218,0.35)',
  2: '#eee4da',
  4: '#ede0c8',
  8: '#f2b179',
  16: '#f59563',
  32: '#f67c5f',
  64: '#f65e3b',
  128: '#edcf72',
  256: '#edcc61',
  512: '#edc850',
  1024: '#edc53f',
  2048: '#edc22e',
};

export function tileColor(v) {
  if (v > 2048) return '#3c3a32';
  return TILE_BG[v] || '#3c3a32';
}

export function tileTextColor(v) {
  return v <= 4 ? '#776e65' : '#f9f6f2';
}

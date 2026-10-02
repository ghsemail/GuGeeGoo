export const SIZE = 4;

export function emptyGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

export function cloneGrid(g) {
  return g.map((row) => row.slice());
}

/** @param {number[][]} grid */
export function countEmpty(grid) {
  let n = 0;
  for (const row of grid) for (const v of row) if (!v) n++;
  return n;
}

/** @param {number[][]} grid */
export function spawnTile(grid) {
  const empty = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (!grid[y][x]) empty.push([x, y]);
    }
  }
  if (!empty.length) return null;
  const [x, y] = empty[Math.floor(Math.random() * empty.length)];
  grid[y][x] = Math.random() < 0.9 ? 2 : 4;
  return { x, y, value: grid[y][x] };
}

/**
 * @param {number[][]} grid
 * @param {'up'|'down'|'left'|'right'} dir
 */
export function moveGrid(grid, dir) {
  const before = cloneGrid(grid);
  let scoreGain = 0;
  const merged = [];

  const slideLine = (line) => {
    const filtered = line.filter((v) => v);
    const out = [];
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i] && filtered[i] === filtered[i + 1]) {
        const v = filtered[i] * 2;
        out.push(v);
        scoreGain += v;
        merged.push(v);
        i++;
      } else {
        out.push(filtered[i]);
      }
    }
    while (out.length < SIZE) out.push(0);
    return out;
  };

  if (dir === 'left') {
    for (let y = 0; y < SIZE; y++) {
      grid[y] = slideLine(grid[y]);
    }
  } else if (dir === 'right') {
    for (let y = 0; y < SIZE; y++) {
      const rev = grid[y].slice().reverse();
      grid[y] = slideLine(rev).reverse();
    }
  } else if (dir === 'up') {
    for (let x = 0; x < SIZE; x++) {
      const col = [];
      for (let y = 0; y < SIZE; y++) col.push(grid[y][x]);
      const slid = slideLine(col);
      for (let y = 0; y < SIZE; y++) grid[y][x] = slid[y];
    }
  } else {
    for (let x = 0; x < SIZE; x++) {
      const col = [];
      for (let y = 0; y < SIZE; y++) col.push(grid[y][x]);
      const rev = col.slice().reverse();
      const slid = slideLine(rev).reverse();
      for (let y = 0; y < SIZE; y++) grid[y][x] = slid[y];
    }
  }

  const moved = JSON.stringify(before) !== JSON.stringify(grid);
  return { moved, scoreGain };
}

/** @param {number[][]} grid */
export function hasMoves(grid) {
  if (countEmpty(grid) > 0) return true;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const v = grid[y][x];
      if (x + 1 < SIZE && grid[y][x + 1] === v) return true;
      if (y + 1 < SIZE && grid[y + 1][x] === v) return true;
    }
  }
  return false;
}

/** @param {number[][]} grid */
export function maxTile(grid) {
  let m = 0;
  for (const row of grid) for (const v of row) if (v > m) m = v;
  return m;
}

export function create2048State() {
  const grid = emptyGrid();
  spawnTile(grid);
  spawnTile(grid);
  return {
    grid,
    score: 0,
    won: false,
    continueAfterWin: false,
    over: false,
    undoUsed: false,
    /** @type {{ grid: number[][], score: number } | null} */
    undoSnapshot: null,
  };
}

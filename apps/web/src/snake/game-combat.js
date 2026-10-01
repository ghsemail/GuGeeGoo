/**
 * 武器与投射物（不改变外墙）
 */
import { getWeapon } from './weapons.js';

function cellKey(x, y) {
  return `${x},${y}`;
}

export function initWeaponRuntime(state, weaponId) {
  const w = getWeapon(weaponId);
  state.weaponRuntime = {
    id: w.id,
    kind: w.kind,
    ammo: w.ammoPerLevel,
    cooldown: 0,
    cooldownMax: w.cooldownTicks,
    freezeTicks: w.freezeTicks || 14,
  };
  state.projectiles = [];
  if (!state.moverFreezeTicks) state.moverFreezeTicks = {};
}

export function tryFireWeapon(state) {
  const wr = state.weaponRuntime;
  if (!wr || wr.cooldown > 0 || wr.ammo <= 0) {
    return { ok: false };
  }
  const head = state.snake[0];
  const d = state.direction;
  wr.ammo -= 1;
  wr.cooldown = wr.cooldownMax;

  if (wr.kind === 'pierce_line') {
    state.projectiles.push({
      kind: 'pierce_line',
      x: head.x + d.x,
      y: head.y + d.y,
      dx: d.x,
      dy: d.y,
    });
  } else {
    state.projectiles.push({
      kind: wr.kind,
      x: head.x + d.x,
      y: head.y + d.y,
      dx: d.x,
      dy: d.y,
      freezeTicks: wr.freezeTicks,
    });
  }
  return { ok: true, weapon: wr };
}

function inBounds(x, y, cols, rows) {
  return x >= 0 && x < cols && y >= 0 && y < rows;
}

function removeFixedObstacle(state, x, y) {
  state.level.obstacles = state.level.obstacles.filter(
    ([ox, oy]) => !(ox === x && oy === y)
  );
}

function freezeMoverAt(state, x, y, ticks) {
  const { level, moverStates } = state;
  level.movers.forEach((m, i) => {
    const idx = moverStates[i].pathIndex;
    const [mx, my] = m.path[idx];
    if (mx === x && my === y) {
      state.moverFreezeTicks[i] = ticks;
    }
  });
}

function hitProjectile(state, proj) {
  const { cols, rows } = state.level;
  const { x, y } = proj;
  if (!inBounds(x, y, cols, rows)) return 'wall';

  if (proj.kind === 'break_one') {
    const fixed = state.level.obstacles.some(([ox, oy]) => ox === x && oy === y);
    if (fixed) {
      removeFixedObstacle(state, x, y);
      return 'hit';
    }
    return 'miss';
  }

  if (proj.kind === 'freeze_mover') {
    freezeMoverAt(state, x, y, proj.freezeTicks || 14);
    return 'hit';
  }

  if (proj.kind === 'pierce_line') {
    const fixed = state.level.obstacles.some(([ox, oy]) => ox === x && oy === y);
    if (fixed) {
      removeFixedObstacle(state, x, y);
      return 'continue';
    }
    return 'continue';
  }
  return 'miss';
}

export function tickWeaponSystems(state) {
  const wr = state.weaponRuntime;
  if (wr && wr.cooldown > 0) wr.cooldown -= 1;

  if (state.moverFreezeTicks) {
    for (const key of Object.keys(state.moverFreezeTicks)) {
      state.moverFreezeTicks[key] -= 1;
      if (state.moverFreezeTicks[key] <= 0) {
        delete state.moverFreezeTicks[key];
      }
    }
  }

  const { cols, rows } = state.level;
  const nextProjectiles = [];

  for (const proj of state.projectiles || []) {
    if (proj.kind === 'pierce_line') {
      let cx = proj.x;
      let cy = proj.y;
      let alive = true;
      while (alive) {
        if (!inBounds(cx, cy, cols, rows)) break;
        const result = hitProjectile(state, { ...proj, x: cx, y: cy });
        if (result === 'wall') break;
        cx += proj.dx;
        cy += proj.dy;
      }
      continue;
    }

    const result = hitProjectile(state, proj);
    if (result === 'continue') {
      nextProjectiles.push({
        ...proj,
        x: proj.x + proj.dx,
        y: proj.y + proj.dy,
      });
    }
  }
  state.projectiles = nextProjectiles.filter((p) =>
    inBounds(p.x, p.y, cols, rows)
  );
}

export function isMoverFrozen(state, moverIndex) {
  return (state.moverFreezeTicks?.[moverIndex] || 0) > 0;
}

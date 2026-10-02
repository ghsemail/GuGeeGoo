/**
 * 武器与投射物（不改变外墙，不伤蛇身）
 */
import { getWeapon } from './weapons.js';

export function initWeaponRuntime(state, weaponId) {
  const w = getWeapon(weaponId);
  state.weaponRuntime = {
    id: w.id,
    kind: w.kind,
    ammo: w.ammoPerLevel,
    cooldown: 0,
    cooldownMax: w.cooldownTicks,
    freezeTicks: w.freezeTicks || 14,
    buddyTicks: w.buddyTicks || 48,
  };
  state.projectiles = [];
  state.weaponFx = [];
  state.tankBuddy = null;
  if (!state.moverFreezeTicks) state.moverFreezeTicks = {};
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

/** 炸掉一格上的固定石，并冻住移动石（不伤蛇） */
function bombCell(state, x, y, freezeTicks = 14) {
  const { cols, rows } = state.level;
  if (!inBounds(x, y, cols, rows)) return;
  const fixed = state.level.obstacles.some(([ox, oy]) => ox === x && oy === y);
  if (fixed) removeFixedObstacle(state, x, y);
  freezeMoverAt(state, x, y, freezeTicks);
}

function startPlaneStrike(state) {
  const { cols, rows } = state.level;
  const head = state.snake[0];
  const d = state.direction;
  let x = head.x;
  let y = head.y;
  const dx = d.x;
  const dy = d.y;
  if (dx > 0) x = 0;
  else if (dx < 0) x = cols - 1;
  else if (dy > 0) y = 0;
  else if (dy < 0) y = rows - 1;

  state.weaponFx.push({
    kind: 'plane',
    x,
    y,
    dx,
    dy,
  });
}

function startTankBuddy(state, wr) {
  state.tankBuddy = {
    ticksLeft: wr.buddyTicks,
    shootCooldown: 4,
  };
}

export function tryFireWeapon(state) {
  const wr = state.weaponRuntime;
  if (!wr || wr.cooldown > 0 || wr.ammo <= 0) {
    return { ok: false };
  }

  if (wr.kind === 'tank_buddy' && state.tankBuddy?.ticksLeft > 0) {
    return { ok: false, reason: 'busy' };
  }

  wr.ammo -= 1;
  wr.cooldown = wr.cooldownMax;

  const head = state.snake[0];
  const d = state.direction;

  if (wr.kind === 'air_strike') {
    startPlaneStrike(state);
    return { ok: true, weapon: wr };
  }
  if (wr.kind === 'tank_buddy') {
    startTankBuddy(state, wr);
    return { ok: true, weapon: wr };
  }

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

function tickPlaneFx(state) {
  const next = [];
  for (const fx of state.weaponFx || []) {
    if (fx.kind !== 'plane') {
      next.push(fx);
      continue;
    }
    bombCell(state, fx.x, fx.y);
    fx.x += fx.dx;
    fx.y += fx.dy;
    if (inBounds(fx.x, fx.y, state.level.cols, state.level.rows)) {
      next.push(fx);
    }
  }
  state.weaponFx = next;
}

function tickTankBuddy(state) {
  const buddy = state.tankBuddy;
  if (!buddy || buddy.ticksLeft <= 0) {
    state.tankBuddy = null;
    return;
  }
  buddy.ticksLeft -= 1;
  buddy.shootCooldown -= 1;
  if (buddy.shootCooldown > 0) return;

  buddy.shootCooldown = 6;
  const head = state.snake[0];
  const d = state.direction;
  let tx = head.x + d.x;
  let ty = head.y + d.y;
  const { cols, rows } = state.level;
  while (inBounds(tx, ty, cols, rows)) {
    const fixed = state.level.obstacles.some(([ox, oy]) => ox === tx && oy === ty);
    if (fixed) {
      removeFixedObstacle(state, tx, ty);
      break;
    }
    freezeMoverAt(state, tx, ty, 10);
    tx += d.x;
    ty += d.y;
  }
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

  tickPlaneFx(state);
  tickTankBuddy(state);

  const { cols, rows } = state.level;
  const nextProjectiles = [];

  for (const proj of state.projectiles || []) {
    if (proj.kind === 'pierce_line') {
      let cx = proj.x;
      let cy = proj.y;
      while (true) {
        if (!inBounds(cx, cy, cols, rows)) break;
        hitProjectile(state, { ...proj, x: cx, y: cy });
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

/** 给 main.js 画飞机/小坦克动画 */
export function drawWeaponEffects(ctx, state, cellSize) {
  const cs = cellSize;
  for (const fx of state.weaponFx || []) {
    if (fx.kind === 'plane') {
      const px = (fx.x + 0.5) * cs;
      const py = (fx.y + 0.5) * cs;
      ctx.font = `${Math.floor(cs * 0.75)}px "Apple Color Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✈️', px, py);
    }
  }
  const buddy = state.tankBuddy;
  if (buddy && buddy.ticksLeft > 0 && state.snake?.length) {
    const head = state.snake[0];
    const d = state.direction;
    const sideX = head.x - d.y * 0.85;
    const sideY = head.y + d.x * 0.85;
    const px = (sideX + 0.5) * cs;
    const py = (sideY + 0.5) * cs;
    ctx.font = `${Math.floor(cs * 0.65)}px "Apple Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚜', px, py);
  }
}

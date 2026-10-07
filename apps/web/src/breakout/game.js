import { playSfx } from '../arcade/arcade-audio.js';
import { BRICK_ROWS, COLS, LEVELS } from './levels.js';

export const CANVAS_W = 560;
export const CANVAS_H = 420;

/** @typedef {'wide'|'multi'|'slow'} PowerKind */

/**
 * @param {number} levelIndex
 */
export function createBreakoutState(levelIndex = 0) {
  const level = LEVELS[levelIndex] || LEVELS[0];
  /** @type {{ hp: number, max: number, x: number, y: number, w: number, h: number }[]} */
  const bricks = [];
  const brickW = (CANVAS_W - 40) / COLS;
  const brickH = 18;
  const top = 48;
  for (let r = 0; r < BRICK_ROWS; r++) {
    const line = level.rows[r] || '';
    for (let c = 0; c < COLS; c++) {
      const ch = line[c] || '.';
      if (ch === '.') continue;
      const hp = Number(ch) || 1;
      bricks.push({
        hp,
        max: hp,
        x: 20 + c * brickW,
        y: top + r * (brickH + 4),
        w: brickW - 4,
        h: brickH,
      });
    }
  }

  return {
    levelIndex,
    levelName: level.name,
    score: 0,
    lives: 3,
    bricks,
    paddleW: 88,
    paddleX: CANVAS_W / 2,
    balls: [makeBall(CANVAS_W / 2, CANVAS_H - 60, 4, -4.2)],
    powerups: [],
    wideUntil: 0,
    slowUntil: 0,
    running: true,
    paused: false,
    won: false,
    lost: false,
    elapsed: 0,
  };
}

function makeBall(x, y, vx, vy) {
  return { x, y, vx, vy, r: 6, stuck: false };
}

/**
 * @param {ReturnType<createBreakoutState>} state
 * @param {number} dt
 */
export function tickBreakout(state, dt) {
  if (!state.running || state.paused || state.won || state.lost) return;
  state.elapsed += dt;
  const paddleW =
    state.elapsed < state.wideUntil ? state.paddleW * 1.55 : state.paddleW;
  const slow = state.elapsed < state.slowUntil ? 0.72 : 1;

  for (const ball of state.balls) {
    if (ball.stuck) {
      ball.x = state.paddleX;
      ball.y = CANVAS_H - 60;
      continue;
    }
    ball.x += ball.vx * slow * dt * 60;
    ball.y += ball.vy * slow * dt * 60;

    if (ball.x - ball.r < 8) {
      ball.x = 8 + ball.r;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + ball.r > CANVAS_W - 8) {
      ball.x = CANVAS_W - 8 - ball.r;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y - ball.r < 8) {
      ball.y = 8 + ball.r;
      ball.vy = Math.abs(ball.vy);
    }

    const py = CANVAS_H - 48;
    if (
      ball.y + ball.r >= py &&
      ball.y - ball.r <= py + 14 &&
      Math.abs(ball.x - state.paddleX) < paddleW / 2 + ball.r
    ) {
      ball.y = py - ball.r;
      const hit = (ball.x - state.paddleX) / (paddleW / 2);
      const angle = hit * 0.85;
      const speed = Math.hypot(ball.vx, ball.vy) || 5;
      ball.vx = angle * speed;
      ball.vy = -Math.abs(Math.cos(angle) * speed);
    }

    for (const b of state.bricks) {
      if (b.hp <= 0) continue;
      if (
        ball.x + ball.r > b.x &&
        ball.x - ball.r < b.x + b.w &&
        ball.y + ball.r > b.y &&
        ball.y - ball.r < b.y + b.h
      ) {
        b.hp -= 1;
        state.score += 10 * b.max;
        ball.vy *= -1;
        playSfx(b.hp <= 0 ? 'brick' : 'hit');
        if (b.hp <= 0 && Math.random() < 0.22) {
          /** @type {PowerKind} */
          const kind =
            Math.random() < 0.34
              ? 'wide'
              : Math.random() < 0.5
                ? 'multi'
                : 'slow';
          state.powerups.push({
            kind,
            x: b.x + b.w / 2,
            y: b.y + b.h / 2,
            vy: 90,
          });
        }
        break;
      }
    }
  }

  state.powerups = state.powerups.filter((p) => {
    p.y += p.vy * dt;
    if (p.y > CANVAS_H) return false;
    if (
      Math.abs(p.x - state.paddleX) < paddleW / 2 + 8 &&
      p.y >= CANVAS_H - 52 &&
      p.y <= CANVAS_H - 38
    ) {
      applyPower(state, p.kind);
      return false;
    }
    return true;
  });

  state.bricks = state.bricks.filter((b) => b.hp > 0);
  if (state.bricks.length === 0) {
    state.won = true;
    state.running = false;
    playSfx('win');
  }

  const alive = [];
  for (const ball of state.balls) {
    if (ball.y - ball.r > CANVAS_H + 20) continue;
    alive.push(ball);
  }
  if (alive.length === 0) {
    state.lives -= 1;
    if (state.lives <= 0) {
      state.lost = true;
      state.running = false;
      playSfx('lose');
    } else {
      const nb = makeBall(state.paddleX, CANVAS_H - 60, 3.5, -4);
      nb.stuck = true;
      state.balls = [nb];
    }
  } else {
    state.balls = alive;
  }
}

/**
 * @param {ReturnType<createBreakoutState>} state
 * @param {PowerKind} kind
 */
function applyPower(state, kind) {
  if (kind === 'wide') state.wideUntil = state.elapsed + 8;
  if (kind === 'slow') state.slowUntil = state.elapsed + 6;
  if (kind === 'multi' && state.balls.length < 4) {
    const b0 = state.balls[0];
    if (b0) {
      state.balls.push(
        { ...b0, vx: b0.vx + 1.2, vy: -Math.abs(b0.vy) },
        { ...b0, vx: b0.vx - 1.2, vy: -Math.abs(b0.vy) }
      );
    }
  }
}

/**
 * @param {ReturnType<createBreakoutState>} state
 */
export function launchBall(state) {
  for (const b of state.balls) {
    if (b.stuck) {
      b.stuck = false;
      b.vx = (Math.random() - 0.5) * 2;
      b.vy = -4.5;
    }
  }
}

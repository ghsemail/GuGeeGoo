/**
 * 地雷：玩家（友军）与敌人（危险）分轨
 */
import { DIR } from './constants.js';
import { tanksOverlap } from './collision.js';

export const ENEMY_MINE_MAX_ON_MAP = 3;
export const ENEMY_MINE_LAY_COOLDOWN = 4.5;
export const ENEMY_MINE_LAY_CHANCE = 0.22;
export const BOSS_MINE_LAY_CHANCE = 0.12;

function oppositeDir(d) {
  return { up: 'down', down: 'up', left: 'right', right: 'left' }[d] || 'down';
}

export function countMines(state, faction) {
  return (state.mines || []).filter((m) => m.alive && m.faction === faction).length;
}

export function createPlayerMine(state, player) {
  const ts = state.map.tileSize;
  const back = DIR[oppositeDir(player.dir)];
  const tx = Math.floor((player.x - back.x * ts * 0.55) / ts);
  const ty = Math.floor((player.y - back.y * ts * 0.55) / ts);
  state.mines.push({
    tx,
    ty,
    x: (tx + 0.5) * ts,
    y: (ty + 0.5) * ts,
    alive: true,
    faction: 'player',
  });
}

export function tryLayEnemyMine(state, tank) {
  if (!state.mines) state.mines = [];
  if (countMines(state, 'enemy') >= ENEMY_MINE_MAX_ON_MAP) return false;
  const ts = state.map.tileSize;
  const back = DIR[oppositeDir(tank.dir)];
  const tx = Math.floor((tank.x - back.x * ts * 0.5) / ts);
  const ty = Math.floor((tank.y - back.y * ts * 0.5) / ts);
  if (tx < 1 || ty < 1 || tx >= state.map.cols - 1 || ty >= state.map.rows - 1) {
    return false;
  }
  const tooClose = state.mines.some(
    (m) => m.alive && m.tx === tx && m.ty === ty
  );
  if (tooClose) return false;
  state.mines.push({
    tx,
    ty,
    x: (tx + 0.5) * ts,
    y: (ty + 0.5) * ts,
    alive: true,
    faction: 'enemy',
  });
  return true;
}

export function mineHitRadius(ts) {
  return ts * 0.35;
}

export function tankHitsMine(tank, mine, ts) {
  return tanksOverlap(
    { x: tank.x, y: tank.y, size: tank.size * 0.85 },
    { x: mine.x, y: mine.y, size: mineHitRadius(ts) }
  );
}

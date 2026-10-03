#!/usr/bin/env node
/**
 * BOSS 网格移动：四关、静止玩家、~8s 固定步长模拟
 */
import { LEVELS } from '../apps/web/src/tank/levels.js';
import { createMapFromLevel } from '../apps/web/src/tank/map.js';
import { createPlayer } from '../apps/web/src/tank/entities.js';
import {
  createBossEntity,
  findBossSpawn,
  initBossGridState,
  updateBossAI,
} from '../apps/web/src/tank/boss.js';
import { tankBodyClearAt } from '../apps/web/src/tank/collision.js';
import { BOSS_SIZE, LOGIC_STEPS_PER_SEC } from '../apps/web/src/tank/constants.js';

const DT = 1 / LOGIC_STEPS_PER_SEC;
const SIM_SEC = 8;
const MIN_PATH_PX = 150;
const MAX_STUCK_SEC = 1.5;
const STUCK_RADIUS_PX = 3;

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simulateLevel(levelDef) {
  const map = createMapFromLevel(levelDef);
  const player = createPlayer(map.playerSpawn);
  const spawn = findBossSpawn(map);
  if (!spawn) {
    return { ok: false, error: 'no boss spawn' };
  }

  const boss = createBossEntity(spawn, levelDef.id);
  initBossGridState(boss, map);
  boss.fireCooldown = 999;
  boss.weaponIndex = 0;

  const state = {
    map,
    player,
    boss,
    bullets: [],
    time: 0,
    levelDef,
    score: 0,
    explosions: [],
    enemies: [],
    mines: [],
    pickups: [],
    floatTexts: [],
    phase: 'playing',
  };

  let pathLen = 0;
  let prevX = boss.x;
  let prevY = boss.y;
  let anchorX = boss.x;
  let anchorY = boss.y;
  let anchorT = 0;
  let maxStuck = 0;

  const steps = Math.round(SIM_SEC / DT);
  for (let i = 0; i < steps; i++) {
    state.time += DT;
    if (boss.hp <= 0) break;
    updateBossAI(boss, DT, state);

    pathLen += Math.hypot(boss.x - prevX, boss.y - prevY);
    prevX = boss.x;
    prevY = boss.y;

    const drift = Math.hypot(boss.x - anchorX, boss.y - anchorY);
    if (drift > STUCK_RADIUS_PX) {
      anchorX = boss.x;
      anchorY = boss.y;
      anchorT = 0;
    } else {
      anchorT += DT;
      if (anchorT > maxStuck) maxStuck = anchorT;
    }

    if (!tankBodyClearAt(map, boss.x, boss.y, BOSS_SIZE)) {
      return {
        ok: false,
        error: `wall overlap at (${boss.x.toFixed(1)}, ${boss.y.toFixed(1)}) t=${state.time.toFixed(2)}`,
        pathLen,
        maxStuck,
      };
    }
  }

  const issues = [];
  if (pathLen <= MIN_PATH_PX) {
    issues.push(`path ${pathLen.toFixed(1)}px ≤ ${MIN_PATH_PX}px`);
  }
  if (maxStuck > MAX_STUCK_SEC) {
    issues.push(`stuck ${maxStuck.toFixed(2)}s > ${MAX_STUCK_SEC}s`);
  }

  return {
    ok: issues.length === 0,
    pathLen,
    maxStuck,
    endX: boss.x,
    endY: boss.y,
    issues,
  };
}

function main() {
  const origRandom = Math.random;
  let failed = false;
  /** @type {Record<number, object>} */
  const report = {};

  for (const level of LEVELS) {
    Math.random = mulberry32(0xb055 + level.id * 9973);
    const r = simulateLevel(level);
    Math.random = origRandom;
    report[level.id] = r;
    const tag = `L${level.id}「${level.name}」`;
    if (!r.ok) {
      failed = true;
      console.error(
        `${tag} FAIL: ${r.error || r.issues?.join('; ') || 'unknown'}`
      );
    } else {
      console.log(
        `${tag} OK — path ${r.pathLen.toFixed(1)}px, maxStuck ${r.maxStuck.toFixed(2)}s, end (${r.endX.toFixed(1)}, ${r.endY.toFixed(1)})`
      );
    }
  }

  if (failed) process.exit(1);
}

main();

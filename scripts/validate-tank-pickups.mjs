#!/usr/bin/env node
/**
 * 坦克拾取逻辑：定时刷新 + 敌人掉落（捕获 ReferenceError 等运行时错误）
 */
import { createGameState, updateGame } from '../apps/web/src/tank/game-loop.js';
import { createInputState } from '../apps/web/src/tank/input.js';
import {
  tryDropPickupFromEnemy,
  updatePickups,
  PICKUP_SPAWN_INTERVAL_SEC,
} from '../apps/web/src/tank/pickups.js';
import { LOGIC_STEPS_PER_SEC } from '../apps/web/src/tank/constants.js';

const DT = 1 / LOGIC_STEPS_PER_SEC;
const SIM_SEC = 32;

function main() {
  const state = createGameState(0);
  const input = createInputState();
  let spawns = 0;
  let drops = 0;

  for (let step = 0; step < Math.round(SIM_SEC / DT); step++) {
    state.pickupSpawnTimer = PICKUP_SPAWN_INTERVAL_SEC - 0.05;
    updatePickups(state, DT);
    if ((state.pickups?.length || 0) > spawns) spawns = state.pickups.length;

    for (const e of state.enemies) {
      if (e.hp <= 0) continue;
      const before = state.pickups?.length || 0;
      tryDropPickupFromEnemy(state, e);
      if ((state.pickups?.length || 0) > before) drops += 1;
    }

    updateGame(state, DT, input);
  }

  console.log(
    `validate-tank-pickups OK — ${SIM_SEC}s, peakOnMap=${spawns}, dropRolls=${drops}, finalPickups=${state.pickups?.length ?? 0}`
  );
}

main();

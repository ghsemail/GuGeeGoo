/**
 * 玩家受伤与重生（地雷、炮弹等共用）
 */
import { placeTankAtCell } from './entities.js';

export function hurtPlayer(state) {
  state.lives -= 1;
  state.player.invuln = 2;
  if (state.lives <= 0) {
    state.phase = 'lose';
    return;
  }
  const sp = state.map.playerSpawn;
  placeTankAtCell(state.player, sp.x, sp.y, state.map.tileSize);
  state.player.dir = 'up';
}

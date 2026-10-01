/**
 * 道具效果：写入 game state，由 game.js / main.js / draw-snake 读取
 */
import { getItemById } from './items.js';

export function createDefaultEffects() {
  return {
    speedBonusMs: 0,
    scoreMultiplier: 1,
    shieldCharges: 0,
    ghostTicksLeft: 0,
    magnetActive: false,
    rainbowSkin: false,
    partyHat: false,
  };
}

/** 装备中的永久外观 */
export function applyEquippedCosmetics(state, equippedIds) {
  state.effects = state.effects || createDefaultEffects();
  state.effects.rainbowSkin = equippedIds.includes('skin_rainbow');
  state.effects.partyHat = equippedIds.includes('cosmetic_hat');
  return state;
}

/** 消耗品：在关卡开始时调用（已扣库存） */
export function applyConsumableEffect(state, itemId) {
  state.effects = state.effects || createDefaultEffects();
  switch (itemId) {
    case 'power_slow':
      state.effects.speedBonusMs += 85;
      break;
    case 'power_shield':
      state.effects.shieldCharges += 1;
      break;
    case 'power_magnet':
      state.effects.magnetActive = true;
      break;
    case 'power_double':
      state.effects.scoreMultiplier *= 2;
      break;
    case 'power_ghost':
      state.effects.ghostTicksLeft += 18;
      break;
    default:
      break;
  }
  return state;
}

export function effectIcons(state) {
  const e = state.effects || createDefaultEffects();
  const icons = [];
  if (e.rainbowSkin) icons.push('🌈');
  if (e.partyHat) icons.push('🎩');
  if (e.speedBonusMs > 0) icons.push('🍬');
  if (e.shieldCharges > 0) icons.push('🫧');
  if (e.magnetActive) icons.push('🧲');
  if (e.scoreMultiplier > 1) icons.push('✨');
  if (e.ghostTicksLeft > 0) icons.push('👻');
  return icons;
}

export function toastForConsumable(itemId) {
  const item = getItemById(itemId);
  if (!item) return '道具生效！';
  return `${item.emoji} ${item.name}生效！`;
}

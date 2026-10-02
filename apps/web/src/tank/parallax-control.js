/**
 * 背景视差滚动：由「前进」键控制，松开时仅轻微漂移
 */

/** 松开前进键时的缓慢漂移（像素/秒 等效 scroll 单位） */
export const BG_IDLE_DRIFT = 2.5;

/** 按住前进键时的滚动速度 */
export const BG_FORWARD_SPEED = 48;

export function updateBackgroundScroll(state, dt, input) {
  if (!state) return;
  const forward = !!(input.forward || input.forwardPressed);
  const speed = BG_IDLE_DRIFT + (forward ? BG_FORWARD_SPEED : 0);
  state.bgScroll = (state.bgScroll || 0) + speed * dt;
}

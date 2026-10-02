/**
 * 输入：键盘 + 画布上的十字键（和贪吃蛇类似）
 */
import { DIR } from './constants.js';

/** @typedef {{ up: boolean, down: boolean, left: boolean, right: boolean, fire: boolean, firePressed: boolean }} InputState */

export function createInputState() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    fire: false,
    firePressed: false,
  };
}

const KEY_MAP = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
};

export function bindKeyboard(input, enabledRef) {
  const onKey = (e, down) => {
    if (!enabledRef()) return;
    const dir = KEY_MAP[e.key];
    if (dir) {
      e.preventDefault();
      input[dir] = down;
    }
    if (down && (e.key === ' ' || e.key === 'j' || e.key === 'J')) {
      e.preventDefault();
      input.fire = true;
      input.firePressed = true;
    }
    if (!down && (e.key === ' ' || e.key === 'j' || e.key === 'J')) {
      input.fire = false;
    }
  };
  window.addEventListener('keydown', (e) => onKey(e, true));
  window.addEventListener('keyup', (e) => onKey(e, false));
}

export function bindDpad(container, input, enabledRef) {
  if (!container) return;
  container.querySelectorAll('.dpad-btn[data-dir]').forEach((btn) => {
    const dir = btn.dataset.dir;
    const set = (on) => {
      if (!enabledRef()) return;
      input[dir] = on;
    };
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      btn.classList.add('is-pressed');
      set(true);
    });
    const off = () => {
      btn.classList.remove('is-pressed');
      set(false);
    };
    btn.addEventListener('pointerup', off);
    btn.addEventListener('pointercancel', off);
    btn.addEventListener('lostpointercapture', off);
  });
}

export function bindFireButton(btn, input, enabledRef) {
  if (!btn) return;
  const press = (e) => {
    e.preventDefault();
    if (!enabledRef()) return;
    input.fire = true;
    input.firePressed = true;
    btn.classList.add('is-pressed');
  };
  const release = () => {
    input.fire = false;
    btn.classList.remove('is-pressed');
  };
  btn.addEventListener('pointerdown', press);
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener('click', (e) => e.preventDefault());
}

/** 根据输入决定玩家想朝哪走 */
export function desiredPlayerDir(input) {
  if (input.up) return 'up';
  if (input.down) return 'down';
  if (input.left) return 'left';
  if (input.right) return 'right';
  return null;
}

export function consumeFirePressed(input) {
  if (input.firePressed) {
    input.firePressed = false;
    return true;
  }
  return input.fire;
}

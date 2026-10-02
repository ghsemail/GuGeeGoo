/**
 * 输入：键盘 + 触屏
 */
import { DIR } from './constants.js';
import { cycleSelectedItem, selectItemByIndex } from './inventory-select.js';

/** @typedef {{ up: boolean, down: boolean, left: boolean, right: boolean, fire: boolean, firePressed: boolean, useItem: boolean, useItemPressed: boolean, cycleItem: boolean, forward: boolean, forwardPressed: boolean }} InputState */

export function createInputState() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    fire: false,
    firePressed: false,
    useItem: false,
    useItemPressed: false,
    cycleItem: false,
    forward: false,
    forwardPressed: false,
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
    if (down && (e.key === 'k' || e.key === 'K' || e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      input.useItem = true;
      input.useItemPressed = true;
    }
    if (!down && (e.key === 'k' || e.key === 'K' || e.key === 'l' || e.key === 'L')) {
      input.useItem = false;
    }
    if (down && (e.key === 'q' || e.key === 'Q')) {
      e.preventDefault();
      if (!input.cycleItem) {
        input.cycleItem = true;
        cycleSelectedItem(1);
      }
    }
    if (!down && (e.key === 'q' || e.key === 'Q')) {
      input.cycleItem = false;
    }
    if (down && e.key >= '1' && e.key <= '7') {
      e.preventDefault();
      selectItemByIndex(Number(e.key));
    }
    if (down && (e.key === 'e' || e.key === 'E' || e.key === 'Shift')) {
      e.preventDefault();
      input.forward = true;
      input.forwardPressed = true;
    }
    if (!down && (e.key === 'e' || e.key === 'E' || e.key === 'Shift')) {
      input.forward = false;
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

export function bindForwardButton(btn, input, enabledRef) {
  if (!btn) return;
  const press = (e) => {
    e.preventDefault();
    if (!enabledRef()) return;
    input.forward = true;
    input.forwardPressed = true;
    btn.classList.add('is-pressed');
  };
  const release = () => {
    input.forward = false;
    btn.classList.remove('is-pressed');
  };
  btn.addEventListener('pointerdown', press);
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener('click', (e) => e.preventDefault());
}

export function bindUseItemButton(btn, input, enabledRef) {
  if (!btn) return;
  const press = (e) => {
    e.preventDefault();
    if (!enabledRef()) return;
    input.useItem = true;
    input.useItemPressed = true;
    btn.classList.add('is-pressed');
  };
  const release = () => {
    input.useItem = false;
    btn.classList.remove('is-pressed');
  };
  btn.addEventListener('pointerdown', press);
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener('click', (e) => e.preventDefault());
}

export function bindCycleItemButton(btn, enabledRef, onCycle) {
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!enabledRef()) return;
    cycleSelectedItem(1);
    onCycle?.();
  });
}

export function desiredPlayerDir(input) {
  if (input.up) return 'up';
  if (input.down) return 'down';
  if (input.left) return 'left';
  if (input.right) return 'right';
  return null;
}

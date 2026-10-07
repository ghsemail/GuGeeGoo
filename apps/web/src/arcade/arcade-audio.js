/**
 * 轻量游戏音效（Web Audio 合成，无需外部音频文件）
 */
const LS_MUTED = 'gugeegoo_sfx_muted';

/** @type {AudioContext | null} */
let ctx = null;
let unlocked = false;

function getCtx() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!ctx) ctx = new Ctx();
  return ctx;
}

export function isSfxMuted() {
  try {
    return localStorage.getItem(LS_MUTED) === '1';
  } catch {
    return false;
  }
}

export function setSfxMuted(muted) {
  try {
    localStorage.setItem(LS_MUTED, muted ? '1' : '0');
  } catch {
    /* ignore */
  }
  const btn = document.getElementById('sfx-toggle');
  if (btn) btn.textContent = muted ? '🔇' : '🔊';
}

/** 首次点击/按键后解锁 AudioContext（浏览器策略） */
export function initArcadeAudio() {
  if (unlocked) return;
  const unlock = () => {
    const c = getCtx();
    if (c?.state === 'suspended') c.resume();
    unlocked = true;
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
}

/**
 * @param {HTMLElement | null | undefined} header
 */
export function mountSfxToggle(header) {
  const anchor =
    header ||
    document.querySelector(
      '.arcade-header, .plant-header, .snake-header, .tank-header'
    );
  if (!anchor || document.getElementById('sfx-toggle')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'sfx-toggle';
  btn.className = 'sfx-toggle';
  btn.setAttribute('aria-label', '开关音效');
  btn.title = '开关音效';
  btn.textContent = isSfxMuted() ? '🔇' : '🔊';
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSfxMuted(!isSfxMuted());
    if (!isSfxMuted()) playSfx('ui');
  });
  anchor.appendChild(btn);
}

/**
 * @param {GainNode} gain
 * @param {number} t0
 * @param {number} dur
 * @param {number} from
 * @param {number} to
 */
function env(gain, t0, dur, from, to = 0.0001) {
  gain.gain.setValueAtTime(from, t0);
  gain.gain.exponentialRampToValueAtTime(Math.max(to, 0.0001), t0 + dur);
}

/**
 * @param {AudioContext} c
 * @param {'sine'|'square'|'triangle'|'sawtooth'} type
 * @param {number} freq
 * @param {number} t0
 * @param {number} dur
 * @param {number} vol
 */
function tone(c, type, freq, t0, dur, vol) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  env(g, t0, dur, vol);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/**
 * @param {AudioContext} c
 * @param {number} t0
 * @param {number} vol
 */
function noiseBurst(c, t0, vol, dur = 0.12) {
  const bufferSize = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const g = c.createGain();
  const filt = c.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = 680;
  env(g, t0, dur, vol);
  src.connect(filt);
  filt.connect(g);
  g.connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/** @param {string} id */
export function playSfx(id) {
  if (isSfxMuted()) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume();

  const t0 = c.currentTime + 0.001;
  const v = 0.22;

  switch (id) {
    case 'ui':
      tone(c, 'sine', 520, t0, 0.06, v * 0.5);
      break;
    case 'confirm':
      tone(c, 'sine', 660, t0, 0.08, v * 0.55);
      tone(c, 'sine', 880, t0 + 0.06, 0.1, v * 0.45);
      break;
    case 'shoot':
      tone(c, 'square', 220, t0, 0.05, v * 0.35);
      tone(c, 'sawtooth', 440, t0, 0.04, v * 0.2);
      break;
    case 'hit':
      noiseBurst(c, t0, v * 0.45, 0.08);
      tone(c, 'triangle', 140, t0, 0.1, v * 0.35);
      break;
    case 'explosion':
      noiseBurst(c, t0, v * 0.7, 0.22);
      tone(c, 'sine', 90, t0, 0.25, v * 0.5);
      break;
    case 'pickup':
      tone(c, 'sine', 740, t0, 0.07, v * 0.4);
      tone(c, 'sine', 980, t0 + 0.05, 0.09, v * 0.35);
      break;
    case 'win':
      tone(c, 'sine', 523, t0, 0.12, v * 0.45);
      tone(c, 'sine', 659, t0 + 0.1, 0.12, v * 0.45);
      tone(c, 'sine', 784, t0 + 0.2, 0.18, v * 0.5);
      break;
    case 'lose':
      tone(c, 'triangle', 220, t0, 0.2, v * 0.45);
      tone(c, 'triangle', 165, t0 + 0.15, 0.28, v * 0.4);
      break;
    case 'whack':
      tone(c, 'square', 180, t0, 0.07, v * 0.55);
      noiseBurst(c, t0, v * 0.25, 0.05);
      break;
    case 'whack-gold':
      tone(c, 'sine', 880, t0, 0.08, v * 0.45);
      tone(c, 'sine', 1175, t0 + 0.06, 0.12, v * 0.4);
      break;
    case 'whack-bomb':
      noiseBurst(c, t0, v * 0.65, 0.18);
      tone(c, 'sawtooth', 70, t0, 0.3, v * 0.55);
      break;
    case 'brick':
      tone(c, 'triangle', 280 + Math.random() * 90, t0, 0.09, v * 0.48);
      noiseBurst(c, t0 + 0.01, v * 0.18, 0.04);
      break;
    case 'paddle':
      tone(c, 'sine', 260, t0, 0.05, v * 0.35);
      break;
    case 'merge':
      tone(c, 'sine', 360, t0, 0.06, v * 0.35);
      break;
    case 'merge-big':
      tone(c, 'sine', 440, t0, 0.08, v * 0.42);
      tone(c, 'sine', 554, t0 + 0.07, 0.1, v * 0.38);
      break;
    case 'plant-water':
      tone(c, 'sine', 520, t0, 0.05, v * 0.3);
      noiseBurst(c, t0 + 0.02, v * 0.2, 0.14);
      break;
    case 'plant-feed':
      tone(c, 'triangle', 620, t0, 0.07, v * 0.35);
      tone(c, 'sine', 830, t0 + 0.06, 0.1, v * 0.32);
      break;
    case 'plant-sun':
      tone(c, 'sine', 700, t0, 0.1, v * 0.35);
      break;
    case 'eat':
      tone(c, 'sine', 600, t0, 0.06, v * 0.4);
      tone(c, 'sine', 720, t0 + 0.05, 0.08, v * 0.35);
      break;
    default:
      tone(c, 'sine', 440, t0, 0.05, v * 0.3);
  }
}

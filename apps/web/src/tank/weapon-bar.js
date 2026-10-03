/**
 * 对局内武器栏：每种道具独立按钮 + 顶栏徽章
 */
import { SHOP_ITEMS } from './items.js';
import { getItemCount } from './storage.js';
import { tryUseItemById } from './consumables.js';

const PRIMARY = new Set(['item_missile', 'item_mine', 'item_freeze']);

function shortLabel(name) {
  if (name.length <= 4) return name;
  return name.replace(/弹匣$/, '').slice(0, 4);
}

/**
 * @param {HTMLElement} host
 * @param {() => object | null} getGameState
 * @param {() => void} [onChange]
 */
export function mountWeaponBar(host, getGameState, onChange) {
  if (!host) return;
  host.innerHTML = '';
  host.classList.add('weapon-bar');
  for (const item of SHOP_ITEMS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `weapon-btn game-touch-btn${PRIMARY.has(item.id) ? ' weapon-btn-primary' : ' weapon-btn-mini'}`;
    btn.dataset.itemId = item.id;
    btn.setAttribute('aria-label', `${item.name}，点击使用`);
    btn.innerHTML = `
      <span class="weapon-emoji" aria-hidden="true">${item.emoji}</span>
      <span class="weapon-label">${shortLabel(item.name)}</span>
      <span class="weapon-badge">0</span>`;
    const press = (e) => {
      e.preventDefault();
      const game = getGameState();
      if (!game || game.phase !== 'playing' || game.paused) return;
      if (tryUseItemById(game, item.id)) onChange?.();
    };
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('click', (e) => e.preventDefault());
    host.appendChild(btn);
  }
  refreshWeaponBar(host);
  refreshHudArmory(document.getElementById('hud-armory'));
}

export function refreshWeaponBar(host) {
  if (!host) return;
  host.querySelectorAll('.weapon-btn').forEach((btn) => {
    const id = btn.dataset.itemId;
    const n = getItemCount(id);
    const badge = btn.querySelector('.weapon-badge');
    if (badge) badge.textContent = String(n);
    btn.disabled = n <= 0;
    btn.classList.toggle('is-empty', n <= 0);
  });
  refreshHudArmory(document.getElementById('hud-armory'));
}

export function refreshHudArmory(container) {
  if (!container) return;
  container.innerHTML = SHOP_ITEMS.map((item) => {
    const n = getItemCount(item.id);
    return `<span class="hud-weapon-chip${n <= 0 ? ' is-empty' : ''}" title="${item.name}">${item.emoji}<b>${n}</b></span>`;
  }).join('');
}

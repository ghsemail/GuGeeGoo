/**
 * 对局内武器栏：每种道具独立按钮 + 顶栏徽章
 */
import { SHOP_ITEMS } from './items.js';
import { getItemCount } from './storage.js';
import { tryUseItemById } from './consumables.js';

const PRIMARY = new Set(['item_missile', 'item_mine', 'item_freeze']);

const MINI_LABEL = {
  item_rapid: '连发',
  item_shield: '护盾',
  item_life: '加命',
  item_armor: '穿甲',
};

function buttonLabel(item) {
  if (PRIMARY.has(item.id)) return item.name;
  return MINI_LABEL[item.id] || item.name.slice(0, 2);
}

function createWeaponButton(item, getGameState, onChange) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `weapon-btn game-touch-btn${PRIMARY.has(item.id) ? ' weapon-btn-primary' : ' weapon-btn-mini'}`;
  btn.dataset.itemId = item.id;
  btn.setAttribute('aria-label', `${item.name}，点击使用`);
  const showLabel = PRIMARY.has(item.id);
  btn.innerHTML = `
      <span class="weapon-emoji" aria-hidden="true">${item.emoji}</span>
      ${showLabel ? `<span class="weapon-label">${buttonLabel(item)}</span>` : ''}
      <span class="weapon-badge">0</span>`;
  const press = (e) => {
    e.preventDefault();
    const game = getGameState();
    if (!game || game.phase !== 'playing' || game.paused) return;
    if (tryUseItemById(game, item.id)) onChange?.();
  };
  btn.addEventListener('pointerdown', press);
  btn.addEventListener('click', (e) => e.preventDefault());
  return btn;
}

/**
 * @param {HTMLElement} host
 * @param {() => object | null} getGameState
 * @param {() => void} [onChange]
 */
export function mountWeaponBar(host, getGameState, onChange) {
  if (!host) return;
  host.innerHTML = '';
  host.classList.add('weapon-bar-host-inner');
  const bar = document.createElement('div');
  bar.className = 'weapon-bar';

  const rowPrimary = document.createElement('div');
  rowPrimary.className = 'weapon-row weapon-row-primary';
  const rowMini = document.createElement('div');
  rowMini.className = 'weapon-row weapon-row-mini';

  for (const item of SHOP_ITEMS) {
    const btn = createWeaponButton(item, getGameState, onChange);
    if (PRIMARY.has(item.id)) rowPrimary.appendChild(btn);
    else rowMini.appendChild(btn);
  }

  bar.appendChild(rowPrimary);
  bar.appendChild(rowMini);
  host.appendChild(bar);
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

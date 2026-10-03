import { SHOP_ITEMS } from './items.js';
import { getItemCount } from './storage.js';
import { escapeHtml } from './ui-shop.js';

export function renderTankArmory({ armoryList }) {
  armoryList.innerHTML = '';
  for (const item of SHOP_ITEMS) {
    const count = getItemCount(item.id);
    const li = document.createElement('li');
    li.className = 'armory-card';
    li.innerHTML = `
      <span class="armory-emoji" aria-hidden="true">${item.emoji}</span>
      <div class="armory-body">
        <div class="armory-name">${escapeHtml(item.name)} <span class="armory-count">×${count}</span></div>
        <p class="armory-desc">${escapeHtml(item.description)}</p>
      </div>`;
    armoryList.appendChild(li);
  }
}

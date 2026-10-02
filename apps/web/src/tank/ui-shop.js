import { buyItem, getShopItemState } from './shop.js';
import { getSpendableBalance, getLifetimeEarned } from './storage.js';

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderTankShop({ shopList, shopMsg, onRefresh }) {
  shopList.innerHTML = '';
  for (const st of [getShopItemState('item_missile')].filter(Boolean)) {
    const { item, count, canBuy } = st;
    const disabled =
      !canBuy.ok &&
      (canBuy.reason === 'insufficient' || canBuy.reason === 'full')
        ? 'disabled'
        : '';
    const li = document.createElement('li');
    li.className = 'shop-item';
    li.innerHTML = `
        <span class="shop-item-emoji">${item.emoji}</span>
        <div>
          <div class="shop-item-name">${escapeHtml(item.name)} <span class="shop-tag">×${count}</span></div>
          <div class="shop-item-desc">${escapeHtml(item.description)}</div>
          <div class="shop-item-price">${item.price} 积分 / 个</div>
        </div>
        <button type="button" class="btn btn-mini" data-buy="${escapeHtml(item.id)}" ${disabled}>购买</button>`;
    shopList.appendChild(li);
  }

  shopList.querySelectorAll('[data-buy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-buy');
      shopMsg.textContent = '';
      const r = buyItem(id);
      if (!r.ok) {
        const msg = {
          insufficient: '积分不够，多玩几局再来～',
          full: '背包已满，先用完再买。',
        };
        shopMsg.textContent = msg[r.reason] || '暂时买不了';
        return;
      }
      shopMsg.textContent = `买到 ${r.item.emoji} ${r.item.name}！现在有 ${r.count} 枚。`;
      onRefresh?.();
      renderTankShop({ shopList, shopMsg, onRefresh });
    });
  });
}

export function refreshWalletDisplays(els) {
  const bal = String(getSpendableBalance());
  const life = String(getLifetimeEarned());
  if (els.shopBalance) els.shopBalance.textContent = bal;
  if (els.shopLifetime) els.shopLifetime.textContent = life;
  if (els.menuBalance) els.menuBalance.textContent = bal;
  if (els.menuLifetime) els.menuLifetime.textContent = life;
}

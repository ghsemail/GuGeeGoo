/**
 * 主菜单 / 选关 / 商店 / 武器库 渲染
 */
import { TOTAL_LEVELS, getLevel } from './levels.js';
import { getLevelStat, difficultyLabel } from './level-progress.js';
import {
  ITEMS,
  redeemItem,
  canRedeemItem,
  equipToggle,
  toggleLoadout,
  getShopItemState,
} from './shop.js';
import { isCosmetic, isConsumable } from './items.js';
import {
  WEAPONS,
  buyWeapon,
  equipWeapon,
  getWeaponShopState,
} from './weapon-shop.js';

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderLevelGrid(container, onPickLevel) {
  if (!container) return;
  const cards = [];
  for (let i = 0; i < TOTAL_LEVELS; i++) {
    const lv = getLevel(i);
    const st = getLevelStat(lv.id);
    const diff = difficultyLabel(lv.id);
    const cleared = st.cleared ? '已通关' : '未通关';
    const best =
      st.bestScore > 0 ? `最佳 ${st.bestScore} 分` : '还没记录';
    cards.push(`
      <button type="button" class="level-card" data-level="${i}">
        <span class="level-card-num">第 ${lv.id} 关</span>
        <span class="level-card-name">${escapeHtml(lv.name)}</span>
        <span class="level-card-meta">${diff} · ${cleared}</span>
        <span class="level-card-best">${best}</span>
      </button>`);
  }
  container.innerHTML = cards.join('');
  container.querySelectorAll('[data-level]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-level'));
      if (Number.isFinite(idx)) onPickLevel(idx);
    });
  });
}

export function renderItemShopList(el, hooks) {
  const { shopList, shopMsg, onAfterChange } = hooks;
  shopList.innerHTML = ITEMS.map((item) => {
    const st = getShopItemState(item.id);
    if (!st) return '';

    let meta = '';
    if (isCosmetic(item) && st.count > 0) {
      meta = st.equipped
        ? '<span class="shop-tag on">已装备</span>'
        : '<span class="shop-tag">已拥有</span>';
    } else if (isConsumable(item) && st.count > 0) {
      meta = `<span class="shop-tag">×${st.count}</span>`;
      if (st.inLoadout) meta += '<span class="shop-tag on">下关</span>';
    }

    const buyCheck = canRedeemItem(item.id);
    const buyDisabled =
      !buyCheck.ok &&
      (buyCheck.reason === 'insufficient' ||
        buyCheck.reason === 'owned' ||
        buyCheck.reason === 'full')
        ? 'disabled'
        : '';

    let extraBtn = '';
    if (isCosmetic(item) && st.count > 0) {
      extraBtn = `<button type="button" class="btn btn-mini" data-equip="${escapeHtml(item.id)}">${st.equipped ? '卸下' : '装备'}</button>`;
    } else if (isConsumable(item) && st.count > 0) {
      extraBtn = `<button type="button" class="btn btn-mini" data-loadout="${escapeHtml(item.id)}">${st.inLoadout ? '取消下关' : '下关使用'}</button>`;
    }

    return `
      <li class="shop-item">
        <span class="shop-item-emoji">${item.emoji}</span>
        <div>
          <div class="shop-item-name">${escapeHtml(item.name)} ${meta}</div>
          <div class="shop-item-desc">${escapeHtml(item.description)}</div>
          <div class="shop-item-price">${item.price} 积分</div>
        </div>
        <div class="shop-item-action shop-item-actions">
          <button type="button" class="btn btn-mini" data-buy="${escapeHtml(item.id)}" ${buyDisabled}>兑换</button>
          ${extraBtn}
        </div>
      </li>`;
  }).join('');

  shopList.querySelectorAll('[data-buy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-buy');
      shopMsg.textContent = '';
      const result = await redeemItem(id);
      if (!result.ok) {
        const msg = {
          insufficient: '积分不够哦，多玩几局再来～',
          owned: '永久道具买一次就够啦！',
          full: '这个道具背包已满。',
        };
        shopMsg.textContent = msg[result.reason] || '暂时无法兑换';
        return;
      }
      shopMsg.textContent = `兑换成功：${result.item.emoji} ${result.item.name}`;
      onAfterChange?.();
      renderItemShopList(el, hooks);
    });
  });

  shopList.querySelectorAll('[data-equip]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-equip');
      await equipToggle(id);
      onAfterChange?.();
      renderItemShopList(el, hooks);
    });
  });

  shopList.querySelectorAll('[data-loadout]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-loadout');
      const r = await toggleLoadout(id);
      if (!r.ok) {
        shopMsg.textContent = '先兑换至少 1 个再用「下关使用」哦';
        return;
      }
      shopMsg.textContent = '已选好下关要带的道具！';
      renderItemShopList(el, hooks);
    });
  });
}

export function renderWeaponShopList(hooks) {
  const { weaponList, weaponMsg, onAfterChange } = hooks;
  weaponList.innerHTML = WEAPONS.map((w) => {
    const st = getWeaponShopState(w.id);
    let meta = '';
    if (st.owned) {
      meta = st.equipped
        ? '<span class="shop-tag on">已装备</span>'
        : '<span class="shop-tag">已拥有</span>';
    }
    const priceLabel = w.price === 0 ? '免费' : `${w.price} 积分`;
    const ammoHint = `每关 ${w.ammoPerLevel} 发`;

    let actions = '';
    if (st.owned) {
      actions = `<button type="button" class="btn btn-mini" data-equip-weapon="${escapeHtml(w.id)}">${st.equipped ? '已装备' : '装备'}</button>`;
    } else {
      actions = `<button type="button" class="btn btn-mini" data-buy-weapon="${escapeHtml(w.id)}">购买</button>`;
    }

    return `
      <li class="shop-item">
        <span class="shop-item-emoji">${w.emoji}</span>
        <div>
          <div class="shop-item-name">${escapeHtml(w.name)} ${meta}</div>
          <div class="shop-item-desc">${escapeHtml(w.description)}</div>
          <div class="shop-item-price">${priceLabel} · ${ammoHint}</div>
        </div>
        <div class="shop-item-actions">${actions}</div>
      </li>`;
  }).join('');

  weaponList.querySelectorAll('[data-buy-weapon]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-buy-weapon');
      weaponMsg.textContent = '';
      const r = await buyWeapon(id);
      if (!r.ok) {
        const msg = {
          insufficient: '积分不够，先去赚积分吧～',
          owned: '已经买过了，点「装备」就行。',
        };
        weaponMsg.textContent = msg[r.reason] || '暂时买不了';
        return;
      }
      weaponMsg.textContent = `获得 ${r.weapon.emoji} ${r.weapon.name}，已自动装备！`;
      onAfterChange?.();
      renderWeaponShopList(hooks);
    });
  });

  weaponList.querySelectorAll('[data-equip-weapon]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-equip-weapon');
      const st = getWeaponShopState(id);
      if (st.equipped) {
        weaponMsg.textContent = '已经是当前武器啦';
        return;
      }
      const r = await equipWeapon(id);
      if (!r.ok) {
        weaponMsg.textContent = '还没买到这把武器哦';
        return;
      }
      weaponMsg.textContent = '已换好武器，下一局生效！';
      onAfterChange?.();
      renderWeaponShopList(hooks);
    });
  });
}

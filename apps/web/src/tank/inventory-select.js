/**
 * 对局里当前选中的道具（localStorage）
 */
import { SHOP_ITEMS } from './items.js';
import { getItemCount } from './storage.js';

const LS_SELECTED = 'gugeegoo_tank_selected_item';

export function getSelectedItemId() {
  const saved = localStorage.getItem(LS_SELECTED);
  if (saved && getItemCount(saved) > 0) return saved;
  const first = SHOP_ITEMS.find((i) => getItemCount(i.id) > 0);
  return first?.id || SHOP_ITEMS[0].id;
}

export function setSelectedItemId(itemId) {
  if (!SHOP_ITEMS.some((i) => i.id === itemId)) return;
  localStorage.setItem(LS_SELECTED, itemId);
}

/** @param {1|-1} dir */
export function cycleSelectedItem(dir = 1) {
  const ids = SHOP_ITEMS.map((i) => i.id);
  let idx = Math.max(0, ids.indexOf(getSelectedItemId()));
  for (let n = 0; n < ids.length; n++) {
    idx = (idx + dir + ids.length) % ids.length;
    if (getItemCount(ids[idx]) > 0) {
      setSelectedItemId(ids[idx]);
      return ids[idx];
    }
  }
  setSelectedItemId(ids[idx]);
  return ids[idx];
}

export function selectItemByIndex(oneBased) {
  const item = SHOP_ITEMS[oneBased - 1];
  if (item) setSelectedItemId(item.id);
  return item?.id;
}

export function getSelectedItemHud() {
  const id = getSelectedItemId();
  const item = SHOP_ITEMS.find((i) => i.id === id);
  const count = getItemCount(id);
  return { id, item, count };
}

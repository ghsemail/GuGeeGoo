/**
 * 坦克大战 · 积分与道具库存（与贪吃蛇分开的 localStorage 键）
 */

const LS_LIFETIME_EARNED = 'gugeegoo_tank_lifetime_earned';
const LS_LIFETIME_SPENT = 'gugeegoo_tank_lifetime_spent';
const LS_INVENTORY = 'gugeegoo_tank_inventory';
const LS_BEST = 'gugeegoo_tank_best_score';

const MAX_POINTS = 9_999_999;

function clampPoints(n) {
  return Math.min(MAX_POINTS, Math.max(0, Math.floor(Number(n) || 0)));
}

export function getLifetimeEarned() {
  return Number(localStorage.getItem(LS_LIFETIME_EARNED) || 0) || 0;
}

export function getLifetimeSpent() {
  return Number(localStorage.getItem(LS_LIFETIME_SPENT) || 0) || 0;
}

export function getSpendableBalance() {
  return Math.max(0, getLifetimeEarned() - getLifetimeSpent());
}

/** 本局新得分入账（只加增量，避免重复计入） */
export function addLifetimePoints(delta) {
  const add = clampPoints(delta);
  if (add <= 0) return getWalletSnapshot();
  const earned = clampPoints(getLifetimeEarned() + add);
  localStorage.setItem(LS_LIFETIME_EARNED, String(earned));
  return getWalletSnapshot();
}

export function spendPoints(amount) {
  const cost = clampPoints(amount);
  if (cost <= 0) return { ok: false, reason: 'invalid' };
  if (getSpendableBalance() < cost) {
    return { ok: false, reason: 'insufficient' };
  }
  localStorage.setItem(
    LS_LIFETIME_SPENT,
    String(clampPoints(getLifetimeSpent() + cost))
  );
  return { ok: true, ...getWalletSnapshot() };
}

export function getInventoryCounts() {
  try {
    const raw = localStorage.getItem(LS_INVENTORY);
    const obj = raw ? JSON.parse(raw) : {};
    if (!obj || typeof obj !== 'object') return {};
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      const n = Math.floor(Number(v) || 0);
      if (n > 0) out[k] = n;
    }
    return out;
  } catch {
    return {};
  }
}

function setInventoryCounts(counts) {
  localStorage.setItem(LS_INVENTORY, JSON.stringify(counts));
}

export function getItemCount(itemId) {
  return getInventoryCounts()[itemId] || 0;
}

export function addInventoryItem(itemId, amount = 1) {
  const inv = getInventoryCounts();
  inv[itemId] = (inv[itemId] || 0) + amount;
  setInventoryCounts(inv);
  return inv[itemId];
}

export function consumeInventoryItem(itemId) {
  const inv = getInventoryCounts();
  const n = inv[itemId] || 0;
  if (n <= 0) return false;
  if (n === 1) delete inv[itemId];
  else inv[itemId] = n - 1;
  setInventoryCounts(inv);
  return true;
}

export function getLocalBestScore() {
  return Number(localStorage.getItem(LS_BEST) || 0) || 0;
}

export function saveBestScore(score) {
  const next = Math.max(getLocalBestScore(), score);
  localStorage.setItem(LS_BEST, String(next));
  return next;
}

export function getWalletSnapshot() {
  return {
    lifetimeEarned: getLifetimeEarned(),
    lifetimeSpent: getLifetimeSpent(),
    spendableBalance: getSpendableBalance(),
    inventory: getInventoryCounts(),
  };
}

export { LS_BEST };

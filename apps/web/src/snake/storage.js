/**
 * 本地存档 + 可选 Cloudflare KV API（失败时只用 localStorage）
 */

const LS_PLAYER_ID = 'gugeegoo_snake_player_id';
const LS_NICKNAME = 'gugeegoo_snake_nickname';
const LS_BEST = 'gugeegoo_snake_best_score';
const LS_MAX_LEVEL = 'gugeegoo_snake_max_level';
const LS_LIFETIME_EARNED = 'gugeegoo_snake_lifetime_earned';
const LS_LIFETIME_SPENT = 'gugeegoo_snake_lifetime_spent';
const LS_OWNED_ITEMS = 'gugeegoo_snake_owned_items';
const LS_INVENTORY = 'gugeegoo_snake_inventory';
const LS_EQUIPPED = 'gugeegoo_snake_equipped';
const LS_LOADOUT = 'gugeegoo_snake_loadout';

const DEFAULT_NICK = '景源';
const MAX_NICK_LEN = 12;
const MAX_POINTS = 9_999_999;

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getPlayerId() {
  let id = localStorage.getItem(LS_PLAYER_ID);
  if (!id) {
    id = randomId();
    localStorage.setItem(LS_PLAYER_ID, id);
  }
  return id;
}

export function getNickname() {
  const n = localStorage.getItem(LS_NICKNAME);
  return n && n.trim() ? n.trim().slice(0, MAX_NICK_LEN) : DEFAULT_NICK;
}

export function setNickname(name) {
  const trimmed = String(name || DEFAULT_NICK).trim().slice(0, MAX_NICK_LEN);
  localStorage.setItem(LS_NICKNAME, trimmed || DEFAULT_NICK);
  return trimmed || DEFAULT_NICK;
}

export function getLocalBestScore() {
  return Number(localStorage.getItem(LS_BEST) || 0) || 0;
}

export function getLocalMaxLevel() {
  return Number(localStorage.getItem(LS_MAX_LEVEL) || 1) || 1;
}

/** 累计积分：历史上所有已入账的本局得分总和（只增不减） */
export function getLifetimeEarned() {
  return Number(localStorage.getItem(LS_LIFETIME_EARNED) || 0) || 0;
}

/** 已在商店花掉的积分 */
export function getLifetimeSpent() {
  return Number(localStorage.getItem(LS_LIFETIME_SPENT) || 0) || 0;
}

/** 可用积分 = 累计入账 − 已消费（商店扣这里） */
export function getSpendableBalance() {
  return Math.max(0, getLifetimeEarned() - getLifetimeSpent());
}

function clampPoints(n) {
  return Math.min(MAX_POINTS, Math.max(0, Math.floor(Number(n) || 0)));
}

function migrateLegacyOwned() {
  try {
    const raw = localStorage.getItem(LS_OWNED_ITEMS);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || !arr.length) return;
    const inv = getInventoryCounts();
    for (const id of arr) {
      if (typeof id === 'string' && !inv[id]) {
        inv[id] = 1;
      }
    }
    setInventoryCounts(inv);
    localStorage.removeItem(LS_OWNED_ITEMS);
  } catch {
    /* ignore */
  }
}

/** @returns {Record<string, number>} */
export function getInventoryCounts() {
  migrateLegacyOwned();
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
  return counts;
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

/** 消耗 1 个，成功返回 true */
export function consumeInventoryItem(itemId) {
  const inv = getInventoryCounts();
  const n = inv[itemId] || 0;
  if (n <= 0) return false;
  if (n === 1) delete inv[itemId];
  else inv[itemId] = n - 1;
  setInventoryCounts(inv);
  return true;
}

/** @returns {string[]} */
export function getEquippedCosmeticIds() {
  try {
    const raw = localStorage.getItem(LS_EQUIPPED);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function toggleEquippedCosmetic(itemId) {
  const set = new Set(getEquippedCosmeticIds());
  if (set.has(itemId)) set.delete(itemId);
  else set.add(itemId);
  const next = [...set];
  localStorage.setItem(LS_EQUIPPED, JSON.stringify(next));
  return next;
}

/** 下关要带的消耗品 id 列表（每种最多 1 个） */
export function getLoadoutIds() {
  try {
    const raw = localStorage.getItem(LS_LOADOUT);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function toggleLoadoutConsumable(itemId) {
  const current = getLoadoutIds();
  if (current.includes(itemId)) {
    const next = current.filter((id) => id !== itemId);
    localStorage.setItem(LS_LOADOUT, JSON.stringify(next));
    return next;
  }
  if (getItemCount(itemId) <= 0) return current;
  const next = [...current, itemId];
  localStorage.setItem(LS_LOADOUT, JSON.stringify(next));
  return next;
}

export function clearLoadout() {
  localStorage.setItem(LS_LOADOUT, JSON.stringify([]));
}

/** 兼容旧代码 */
export function getOwnedItemIds() {
  return Object.keys(getInventoryCounts());
}

function saveLocalRunStats(bestScore, maxLevel) {
  const prevBest = getLocalBestScore();
  const prevMax = getLocalMaxLevel();
  const nextBest = Math.max(prevBest, bestScore);
  const nextMax = Math.max(prevMax, maxLevel);
  localStorage.setItem(LS_BEST, String(nextBest));
  localStorage.setItem(LS_MAX_LEVEL, String(nextMax));
  return { bestScore: nextBest, maxLevel: nextMax };
}

/** 本局得分入账（过关或结束时调用，按增量避免重复计入） */
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
  const spent = clampPoints(getLifetimeSpent() + cost);
  localStorage.setItem(LS_LIFETIME_SPENT, String(spent));
  return { ok: true, ...getWalletSnapshot() };
}

export function getWalletSnapshot() {
  return {
    lifetimeEarned: getLifetimeEarned(),
    lifetimeSpent: getLifetimeSpent(),
    spendableBalance: getSpendableBalance(),
    ownedItemIds: getOwnedItemIds(),
    inventory: getInventoryCounts(),
    equippedIds: getEquippedCosmeticIds(),
    loadoutIds: getLoadoutIds(),
  };
}

function mergeWalletFromRemote(remote) {
  if (!remote || typeof remote !== 'object') return getWalletSnapshot();

  const localEarned = getLifetimeEarned();
  const localSpent = getLifetimeSpent();
  const remoteEarned = clampPoints(remote.lifetimeEarned);
  const remoteSpent = clampPoints(remote.lifetimeSpent);

  const earned = Math.max(localEarned, remoteEarned);
  const spent = Math.max(localSpent, remoteSpent);
  if (earned > localEarned) {
    localStorage.setItem(LS_LIFETIME_EARNED, String(earned));
  }
  if (spent > localSpent) {
    localStorage.setItem(LS_LIFETIME_SPENT, String(spent));
  }

  const localInv = getInventoryCounts();
  const remoteInv =
    remote.inventory && typeof remote.inventory === 'object'
      ? remote.inventory
      : {};
  const mergedInv = { ...localInv };
  for (const [id, count] of Object.entries(remoteInv)) {
    const n = Math.floor(Number(count) || 0);
    mergedInv[id] = Math.max(mergedInv[id] || 0, n);
  }
  if (Array.isArray(remote.ownedItemIds)) {
    for (const id of remote.ownedItemIds) {
      if (typeof id === 'string') {
        mergedInv[id] = Math.max(mergedInv[id] || 0, 1);
      }
    }
  }
  setInventoryCounts(mergedInv);

  const mergeList = (local, remote) => {
    const a = Array.isArray(local) ? local : [];
    const b = Array.isArray(remote) ? remote : [];
    return [...new Set([...a, ...b])];
  };
  localStorage.setItem(
    LS_EQUIPPED,
    JSON.stringify(mergeList(getEquippedCosmeticIds(), remote.equippedIds))
  );
  localStorage.setItem(
    LS_LOADOUT,
    JSON.stringify(mergeList(getLoadoutIds(), remote.loadoutIds))
  );

  return getWalletSnapshot();
}

async function fetchJson(url, options) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

/** 启动时拉取云端进度（可选） */
export async function loadRemoteProgress() {
  const playerId = getPlayerId();
  try {
    const data = await fetchJson(
      `/api/game/stats?playerId=${encodeURIComponent(playerId)}`
    );
    if (typeof data.bestScore === 'number') {
      saveLocalRunStats(data.bestScore, data.maxLevel ?? 1);
    }
    if (data.nickname) {
      setNickname(data.nickname);
    }
    mergeWalletFromRemote(data);
    return data;
  } catch {
    return null;
  }
}

/** 过关或游戏结束时写入（仅此时调用，不每帧写） */
export async function persistProgress({
  score,
  levelUnlocked,
  nickname,
  wallet,
}) {
  const nick = setNickname(nickname ?? getNickname());
  const local = saveLocalRunStats(score, levelUnlocked);
  const snap = wallet ?? getWalletSnapshot();

  try {
    const data = await fetchJson('/api/game/save', {
      method: 'POST',
      body: JSON.stringify({
        playerId: getPlayerId(),
        nickname: nick,
        bestScore: local.bestScore,
        maxLevel: local.maxLevel,
        lastScore: score,
        lifetimeEarned: snap.lifetimeEarned,
        lifetimeSpent: snap.lifetimeSpent,
        ownedItemIds: snap.ownedItemIds,
        inventory: snap.inventory,
        equippedIds: snap.equippedIds,
        loadoutIds: snap.loadoutIds,
      }),
    });
    if (data.lifetimeEarned != null) {
      mergeWalletFromRemote(data);
    }
    return { ...local, remote: true, leaderboard: data.leaderboard, wallet: getWalletSnapshot() };
  } catch {
    return { ...local, remote: false, wallet: snap };
  }
}

/** 仅同步钱包（兑换道具后） */
export async function persistWallet() {
  const snap = getWalletSnapshot();
  try {
    const data = await fetchJson('/api/game/save', {
      method: 'POST',
      body: JSON.stringify({
        playerId: getPlayerId(),
        nickname: getNickname(),
        bestScore: getLocalBestScore(),
        maxLevel: getLocalMaxLevel(),
        lastScore: 0,
        lifetimeEarned: snap.lifetimeEarned,
        lifetimeSpent: snap.lifetimeSpent,
        ownedItemIds: snap.ownedItemIds,
        inventory: snap.inventory,
        equippedIds: snap.equippedIds,
        loadoutIds: snap.loadoutIds,
      }),
    });
    mergeWalletFromRemote(data);
    return { remote: true, wallet: getWalletSnapshot() };
  } catch {
    return { remote: false, wallet: snap };
  }
}

/** 排行榜（失败返回空数组） */
export async function fetchLeaderboard() {
  try {
    const data = await fetchJson('/api/game/leaderboard');
    return Array.isArray(data.entries) ? data.entries : [];
  } catch {
    return [];
  }
}

export { DEFAULT_NICK, MAX_NICK_LEN };

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

/** @returns {string[]} */
export function getOwnedItemIds() {
  try {
    const raw = localStorage.getItem(LS_OWNED_ITEMS);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function setOwnedItemIds(ids) {
  const unique = [...new Set(ids.filter((id) => typeof id === 'string'))];
  localStorage.setItem(LS_OWNED_ITEMS, JSON.stringify(unique));
  return unique;
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

export function recordOwnedItem(itemId) {
  const ids = getOwnedItemIds();
  if (!ids.includes(itemId)) {
    setOwnedItemIds([...ids, itemId]);
  }
  return getOwnedItemIds();
}

export function getWalletSnapshot() {
  return {
    lifetimeEarned: getLifetimeEarned(),
    lifetimeSpent: getLifetimeSpent(),
    spendableBalance: getSpendableBalance(),
    ownedItemIds: getOwnedItemIds(),
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

  const remoteOwned = Array.isArray(remote.ownedItemIds)
    ? remote.ownedItemIds
    : [];
  const mergedOwned = [...new Set([...getOwnedItemIds(), ...remoteOwned])];
  setOwnedItemIds(mergedOwned);

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

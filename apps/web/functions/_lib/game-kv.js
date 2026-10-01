/**
 * KV 读写与排行榜（服务端校验）
 */

const MAX_NICK = 12;
const MAX_SCORE = 999_999;
const MAX_LEVEL = 15;
const MAX_POINTS = 9_999_999;
const LEADERBOARD_KEY = 'leaderboard:v1';
const MAX_LB = 10;
const MAX_OWNED_ITEMS = 32;

export function clampStats(input) {
  const bestScore = Math.min(
    MAX_SCORE,
    Math.max(0, Math.floor(Number(input.bestScore) || 0))
  );
  const maxLevel = Math.min(
    MAX_LEVEL,
    Math.max(1, Math.floor(Number(input.maxLevel) || 1))
  );
  const lastScore = Math.min(
    MAX_SCORE,
    Math.max(0, Math.floor(Number(input.lastScore) || 0))
  );
  const lifetimeEarned = Math.min(
    MAX_POINTS,
    Math.max(0, Math.floor(Number(input.lifetimeEarned) || 0))
  );
  const lifetimeSpent = Math.min(
    MAX_POINTS,
    Math.max(0, Math.floor(Number(input.lifetimeSpent) || 0))
  );
  let ownedItemIds = [];
  if (Array.isArray(input.ownedItemIds)) {
    ownedItemIds = input.ownedItemIds
      .filter((id) => typeof id === 'string')
      .slice(0, MAX_OWNED_ITEMS)
      .map((id) => id.slice(0, 48));
  }
  let inventory = {};
  if (input.inventory && typeof input.inventory === 'object') {
    for (const [key, val] of Object.entries(input.inventory)) {
      if (typeof key !== 'string') continue;
      const n = Math.min(99, Math.max(0, Math.floor(Number(val) || 0)));
      if (n > 0) inventory[key.slice(0, 48)] = n;
    }
  }
  let equippedIds = [];
  if (Array.isArray(input.equippedIds)) {
    equippedIds = input.equippedIds
      .filter((id) => typeof id === 'string')
      .slice(0, 8)
      .map((id) => id.slice(0, 48));
  }
  let loadoutIds = [];
  if (Array.isArray(input.loadoutIds)) {
    loadoutIds = input.loadoutIds
      .filter((id) => typeof id === 'string')
      .slice(0, 8)
      .map((id) => id.slice(0, 48));
  }
  let nickname = String(input.nickname || '景源').trim();
  if (!nickname) nickname = '景源';
  nickname = nickname.slice(0, MAX_NICK);
  const playerId = String(input.playerId || '').slice(0, 64);
  const spentClamped = Math.min(lifetimeSpent, lifetimeEarned);
  return {
    bestScore,
    maxLevel,
    lastScore,
    lifetimeEarned,
    lifetimeSpent: spentClamped,
    ownedItemIds,
    inventory,
    equippedIds,
    loadoutIds,
    nickname,
    playerId,
  };
}

function mergeInventory(a, b) {
  const out = { ...(a || {}) };
  for (const [id, count] of Object.entries(b || {})) {
    const n = Math.floor(Number(count) || 0);
    out[id] = Math.max(out[id] || 0, n);
  }
  return out;
}

function playerKey(playerId) {
  return `player:${playerId}`;
}

export async function readPlayer(kv, playerId) {
  if (!kv || !playerId) return null;
  const raw = await kv.get(playerKey(playerId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function writePlayer(kv, data) {
  if (!kv || !data.playerId) return;
  const payload = {
    nickname: data.nickname,
    bestScore: data.bestScore,
    maxLevel: data.maxLevel,
    lifetimeEarned: data.lifetimeEarned ?? 0,
    lifetimeSpent: data.lifetimeSpent ?? 0,
    ownedItemIds: data.ownedItemIds ?? [],
    inventory: data.inventory ?? {},
    equippedIds: data.equippedIds ?? [],
    loadoutIds: data.loadoutIds ?? [],
    updatedAt: Date.now(),
  };
  await kv.put(playerKey(data.playerId), JSON.stringify(payload));
}

export function mergePlayer(existing, incoming) {
  const ownedSet = new Set([
    ...(existing?.ownedItemIds || []),
    ...(incoming.ownedItemIds || []),
  ]);
  const earned = Math.max(
    existing?.lifetimeEarned || 0,
    incoming.lifetimeEarned || 0
  );
  const spent = Math.max(existing?.lifetimeSpent || 0, incoming.lifetimeSpent || 0);
  return {
    playerId: incoming.playerId,
    nickname: incoming.nickname || existing?.nickname || '景源',
    bestScore: Math.max(existing?.bestScore || 0, incoming.bestScore || 0),
    maxLevel: Math.max(existing?.maxLevel || 1, incoming.maxLevel || 1),
    lifetimeEarned: earned,
    lifetimeSpent: Math.min(spent, earned),
    ownedItemIds: [...ownedSet].slice(0, MAX_OWNED_ITEMS),
    inventory: mergeInventory(existing?.inventory, incoming.inventory),
    equippedIds: [
      ...new Set([
        ...(existing?.equippedIds || []),
        ...(incoming.equippedIds || []),
      ]),
    ].slice(0, 8),
    loadoutIds: [
      ...new Set([
        ...(existing?.loadoutIds || []),
        ...(incoming.loadoutIds || []),
      ]),
    ].slice(0, 8),
  };
}

export async function readLeaderboard(kv) {
  if (!kv) return [];
  const raw = await kv.get(LEADERBOARD_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** 合并一条记录并保留 TOP N（按 bestScore 降序） */
export async function upsertLeaderboard(kv, entry) {
  const list = await readLeaderboard(kv);
  const filtered = list.filter((e) => e.playerId !== entry.playerId);
  filtered.push({
    playerId: entry.playerId,
    nickname: entry.nickname,
    bestScore: entry.bestScore,
    maxLevel: entry.maxLevel,
    updatedAt: Date.now(),
  });
  filtered.sort((a, b) => b.bestScore - a.bestScore || b.maxLevel - a.maxLevel);
  const top = filtered.slice(0, MAX_LB);
  await kv.put(LEADERBOARD_KEY, JSON.stringify(top));
  return top;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

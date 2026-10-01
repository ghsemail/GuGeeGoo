/**
 * KV 读写与排行榜（服务端校验）
 */

const MAX_NICK = 12;
const MAX_SCORE = 999_999;
const MAX_LEVEL = 9;
const LEADERBOARD_KEY = 'leaderboard:v1';
const MAX_LB = 10;

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
  let nickname = String(input.nickname || '景源').trim();
  if (!nickname) nickname = '景源';
  nickname = nickname.slice(0, MAX_NICK);
  const playerId = String(input.playerId || '').slice(0, 64);
  return { bestScore, maxLevel, lastScore, nickname, playerId };
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
    updatedAt: Date.now(),
  };
  await kv.put(playerKey(data.playerId), JSON.stringify(payload));
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

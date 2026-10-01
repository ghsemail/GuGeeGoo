/**
 * 本地存档 + 可选 Cloudflare KV API（失败时只用 localStorage）
 */

const LS_PLAYER_ID = 'gugeegoo_snake_player_id';
const LS_NICKNAME = 'gugeegoo_snake_nickname';
const LS_BEST = 'gugeegoo_snake_best_score';
const LS_MAX_LEVEL = 'gugeegoo_snake_max_level';

const DEFAULT_NICK = '景源';
const MAX_NICK_LEN = 12;

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

function saveLocal(bestScore, maxLevel) {
  const prevBest = getLocalBestScore();
  const prevMax = getLocalMaxLevel();
  const nextBest = Math.max(prevBest, bestScore);
  const nextMax = Math.max(prevMax, maxLevel);
  localStorage.setItem(LS_BEST, String(nextBest));
  localStorage.setItem(LS_MAX_LEVEL, String(nextMax));
  return { bestScore: nextBest, maxLevel: nextMax };
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
      saveLocal(data.bestScore, data.maxLevel ?? 1);
    }
    if (data.nickname) {
      setNickname(data.nickname);
    }
    return data;
  } catch {
    return null;
  }
}

/** 过关或游戏结束时写入（仅此时调用，不每帧写） */
export async function persistProgress({ score, levelUnlocked, nickname }) {
  const nick = setNickname(nickname ?? getNickname());
  const local = saveLocal(score, levelUnlocked);

  try {
    const data = await fetchJson('/api/game/save', {
      method: 'POST',
      body: JSON.stringify({
        playerId: getPlayerId(),
        nickname: nick,
        bestScore: local.bestScore,
        maxLevel: local.maxLevel,
        lastScore: score,
      }),
    });
    return { ...local, remote: true, leaderboard: data.leaderboard };
  } catch {
    return { ...local, remote: false };
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

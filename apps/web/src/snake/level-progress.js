/**
 * 每关通关记录与最高分（本地 + KV 同步）
 */
import { TOTAL_LEVELS } from './levels.js';

const LS_LEVEL_STATS = 'gugeegoo_snake_level_stats';

function readAll() {
  try {
    const raw = localStorage.getItem(LS_LEVEL_STATS);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function writeAll(obj) {
  localStorage.setItem(LS_LEVEL_STATS, JSON.stringify(obj));
}

/** @returns {{ cleared: boolean, bestScore: number }} */
export function getLevelStat(levelId) {
  const key = String(levelId);
  const row = readAll()[key];
  return {
    cleared: !!row?.cleared,
    bestScore: Number(row?.bestScore || 0) || 0,
  };
}

export function recordLevelResult(levelId, { cleared, score }) {
  const key = String(levelId);
  const all = readAll();
  const prev = all[key] || { cleared: false, bestScore: 0 };
  all[key] = {
    cleared: prev.cleared || !!cleared,
    bestScore: Math.max(prev.bestScore || 0, score || 0),
  };
  writeAll(all);
  return all[key];
}

export function getLevelStatsSnapshot() {
  return readAll();
}

export function mergeLevelStatsFromRemote(remote) {
  if (!remote || typeof remote !== 'object') return getLevelStatsSnapshot();
  const local = readAll();
  const merged = { ...local };
  for (const [key, val] of Object.entries(remote)) {
    if (!/^\d+$/.test(key)) continue;
    const id = Number(key);
    if (id < 1 || id > TOTAL_LEVELS) continue;
    const prev = merged[key] || { cleared: false, bestScore: 0 };
    merged[key] = {
      cleared: prev.cleared || !!val?.cleared,
      bestScore: Math.max(prev.bestScore || 0, Number(val?.bestScore) || 0),
    };
  }
  writeAll(merged);
  return merged;
}

/** 给选关卡片用的难度文字 */
export function difficultyLabel(levelId) {
  if (levelId <= 5) return '简单';
  if (levelId <= 10) return '中等';
  return '困难';
}

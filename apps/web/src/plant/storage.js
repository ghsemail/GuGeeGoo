/**
 * 养苔藓 — 存档（localStorage）
 */
import { SAVE_KEY, SAVE_VERSION } from './constants.js';
import { createEmptyState } from './growth.js';

/**
 * @typedef {{
 *   version: number,
 *   savedAt: number,
 *   plant: import('./growth.js').PlantState,
 *   collection: string[],
 * }} SavePayload
 */

/** @param {import('./growth.js').PlantState} plant @param {string[]} collection */
export function buildSavePayload(plant, collection) {
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    plant,
    collection: [...collection],
  };
}

/** @param {SavePayload} payload */
export function writeSave(payload) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

/** @returns {{ plant: import('./growth.js').PlantState, collection: string[] } | null} */
export function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== SAVE_VERSION) return null;
    if (!data.plant || typeof data.plant !== 'object') return null;
    const plant = normalizePlantState(data.plant);
    const collection = Array.isArray(data.collection)
      ? data.collection.filter((id) => typeof id === 'string')
      : [];
    return { plant, collection };
  } catch {
    return null;
  }
}

/** @param {unknown} raw */
function normalizePlantState(raw) {
  const base = createEmptyState();
  const r = /** @type {Record<string, unknown>} */ (raw);
  return {
    ...base,
    speciesId: typeof r.speciesId === 'string' ? r.speciesId : null,
    planted: !!r.planted,
    status:
      r.status === 'growing' ||
      r.status === 'mature' ||
      r.status === 'withered' ||
      r.status === 'idle'
        ? r.status
        : 'idle',
    water: num(r.water, base.water),
    light: num(r.light, base.light),
    nutrient: num(r.nutrient, base.nutrient),
    growth: num(r.growth, 0),
    stressSec: num(r.stressSec, 0),
    matureAt: typeof r.matureAt === 'number' ? r.matureAt : null,
    lastTickMs: typeof r.lastTickMs === 'number' ? r.lastTickMs : Date.now(),
    cooldowns: {
      water: num(/** @type {{ water?: number }} */ (r.cooldowns)?.water, 0),
      light: num(/** @type {{ light?: number }} */ (r.cooldowns)?.light, 0),
      nutrient: num(/** @type {{ nutrient?: number }} */ (r.cooldowns)?.nutrient, 0),
    },
  };
}

/** @param {unknown} v @param {number} fallback */
function num(v, fallback) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

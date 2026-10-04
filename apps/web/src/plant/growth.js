/**
 * 养苔藓 — 数值与成长（不碰网页，方便测试）
 */
import {
  ACTION_BOOST,
  DRAIN_PER_SEC,
  GROWTH_PER_SEC_HEALTHY,
  MATURE_DRAIN_PER_SEC,
  MATURE_LIGHT_DISPLAY,
  START_STATS,
  STRESS_VISIBLE_SEC,
  WITHER_AFTER_NEGLECT_SEC,
} from './constants.js';
import { getSpeciesById } from './species.js';

/** 五个成长阶段的名字 */
export const STAGE_NAMES = ['孢子', '原丝体', '小芽', '长大', '成熟'];

/**
 * @typedef {'idle'|'growing'|'mature'|'withered'} PlantStatus
 * @typedef {{
 *   speciesId: string | null,
 *   planted: boolean,
 *   status: PlantStatus,
 *   water: number,
 *   light: number,
 *   nutrient: number,
 *   growth: number,
 *   stressSec: number,
 *   matureAt: number | null,
 *   lastTickMs: number,
 *   cooldowns: { water: number, light: number, nutrient: number },
 * }} PlantState
 */

/** @returns {PlantState} */
export function createEmptyState() {
  return {
    speciesId: null,
    planted: false,
    status: 'idle',
    water: START_STATS.water,
    light: START_STATS.light,
    nutrient: START_STATS.nutrient,
    growth: 0,
    stressSec: 0,
    matureAt: null,
    lastTickMs: Date.now(),
    cooldowns: { water: 0, light: 0, nutrient: 0 },
  };
}

/** @param {string} speciesId @returns {PlantState} */
export function plantSpecies(speciesId) {
  return {
    ...createEmptyState(),
    speciesId,
    planted: true,
    status: 'growing',
    lastTickMs: Date.now(),
  };
}

/** @param {number} v */
function clamp(v) {
  return Math.max(0, Math.min(100, v));
}

/**
 * @param {{ water: number, light: number, nutrient: number }} stats
 * @param {import('./species.js').BryophyteSpecies} sp
 * @param {{ mature?: boolean }} [opts]
 */
export function assessCare(stats, sp, opts = {}) {
  const mature = !!opts.mature;
  /** @type {string[]} */
  const problems = [];

  if (stats.water < sp.minWater) {
    problems.push('太干了');
  } else if (stats.water < sp.ideals.water.low) {
    problems.push('有点干');
  } else if (!mature && stats.water > sp.ideals.water.high + 8) {
    problems.push('太湿了');
  } else if (mature && stats.water > sp.ideals.water.high + 12) {
    problems.push('太湿了');
  }

  if (!mature) {
    if (stats.light > sp.maxLight) {
      problems.push('晒过头');
    } else if (stats.light < sp.ideals.light.low - 5) {
      problems.push('光太少');
    }
  }

  if (stats.nutrient > sp.maxNutrient) {
    problems.push('肥太多');
  } else if (stats.nutrient < sp.ideals.nutrient.low - 4) {
    problems.push('养分偏低');
  }

  const ok = problems.length === 0;
  let mood = 'happy';
  if (!ok) {
    mood =
      stats.water < sp.minWater || stats.nutrient > sp.maxNutrient
        ? 'stressed'
        : 'uneasy';
    if (!mature && stats.light > sp.maxLight) mood = 'stressed';
  }

  const hint = ok ? '' : buildHint(sp, problems, mature);
  return { ok, mood, hint, problems };
}

/** @param {import('./species.js').BryophyteSpecies} sp @param {string[]} problems @param {boolean} mature */
function buildHint(sp, problems, mature) {
  if (mature && (problems.includes('太干了') || problems.includes('有点干'))) {
    return '长大啦，记得每天浇点水～';
  }
  if (mature && problems.includes('养分偏低')) {
    return '长大啦，偶尔施一点肥就够用～';
  }
  if (problems.includes('晒过头')) {
    if (sp.id === 'marchantia') return '地钱怕暴晒，给它一点阴凉吧～';
    if (sp.id === 'polytrichum') return '金发藓虽耐光，也别烈日直晒哦。';
    return `${sp.nameZh}不喜欢暴晒，少晒一会儿吧。`;
  }
  if (problems.includes('太干了') || problems.includes('有点干')) {
    if (sp.id === 'riccia') return '叉钱苔很爱水，记得多喷一点～';
    return `${sp.nameZh}有点渴了，浇点水吧。`;
  }
  if (problems.includes('肥太多')) {
    return '苔藓几乎不用肥，施太多会伤根（假根）哦。';
  }
  if (problems.includes('太湿了')) {
    return '土太涝了，先别浇啦，让它透透气。';
  }
  if (problems.includes('光太少')) {
    return '稍微亮一点散射光，它会更有精神。';
  }
  return '照顾一下水分、阳光和养分吧。';
}

/** @param {number} growth @returns {number} 0～4 */
export function stageIndexFromGrowth(growth) {
  if (growth >= 100) return 4;
  if (growth >= 80) return 3;
  if (growth >= 55) return 2;
  if (growth >= 28) return 1;
  return 0;
}

/** @param {number} growth */
export function stageProgressInBar(growth) {
  const idx = stageIndexFromGrowth(growth);
  const bounds = [0, 28, 55, 80, 100];
  const start = bounds[idx];
  const end = bounds[idx + 1] ?? 100;
  if (growth >= 100) return 100;
  const t = (growth - start) / (end - start);
  return Math.round(Math.max(0, Math.min(1, t)) * 100);
}

/** 成熟后：体型不再变，只维持水分和养分 @param {PlantState} state @param {number} dtSec */
function tickMaturePlant(state, dtSec) {
  const sp = getSpeciesById(state.speciesId ?? '');
  if (!sp) return decayCooldowns(state, dtSec);

  let water = clamp(state.water - MATURE_DRAIN_PER_SEC.water * dtSec);
  let nutrient = clamp(state.nutrient - MATURE_DRAIN_PER_SEC.nutrient * dtSec);
  const light = MATURE_LIGHT_DISPLAY;

  const care = assessCare({ water, light, nutrient }, sp, { mature: true });
  let stressSec = state.stressSec;

  if (care.ok) {
    stressSec = Math.max(0, stressSec - dtSec * 0.5);
  } else {
    stressSec += dtSec;
    if (stressSec >= WITHER_AFTER_NEGLECT_SEC) {
      return {
        ...state,
        water,
        light,
        nutrient,
        growth: 100,
        stressSec,
        status: 'withered',
        cooldowns: tickCooldowns(state.cooldowns, dtSec),
      };
    }
  }

  return {
    ...state,
    water,
    light,
    nutrient,
    growth: 100,
    stressSec,
    status: 'mature',
    cooldowns: tickCooldowns(state.cooldowns, dtSec),
  };
}

/**
 * @param {PlantState} state
 * @param {number} dtSec
 * @returns {PlantState}
 */
export function tickPlant(state, dtSec) {
  if (!state.planted || !state.speciesId) return state;
  if (state.status === 'withered') {
    return decayCooldowns(state, dtSec);
  }
  if (state.status === 'mature') {
    return tickMaturePlant(state, dtSec);
  }

  const sp = getSpeciesById(state.speciesId);
  if (!sp) return state;

  let water = clamp(state.water - DRAIN_PER_SEC.water * dtSec);
  let light = clamp(state.light - DRAIN_PER_SEC.light * dtSec);
  let nutrient = clamp(state.nutrient - DRAIN_PER_SEC.nutrient * dtSec);

  const care = assessCare({ water, light, nutrient }, sp);
  let stressSec = state.stressSec;
  let growth = state.growth;
  let status = state.status;

  if (care.ok) {
    stressSec = Math.max(0, stressSec - dtSec * 0.5);
    if (growth < 100) {
      growth = Math.min(100, growth + GROWTH_PER_SEC_HEALTHY * dtSec);
    }
    if (growth >= 100) {
      status = 'mature';
      growth = 100;
      light = MATURE_LIGHT_DISPLAY;
    }
  } else {
    stressSec += dtSec;
    if (stressSec >= WITHER_AFTER_NEGLECT_SEC) {
      status = 'withered';
    }
  }

  return {
    ...state,
    water,
    light,
    nutrient,
    growth,
    stressSec,
    status,
    matureAt: status === 'mature' && !state.matureAt ? Date.now() : state.matureAt,
    cooldowns: tickCooldowns(state.cooldowns, dtSec),
  };
}

/** @param {PlantState} state @param {number} dtSec */
function decayCooldowns(state, dtSec) {
  return { ...state, cooldowns: tickCooldowns(state.cooldowns, dtSec) };
}

/** @param {{ water: number, light: number, nutrient: number }} cd @param {number} dtSec */
function tickCooldowns(cd, dtSec) {
  return {
    water: Math.max(0, cd.water - dtSec),
    light: Math.max(0, cd.light - dtSec),
    nutrient: Math.max(0, cd.nutrient - dtSec),
  };
}

/**
 * @param {PlantState} state
 * @param {'water'|'light'|'nutrient'} action
 * @param {number} nowMs
 */
export function applyCareAction(state, action, nowMs) {
  if (!state.planted || state.status === 'withered') {
    return { state, ok: false, reason: 'withered' };
  }

  const cdKey = action === 'light' ? 'light' : action;
  if (state.cooldowns[cdKey] > 0) {
    return { state, ok: false, reason: 'cooldown' };
  }

  if (state.status === 'mature') {
    if (action === 'light') {
      return {
        state: { ...state, light: MATURE_LIGHT_DISPLAY, lastTickMs: nowMs },
        ok: true,
        reason: 'mature-light',
      };
    }
    const boost = ACTION_BOOST[action];
    const next = { ...state, lastTickMs: nowMs };
    next.cooldowns = { ...state.cooldowns, [cdKey]: 2.8 };
    if (action === 'water') next.water = clamp(state.water + boost);
    if (action === 'nutrient') next.nutrient = clamp(state.nutrient + boost);
    return { state: next, ok: true, reason: '' };
  }

  const boost = ACTION_BOOST[action];
  const next = { ...state, lastTickMs: nowMs };
  next.cooldowns = { ...state.cooldowns, [cdKey]: 2.8 };

  if (action === 'water') next.water = clamp(state.water + boost);
  if (action === 'light') next.light = clamp(state.light + boost);
  if (action === 'nutrient') next.nutrient = clamp(state.nutrient + boost);

  return { state: next, ok: true, reason: '' };
}

/** @param {PlantState} state @param {number} nowMs @param {number} capMs */
export function applyOfflineDrain(state, nowMs, capMs) {
  if (!state.planted) return state;
  const elapsed = Math.min(capMs, Math.max(0, nowMs - state.lastTickMs));
  const dtSec = elapsed / 1000;
  let s = { ...state, lastTickMs: nowMs };
  const steps = Math.ceil(dtSec);
  for (let i = 0; i < steps; i++) {
    s = tickPlant(s, dtSec / steps);
  }
  return s;
}

/** @param {PlantState} state @param {number} totalSec @param {(s: PlantState, t: number) => PlantState} [onCare] */
export function simulateSeconds(state, totalSec, onCare) {
  let s = state;
  for (let t = 0; t < totalSec; t++) {
    if (onCare) s = onCare(s, t) ?? s;
    s = tickPlant(s, 1);
    if (s.status === 'withered') break;
    if (s.status === 'mature' && !onCare) break;
  }
  return s;
}

/** 成熟后继续 tick（测试用） @param {PlantState} state @param {number} totalSec @param {(s: PlantState, t: number) => PlantState} [onCare] */
export function simulateSecondsMature(state, totalSec, onCare) {
  let s = state;
  for (let t = 0; t < totalSec; t++) {
    if (onCare) s = onCare(s, t) ?? s;
    s = tickPlant(s, 1);
    if (s.status === 'withered') break;
  }
  return s;
}

/** @param {PlantState} s @param {number} t */
export function autoIdealCare(s, t) {
  if (!s.speciesId || s.status !== 'growing') return s;
  const sp = getSpeciesById(s.speciesId);
  if (!sp) return s;
  let state = s;
  state.cooldowns = { water: 0, light: 0, nutrient: 0 };
  if (state.water < sp.ideals.water.sweet) {
    const r = applyCareAction(state, 'water', t * 1000);
    if (r.ok) state = r.state;
  }
  if (state.light < sp.ideals.light.sweet) {
    const r = applyCareAction(state, 'light', t * 1000);
    if (r.ok) state = r.state;
  }
  if (state.nutrient < sp.ideals.nutrient.sweet && t % 45 === 0) {
    const r = applyCareAction(state, 'nutrient', t * 1000);
    if (r.ok) state = r.state;
  }
  return state;
}

/** 成熟后的理想照顾：只浇水和施肥 @param {PlantState} s @param {number} t */
export function autoMatureCare(s, t) {
  if (!s.speciesId || s.status !== 'mature') return s;
  const sp = getSpeciesById(s.speciesId);
  if (!sp) return s;
  let state = s;
  state.cooldowns = { water: 0, light: 0, nutrient: 0 };
  if (state.water < sp.ideals.water.sweet) {
    const r = applyCareAction(state, 'water', t * 1000);
    if (r.ok) state = r.state;
  }
  if (state.nutrient < sp.ideals.nutrient.sweet && t % 50 === 0) {
    const r = applyCareAction(state, 'nutrient', t * 1000);
    if (r.ok) state = r.state;
  }
  return state;
}

/** @param {PlantState} s */
export function simulateNeglect(s, maxSec = 600) {
  return simulateSeconds(s, maxSec);
}

export function isVisiblyStressed(state) {
  return (
    state.stressSec >= STRESS_VISIBLE_SEC &&
    (state.status === 'growing' || state.status === 'mature')
  );
}

/** 3D / 2D 用：成熟后体型锁定在满成长 */
export function displayGrowth(state) {
  if (state.status === 'mature' || state.growth >= 100) return 100;
  return state.growth;
}

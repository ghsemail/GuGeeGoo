#!/usr/bin/env node
/**
 * 养苔藓：无界面测试成长、枯死、存档
 */
import { BRYOPHYTE_SPECIES } from '../apps/web/src/plant/species.js';
import {
  applyOfflineDrain,
  autoIdealCare,
  autoMatureCare,
  plantSpecies,
  simulateNeglect,
  simulateSeconds,
  simulateSecondsMature,
  tickPlant,
} from '../apps/web/src/plant/growth.js';
import { buildSavePayload, readSave, writeSave } from '../apps/web/src/plant/storage.js';
import { OFFLINE_DRAIN_CAP_MS, SAVE_KEY } from '../apps/web/src/plant/constants.js';

/** @type {Record<string, string>} */
const mem = {};
globalThis.localStorage = {
  setItem(k, v) {
    mem[k] = String(v);
  },
  getItem(k) {
    return mem[k] ?? null;
  },
  removeItem(k) {
    delete mem[k];
  },
};

const MAX_GROW_SEC = 900;
const NEGLECT_SEC = 500;
/** 成熟后排水更慢，需更长时间才会因缺水/缺肥枯死 */
const MATURE_NEGLECT_SEC = 1100;
const MATURE_TICK_SEC = 180;

let failed = 0;

for (const sp of BRYOPHYTE_SPECIES) {
  let s = plantSpecies(sp.id);
  s = simulateSeconds(s, MAX_GROW_SEC, autoIdealCare);
  if (s.status !== 'mature' || s.growth < 100) {
    console.error(`FAIL ${sp.id}: ideal care did not mature (${s.status}, growth=${s.growth.toFixed(1)})`);
    failed += 1;
  } else {
    console.log(`OK ${sp.id}: mature in simulation`);
  }

  let mature = plantSpecies(sp.id);
  mature = simulateSeconds(mature, MAX_GROW_SEC, autoIdealCare);
  const growth0 = mature.growth;
  const light0 = mature.light;
  const water0 = mature.water;
  mature = simulateSecondsMature(mature, MATURE_TICK_SEC);
  if (mature.growth !== growth0 || mature.growth !== 100) {
    console.error(
      `FAIL ${sp.id}: mature growth changed (${growth0} -> ${mature.growth})`
    );
    failed += 1;
  } else if (Math.abs(mature.light - light0) > 0.01) {
    console.error(
      `FAIL ${sp.id}: mature light drained (${light0} -> ${mature.light})`
    );
    failed += 1;
  } else if (mature.water >= water0) {
    console.error(`FAIL ${sp.id}: mature water did not drain over ${MATURE_TICK_SEC}s`);
    failed += 1;
  } else {
    console.log(`OK ${sp.id}: mature size/light locked, water drains`);
  }

  let maintained = plantSpecies(sp.id);
  maintained = simulateSeconds(maintained, MAX_GROW_SEC, autoIdealCare);
  maintained = simulateSecondsMature(maintained, 400, autoMatureCare);
  if (maintained.status === 'withered') {
    console.error(`FAIL ${sp.id}: mature with ideal water/fertilizer withered`);
    failed += 1;
  }

  let n = plantSpecies(sp.id);
  n = simulateNeglect(n, NEGLECT_SEC);
  if (n.status !== 'withered') {
    console.error(`FAIL ${sp.id}: neglect did not wither (${n.status}, stress=${n.stressSec.toFixed(0)}s)`);
    failed += 1;
  } else {
    console.log(`OK ${sp.id}: withered under neglect`);
  }

  let nm = plantSpecies(sp.id);
  nm = simulateSeconds(nm, MAX_GROW_SEC, autoIdealCare);
  nm = simulateSecondsMature(nm, MATURE_NEGLECT_SEC);
  if (nm.status !== 'withered') {
    console.error(`FAIL ${sp.id}: mature neglect did not wither (${nm.status})`);
    failed += 1;
  } else {
    console.log(`OK ${sp.id}: mature withered without water/fertilizer`);
  }
}

const sample = plantSpecies('marchantia');
sample.growth = 42;
sample.water = 55;
writeSave(buildSavePayload(sample, ['marchantia']));
const loaded = readSave();
if (!loaded || loaded.plant.speciesId !== 'marchantia' || loaded.plant.growth !== 42) {
  console.error('FAIL save/load round-trip');
  failed += 1;
} else {
  console.log('OK save/load round-trip');
}

if (mem[SAVE_KEY] === undefined) {
  console.error('FAIL save key missing');
  failed += 1;
}

{
  let live = plantSpecies('marchantia');
  for (let i = 0; i < 40; i++) live = tickPlant(live, 1);
  const waterLive = live.water;
  const now = Date.now();
  const savedOk = { ...live, lastTickMs: now };
  const reloadOk = applyOfflineDrain(savedOk, now + 500, OFFLINE_DRAIN_CAP_MS);
  const savedStale = { ...live, lastTickMs: now - 120_000 };
  const reloadStale = applyOfflineDrain(savedStale, now + 500, OFFLINE_DRAIN_CAP_MS);
  if (Math.abs(reloadOk.water - waterLive) > 0.05) {
    console.error(
      `FAIL save timestamp: reload with fresh lastTickMs changed water (${waterLive} -> ${reloadOk.water})`
    );
    failed += 1;
  } else {
    console.log('OK save timestamp matches state on reload');
  }
  if (reloadStale.water >= reloadOk.water - 0.02) {
    console.error('FAIL save timestamp: stale lastTickMs did not drain extra on reload');
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`validate-plant: ${failed} failure(s)`);
  process.exit(1);
}
console.log('validate-plant OK');

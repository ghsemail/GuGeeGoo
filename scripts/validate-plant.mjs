#!/usr/bin/env node
/**
 * 养苔藓：无界面测试成长、枯死、存档
 */
import { BRYOPHYTE_SPECIES } from '../apps/web/src/plant/species.js';
import {
  autoIdealCare,
  plantSpecies,
  simulateNeglect,
  simulateSeconds,
} from '../apps/web/src/plant/growth.js';
import { buildSavePayload, readSave, writeSave } from '../apps/web/src/plant/storage.js';
import { SAVE_KEY } from '../apps/web/src/plant/constants.js';

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

  let n = plantSpecies(sp.id);
  n = simulateNeglect(n, NEGLECT_SEC);
  if (n.status !== 'withered') {
    console.error(`FAIL ${sp.id}: neglect did not wither (${n.status}, stress=${n.stressSec.toFixed(0)}s)`);
    failed += 1;
  } else {
    console.log(`OK ${sp.id}: withered under neglect`);
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

if (failed > 0) {
  console.error(`validate-plant: ${failed} failure(s)`);
  process.exit(1);
}
console.log('validate-plant OK');

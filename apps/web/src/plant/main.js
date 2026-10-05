/**
 * 养电子植物 — 入口：界面、定时器、按钮
 */
import './plant.css';
import {
  AUTO_SAVE_MS,
  MATURE_CARE_MESSAGE,
  OFFLINE_DRAIN_CAP_MS,
  TICK_INTERVAL_MS,
} from './constants.js';
import { BRYOPHYTE_SPECIES, getSpeciesById } from './species.js';
import {
  applyCareAction,
  applyOfflineDrain,
  assessCare,
  createEmptyState,
  displayGrowth,
  isVisiblyStressed,
  plantSpecies,
  stageIndexFromGrowth,
  stageProgressInBar,
  STAGE_NAMES,
  tickPlant,
} from './growth.js';
import { buildSavePayload, readSave, writeSave } from './storage.js';
import { drawPlant } from './draw.js';
import { factAt } from './facts.js';

/** @type {{ update: Function } | null} */
let plant3dView = null;
let plant3dReady = false;

const pickerEl = document.getElementById('bryophyte-picker');
const potNameEl = document.getElementById('pot-species-name');
const potHabitEl = document.getElementById('pot-species-habit');
const soilPlaceholder = document.getElementById('soil-placeholder');
const plantSvg = /** @type {SVGElement | null} */ (document.getElementById('plant-draw'));
const stageLabelEl = document.getElementById('growth-stage-label');
const progressFillEl = document.getElementById('growth-progress-fill');
const moodHintEl = document.getElementById('mood-hint');
const factEl = document.getElementById('plant-fact');
const toastEl = document.getElementById('plant-toast');
const overlayEl = document.getElementById('plant-overlay');
const overlayTitleEl = document.getElementById('overlay-title');
const overlayMsgEl = document.getElementById('overlay-msg');
const atlasListEl = document.getElementById('atlas-list');
const potSceneEl = document.querySelector('.pot-scene');
const plant3dResetBtn = document.getElementById('plant-3d-reset');

const statFills = {
  water: document.querySelector('.stat-fill:not(.stat-fill-sun):not(.stat-fill-nutrient)'),
  light: document.querySelector('.stat-fill-sun'),
  nutrient: document.querySelector('.stat-fill-nutrient'),
};
const statValues = [...document.querySelectorAll('.stat-value')];

/** @type {import('./growth.js').PlantState} */
let plantState = createEmptyState();
/** @type {string[]} */
let collection = [];
let factIndex = 0;
let tickTimer = 0;
let autoSaveTimer = 0;
let factTimer = 0;
let lastFrameMs = Date.now();
let toastHideTimer = 0;

/** 渲染「挑苔藓」卡片 */
function syncPortraitStageCap() {
  const mq = window.matchMedia('(orientation: portrait) and (min-width: 600px)');
  if (!mq.matches) {
    document.documentElement.style.removeProperty('--plant-stage-cap');
    return;
  }
  const header = document.querySelector('.plant-header');
  const pick = document.querySelector('.plant-section-pick');
  const side = document.querySelector('.plant-side-stack');
  const bodyStyle = getComputedStyle(document.body);
  const padY =
    (parseFloat(bodyStyle.paddingTop) || 0) + (parseFloat(bodyStyle.paddingBottom) || 0);
  const vh = window.innerHeight;
  const used =
    (header?.getBoundingClientRect().height ?? 0) +
    (pick?.getBoundingClientRect().height ?? 0) +
    (side?.getBoundingClientRect().height ?? 0) +
    padY +
    28;
  const cap = Math.max(200, Math.min(Math.floor(vh * 0.42), Math.floor(vh - used)));
  document.documentElement.style.setProperty('--plant-stage-cap', `${cap}px`);
}

function renderBryophytePicker() {
  if (!pickerEl) return;
  pickerEl.innerHTML = '';
  let lastGroup = null;
  /** @type {HTMLElement | null} */
  let currentRow = null;
  for (const sp of BRYOPHYTE_SPECIES) {
    if (sp.groupTitle !== lastGroup) {
      lastGroup = sp.groupTitle;
      const heading = document.createElement('h3');
      heading.className = 'bryo-group-title';
      heading.textContent = sp.groupTitle;
      pickerEl.appendChild(heading);
      currentRow = document.createElement('div');
      currentRow.className = 'bryo-card-row';
      currentRow.dataset.group = sp.group;
      pickerEl.appendChild(currentRow);
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bryo-card';
    btn.dataset.speciesId = sp.id;
    if (collection.includes(sp.id)) {
      btn.classList.add('is-in-atlas');
    }
    btn.innerHTML = `
      <span class="bryo-card-icon" aria-hidden="true">${sp.icon}</span>
      <span class="bryo-card-name">${sp.nameZh}</span>
      <span class="bryo-card-summary">${sp.summary}</span>
    `;
    currentRow?.appendChild(btn);
    btn.addEventListener('click', () => onPickSpecies(sp.id));
  }
  syncPortraitStageCap();
}

/** @param {string} id */
function onPickSpecies(id) {
  document.querySelectorAll('.bryo-card').forEach((c) => {
    c.classList.toggle('is-selected', c.dataset.speciesId === id);
  });
  const sp = getSpeciesById(id);
  if (!sp) return;

  if (
    plantState.planted &&
    plantState.speciesId !== id &&
    plantState.status !== 'withered' &&
    plantState.status !== 'idle'
  ) {
    const ok = window.confirm(
      `盆里已经在养${getSpeciesById(plantState.speciesId)?.nameZh ?? '苔藓'}了，要换成${sp.nameZh}吗？`
    );
    if (!ok) return;
  }
  startPlant(id);
}

/** @param {string} speciesId */
function startPlant(speciesId) {
  plantState = plantSpecies(speciesId);
  syncUi();
  persistSave();
  showToast(`种下了${getSpeciesById(speciesId)?.nameZh ?? '苔藓'}。`);
}

function syncUi() {
  const sp = plantState.speciesId ? getSpeciesById(plantState.speciesId) : null;

  if (potNameEl) {
    potNameEl.hidden = !sp;
    potNameEl.textContent = sp ? `${sp.icon} ${sp.nameZh}（${sp.latin}）` : '';
  }
  if (potHabitEl) {
    potHabitEl.textContent = sp
      ? sp.habit
      : '先挑一种苔藓，点上面的卡片就能种下。';
  }
  if (soilPlaceholder) {
    soilPlaceholder.hidden = !!plantState.planted;
  }

  updateBars();
  updateGrowthUi(sp);
  updateMood(sp);
  renderAtlas();

  document.querySelectorAll('.bryo-card').forEach((c) => {
    c.classList.toggle('is-selected', c.dataset.speciesId === plantState.speciesId);
    c.classList.toggle('is-in-atlas', collection.includes(c.dataset.speciesId ?? ''));
  });

  const careDisabled = !plantState.planted || plantState.status === 'withered';
  document.querySelectorAll('[data-care]').forEach((btn) => {
    btn.disabled = careDisabled;
  });

  const mature = plantState.status === 'mature';
  document.querySelectorAll('.stat-row').forEach((row, i) => {
    row.classList.toggle('stat-row--mature-light', mature && i === 1);
  });
  syncPortraitStageCap();
}

function updateBars() {
  const mature = plantState.status === 'mature';
  const vals = [plantState.water, plantState.light, plantState.nutrient];
  const fills = [statFills.water, statFills.light, statFills.nutrient];
  vals.forEach((v, i) => {
    if (fills[i]) fills[i].style.width = `${Math.round(v)}%`;
    if (statValues[i]) {
      statValues[i].textContent =
        mature && i === 1 ? '够用' : String(Math.round(v));
    }
  });
}

/** @param {import('./species.js').BryophyteSpecies | null} sp */
function updateGrowthUi(sp) {
  if (!stageLabelEl || !progressFillEl) return;
  if (!plantState.planted || !sp) {
    stageLabelEl.textContent = '';
    progressFillEl.style.width = '0%';
    if (plant3dReady && plant3dView) plant3dView.update(null, 0, 'happy');
    else drawPlant(plantSvg, null, 0, 'happy');
    return;
  }
  const growthShown = displayGrowth(plantState);
  const idx = stageIndexFromGrowth(growthShown);
  const bar = stageProgressInBar(growthShown);
  stageLabelEl.textContent =
    plantState.status === 'mature'
      ? `阶段：${STAGE_NAMES[4]} · 100%`
      : plantState.status === 'withered'
        ? '已枯萎，可以换一株，或点「重新开始」'
        : `阶段：${STAGE_NAMES[idx]} · 本阶段 ${bar}%`;

  progressFillEl.style.width = `${growthShown}%`;

  const mature = plantState.status === 'mature';
  const care = sp
    ? assessCare(
        {
          water: plantState.water,
          light: plantState.light,
          nutrient: plantState.nutrient,
        },
        sp,
        { mature }
      )
    : { mood: 'happy' };
  let mood = care.mood;
  if (plantState.status === 'withered') mood = 'withered';
  if (isVisiblyStressed(plantState)) mood = 'stressed';
  if (plant3dReady && plant3dView) {
    plant3dView.update(sp, growthShown, mood);
  } else {
    drawPlant(plantSvg, sp, growthShown, mood);
  }
}

/** @param {import('./species.js').BryophyteSpecies | null} sp */
function updateMood(sp) {
  if (!moodHintEl) return;
  if (!plantState.planted || !sp) {
    moodHintEl.textContent = '';
    return;
  }
  if (plantState.status === 'mature') {
    const care = assessCare(
      {
        water: plantState.water,
        light: plantState.light,
        nutrient: plantState.nutrient,
      },
      sp,
      { mature: true }
    );
    moodHintEl.textContent = care.ok
      ? `${MATURE_CARE_MESSAGE}（已收入图鉴）`
      : care.hint;
    return;
  }
  if (plantState.status === 'withered') {
    moodHintEl.textContent =
      '它枯萎了，多半是很久没顾上水、光或肥。点「重新开始」可以再试一次。';
    return;
  }
  const care = assessCare(
    {
      water: plantState.water,
      light: plantState.light,
      nutrient: plantState.nutrient,
    },
    sp
  );
  moodHintEl.textContent = care.ok
    ? '现在照顾得还行，照这样下去会慢慢长大。'
    : care.hint;
}

function renderAtlas() {
  if (!atlasListEl) return;
  atlasListEl.innerHTML = '';
  if (collection.length === 0) {
    atlasListEl.innerHTML = '<li class="atlas-empty">图鉴里还没有长熟的种类，继续照顾就会解锁。</li>';
    return;
  }
  for (const id of collection) {
    const sp = getSpeciesById(id);
    if (!sp) continue;
    const li = document.createElement('li');
    li.textContent = `${sp.icon} ${sp.nameZh}`;
    atlasListEl.appendChild(li);
  }
}

/** @param {string} msg */
function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.hidden = false;
  window.clearTimeout(toastHideTimer);
  toastHideTimer = window.setTimeout(() => {
    toastEl.hidden = true;
  }, 2200);
}

/** @param {'water'|'light'|'nutrient'} action */
function onCare(action) {
  const result = applyCareAction(plantState, action, Date.now());
  if (!result.ok) {
    if (result.reason === 'cooldown') showToast('点得有点快，等等再试。');
    return;
  }
  plantState = result.state;
  if (result.reason === 'mature-light') {
    showToast('长熟了，阳光够了；多浇水、偶尔施肥就好。');
  }
  syncUi();
  playCareFx(action);
  persistSave();
}

/** @param {'water'|'light'|'nutrient'} action */
function playCareFx(action) {
  if (!potSceneEl) return;
  potSceneEl.classList.remove('fx-water', 'fx-sun', 'fx-nutrient');
  void potSceneEl.offsetWidth;
  if (action === 'water') potSceneEl.classList.add('fx-water');
  if (action === 'light') potSceneEl.classList.add('fx-sun');
  if (action === 'nutrient') potSceneEl.classList.add('fx-nutrient');
}

function gameTick() {
  const now = Date.now();
  const dtSec = Math.min(3, (now - lastFrameMs) / 1000);
  lastFrameMs = now;
  if (!plantState.planted) return;

  const prevStatus = plantState.status;
  plantState = tickPlant(plantState, dtSec);

  if (prevStatus !== 'mature' && plantState.status === 'mature' && plantState.speciesId) {
    if (!collection.includes(plantState.speciesId)) {
      collection.push(plantState.speciesId);
    }
    showMatureOverlay();
  }
  syncUi();
}

function showMatureOverlay() {
  if (!overlayEl || !plantState.speciesId) return;
  const sp = getSpeciesById(plantState.speciesId);
  overlayTitleEl.textContent = '养熟了';
  overlayMsgEl.textContent = `${sp?.nameZh ?? '苔藓'}已经养熟，图鉴里也有了。\n${MATURE_CARE_MESSAGE}`;
  overlayEl.hidden = false;
}

function hideOverlay() {
  if (overlayEl) overlayEl.hidden = true;
}

function persistSave() {
  const now = Date.now();
  plantState = { ...plantState, lastTickMs: now };
  writeSave(buildSavePayload(plantState, collection));
}

function loadFromStorage() {
  const data = readSave();
  if (!data) {
    plantState = createEmptyState();
    collection = [];
    return;
  }
  plantState = applyOfflineDrain(data.plant, Date.now(), OFFLINE_DRAIN_CAP_MS);
  collection = data.collection;
}

function onManualSave() {
  persistSave();
  showToast('进度已保存。');
}

function onManualLoad() {
  const data = readSave();
  if (!data) {
    showToast('还没有存档。');
    return;
  }
  plantState = applyOfflineDrain(data.plant, Date.now(), OFFLINE_DRAIN_CAP_MS);
  collection = data.collection;
  syncUi();
  showToast('已读取存档。');
}

function restartPlant() {
  if (!plantState.speciesId) return;
  const id = plantState.speciesId;
  plantState = plantSpecies(id);
  hideOverlay();
  syncUi();
  persistSave();
  showToast('重新种了一株。');
}

function rotateFact() {
  if (!factEl) return;
  factEl.textContent = `小知识：${factAt(factIndex)}`;
  factIndex += 1;
}

function bindUi() {
  document.querySelector('[data-care="water"]')?.addEventListener('click', () => onCare('water'));
  document.querySelector('[data-care="light"]')?.addEventListener('click', () => onCare('light'));
  document.querySelector('[data-care="nutrient"]')?.addEventListener('click', () => onCare('nutrient'));
  document.getElementById('btn-save')?.addEventListener('click', onManualSave);
  document.getElementById('btn-load')?.addEventListener('click', onManualLoad);
  document.getElementById('btn-restart')?.addEventListener('click', restartPlant);
  document.getElementById('overlay-close')?.addEventListener('click', hideOverlay);
  plant3dResetBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    plant3dView?.resetView?.();
  });

  window.addEventListener('pagehide', persistSave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persistSave();
  });
}

function startLoops() {
  tickTimer = window.setInterval(gameTick, TICK_INTERVAL_MS);
  autoSaveTimer = window.setInterval(persistSave, AUTO_SAVE_MS);
  factTimer = window.setInterval(rotateFact, 12000);
  rotateFact();
}

async function initPlant3d() {
  const mount = document.getElementById('plant-3d-mount');
  if (!mount) return;
  const mod = await import('./plant3d.js');
  const result = await mod.createPlant3dView(mount);
  if (result.ok && result.view) {
    plant3dView = result.view;
    plant3dReady = true;
    document.body.classList.add('plant-3d-active');
    if (soilPlaceholder) soilPlaceholder.hidden = true;
    if (plant3dResetBtn) plant3dResetBtn.hidden = false;
    syncUi();
  }
}

loadFromStorage();
renderBryophytePicker();
bindUi();
syncUi();
startLoops();
initPlant3d();

globalThis.__PLANT_TEST_RELOAD__ = () => {
  loadFromStorage();
  hideOverlay();
  syncUi();
};

window.addEventListener('resize', () => syncPortraitStageCap());
requestAnimationFrame(() => syncPortraitStageCap());

export { BRYOPHYTE_SPECIES };

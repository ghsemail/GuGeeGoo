/**
 * 养电子植物 — 苔藓框架（暂无养成逻辑，便于后续扩展）
 */
import './plant.css';

/**
 * 物种习性参考（2026-03 查阅，供后续逻辑复用）：
 * - 地钱：marchantia.org/grow；维基百科「地钱」；zpnx.com 地钱养殖
 * - 蛇苔：台湾生命大百科 Conocephalum；GreenFlow 蛇苔；swild.cn
 * - 叉钱苔：jardineriaon.com / flowgrow.de「Riccia fluitans」
 * - 白发藓：ttxn.com；huajiangbk.com 白发藓
 * - 大灰藓：大灰藓栽培研究；DB3311/T 276-2024 摘要；gdylzz 林下冠层论文
 * - 金发藓：Glime《Moss Garden》；金发藓属形态描述（酸性湿润林地）
 * - 葫芦藓：中国湿地植物数据库；huajiangbk.com 葫芦藓
 *
 * @typedef {{ id: string, group: 'liverwort'|'moss', groupTitle: string, nameZh: string, latin: string, icon: string, habit: string }} BryophyteSpecies
 */

/** @type {BryophyteSpecies[]} */
export const BRYOPHYTE_SPECIES = [
  {
    id: 'marchantia',
    group: 'liverwort',
    groupTitle: '地钱类（苔类）',
    nameZh: '地钱',
    latin: 'Marchantia polymorpha',
    icon: '🌿',
    habit:
      '散射光、半阴就好，怕暴晒。土要常润、空气要潮，但别泡烂。15～22℃ 最舒服，别超过 28℃。几乎不用施肥。',
  },
  {
    id: 'conocephalum',
    group: 'liverwort',
    groupTitle: '地钱类（苔类）',
    nameZh: '蛇苔',
    latin: 'Conocephalum conicum',
    icon: '🍀',
    habit:
      '明亮散射光，忌暴晒。喜欢湿石头和湿土，湿度大约 50～70%。15～25℃ 左右。几乎不用施肥。',
  },
  {
    id: 'riccia',
    group: 'liverwort',
    groupTitle: '地钱类（苔类）',
    nameZh: '叉钱苔（鹿角苔）',
    latin: 'Riccia fluitans',
    icon: '🌱',
    habit:
      '中偏亮散射光，别长时间暴晒。喜欢很湿：可漂在水上或绑在沉木上。18～26℃ 最好。几乎不用施肥。',
  },
  {
    id: 'leucobryum',
    group: 'moss',
    groupTitle: '其他苔藓（藓类）',
    nameZh: '白发藓',
    latin: 'Leucobryum',
    icon: '🌿',
    habit:
      '半阴、散射光，别直射。空气湿 70% 上下，土微湿别积水。20～25℃ 左右，夏天别太热。弱酸土；几乎不用施肥。',
  },
  {
    id: 'hypnum',
    group: 'moss',
    groupTitle: '其他苔藓（藓类）',
    nameZh: '大灰藓',
    latin: 'Hypnum plumaeforme',
    icon: '🍀',
    habit:
      '像林下那种半阴散射光，忌烈日。湿度 60～80%，土要润。18～25℃ 较合适。几乎不用施肥。',
  },
  {
    id: 'polytrichum',
    group: 'moss',
    groupTitle: '其他苔藓（藓类）',
    nameZh: '金发藓',
    latin: 'Polytrichum',
    icon: '🌱',
    habit:
      '比很多藓更能耐一点光，但仍忌夏日暴晒。喜湿酸性土，可喷雾。15～25℃ 较舒适。几乎不用施肥。',
  },
  {
    id: 'funaria',
    group: 'moss',
    groupTitle: '其他苔藓（藓类）',
    nameZh: '葫芦藓',
    latin: 'Funaria hygrometrica',
    icon: '🌿',
    habit:
      '阴湿、明亮散射光，不要直射。土要常微湿，空气也要潮。15～25℃，冬天别低于 5℃。几乎不用施肥。',
  },
];

const pickerEl = document.getElementById('bryophyte-picker');
const potNameEl = document.getElementById('pot-species-name');
const potHabitEl = document.getElementById('pot-species-habit');
const hintEl = document.getElementById('plant-hint');
let hintTimer = 0;
/** @type {HTMLButtonElement[]} */
let speciesCards = [];

/** 渲染「挑苔藓」分组卡片 */
function renderBryophytePicker() {
  if (!pickerEl) return;
  pickerEl.innerHTML = '';
  /** @type {string|null} */
  let lastGroup = null;
  /** @type {HTMLElement|null} */
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
    const row = /** @type {HTMLElement} */ (currentRow);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bryo-card';
    btn.dataset.speciesId = sp.id;
    btn.innerHTML = `
      <span class="bryo-card-icon" aria-hidden="true">${sp.icon}</span>
      <span class="bryo-card-name">${sp.nameZh}</span>
      <span class="bryo-card-habit">${sp.habit}</span>
    `;
    row.appendChild(btn);
  }
  speciesCards = [...document.querySelectorAll('.bryo-card')];
  speciesCards.forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.dataset.speciesId;
      const sp = BRYOPHYTE_SPECIES.find((s) => s.id === id);
      if (!sp) return;
      speciesCards.forEach((c) => c.classList.remove('is-selected'));
      card.classList.add('is-selected');
      showSpeciesInPot(sp);
    });
  });
}

/** @param {BryophyteSpecies} sp */
function showSpeciesInPot(sp) {
  if (potNameEl) {
    potNameEl.hidden = false;
    potNameEl.textContent = `${sp.icon} ${sp.nameZh}（${sp.latin}）`;
  }
  if (potHabitEl) {
    potHabitEl.textContent = sp.habit;
  }
}

/** 占位功能：短暂提示 */
function showStubHint() {
  if (!hintEl) return;
  hintEl.hidden = false;
  window.clearTimeout(hintTimer);
  hintTimer = window.setTimeout(() => {
    hintEl.hidden = true;
  }, 2200);
}

renderBryophytePicker();

document.querySelectorAll('[data-stub-care], [data-stub-save]').forEach((btn) => {
  btn.addEventListener('click', showStubHint);
});

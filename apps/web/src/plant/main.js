/**
 * 养电子植物 — 页面框架（暂无养成逻辑，便于后续扩展）
 */
import './plant.css';

const seedCards = document.querySelectorAll('.seed-card');
const hintEl = document.getElementById('plant-hint');
let hintTimer = 0;

/** 选中种子卡片（仅高亮，无游戏效果） */
seedCards.forEach((card) => {
  card.addEventListener('click', () => {
    seedCards.forEach((c) => c.classList.remove('is-selected'));
    card.classList.add('is-selected');
  });
});

/** 占位功能：短暂提示 */
function showStubHint() {
  if (!hintEl) return;
  hintEl.hidden = false;
  window.clearTimeout(hintTimer);
  hintTimer = window.setTimeout(() => {
    hintEl.hidden = true;
  }, 2200);
}

document.querySelectorAll('[data-stub-care], [data-stub-save]').forEach((btn) => {
  btn.addEventListener('click', showStubHint);
});

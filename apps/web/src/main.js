/**
 * 根路径 `/`：游戏导航页（不是直接进入某个游戏）
 */
import './style.css';
import { GAMES, readLocalGameStats } from './games.js';

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderGameCard(game) {
  const { bestScore, maxLevel, lifetime, hasPlayed } = readLocalGameStats(game);
  let statsHtml = `<p class="game-card-stats muted">还没玩过，快来挑战吧！</p>`;
  if (hasPlayed) {
    if (game.statKeys?.level) {
      statsHtml = `<p class="game-card-stats">本地记录：累计 <strong>${lifetime}</strong> 分 · 最高 <strong>${bestScore}</strong> 分 · 第 <strong>${maxLevel}</strong> 关</p>`;
    } else {
      statsHtml = `<p class="game-card-stats">本地记录：最高 <strong>${bestScore}</strong> 分</p>`;
    }
  }

  return `
    <a class="game-card" href="${escapeHtml(game.href)}">
      <span class="game-card-emoji" aria-hidden="true">${game.emoji}</span>
      <h2 class="game-card-title">${escapeHtml(game.title)}</h2>
      <p class="game-card-desc">${escapeHtml(game.description)}</p>
      ${statsHtml}
      <span class="game-card-cta">开始玩 →</span>
    </a>
  `;
}

function initPortal() {
  const root = document.getElementById('game-list');
  if (!root) return;

  if (!GAMES.length) {
    root.innerHTML =
      '<p class="empty-hint">还没有游戏，敬请期待。</p>';
    return;
  }

  root.innerHTML = GAMES.map(renderGameCard).join('');
}

initPortal();

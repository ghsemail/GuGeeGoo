const LS_BEST = 'gugeegoo_2048_best_score';
const LS_LIFETIME = 'gugeegoo_2048_lifetime_earned';

export function getBestScore() {
  return Number(localStorage.getItem(LS_BEST) || 0) || 0;
}

export function getLifetimeEarned() {
  return Number(localStorage.getItem(LS_LIFETIME) || 0) || 0;
}

export function recordRunScore(score) {
  const s = Math.max(0, Math.floor(score));
  const best = getBestScore();
  if (s > best) localStorage.setItem(LS_BEST, String(s));
  const life = getLifetimeEarned() + s;
  localStorage.setItem(LS_LIFETIME, String(life));
  return { best: Math.max(best, s), lifetime: life };
}

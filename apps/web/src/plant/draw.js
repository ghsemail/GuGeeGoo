/**
 * 花盆里的苔藓 — 用 SVG 画成长阶段（地钱类 vs 藓类）
 */

import { stageIndexFromGrowth } from './growth.js';

/**
 * @param {SVGElement | null} svg
 * @param {import('./species.js').BryophyteSpecies | null} sp
 * @param {number} growth 0～100
 * @param {'happy'|'uneasy'|'stressed'|'withered'} mood
 */
export function drawPlant(svg, sp, growth, mood) {
  if (!svg) return;
  if (!sp || !sp.id) {
    svg.innerHTML = '';
    svg.classList.remove('plant-draw--visible');
    return;
  }
  svg.classList.add('plant-draw--visible');
  const stage = stageIndexFromGrowth(growth);
  const color = moodColor(mood, growth >= 100);
  if (sp.group === 'liverwort') {
    svg.innerHTML = liverwortSvg(stage, color, sp.id);
  } else {
    svg.innerHTML = mossSvg(stage, color, sp.id);
  }
}

/** @param {'happy'|'uneasy'|'stressed'|'withered'} mood @param {boolean} mature */
function moodColor(mood, mature) {
  if (mature) return { fill: '#2e7d32', stroke: '#1b5e20' };
  if (mood === 'withered') return { fill: '#8d6e63', stroke: '#5d4037' };
  if (mood === 'stressed') return { fill: '#c0a020', stroke: '#8d6e00' };
  if (mood === 'uneasy') return { fill: '#7cb342', stroke: '#558b2f' };
  return { fill: '#43a047', stroke: '#2e7d32' };
}

/** @param {number} stage @param {{ fill: string, stroke: string }} c @param {string} id */
function liverwortSvg(stage, c, id) {
  const thallus =
    stage === 0
      ? `<circle cx="50" cy="58" r="4" fill="${c.fill}" opacity="0.7"/>`
      : stage === 1
        ? `<ellipse cx="50" cy="56" rx="14" ry="6" fill="${c.fill}" opacity="0.85"/>`
        : `<path d="M28 58 Q50 42 72 58 Q50 68 28 58" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.2"/>`;

  let extra = '';
  if (stage >= 3 && id === 'marchantia') {
    extra = `<ellipse cx="62" cy="48" rx="5" ry="7" fill="#81c784" stroke="${c.stroke}"/><circle cx="38" cy="50" r="4" fill="#a5d6a7"/>`;
  }
  if (stage >= 4) {
    extra += `<text x="50" y="38" text-anchor="middle" font-size="10" fill="${c.stroke}">✨</text>`;
  }
  if (stage === 2) {
    extra = `<circle cx="50" cy="52" r="8" fill="${c.fill}" opacity="0.9"/>`;
  }

  return `${thallus}${extra}`;
}

/** @param {number} stage @param {{ fill: string, stroke: string }} c @param {string} id */
function mossSvg(stage, c, id) {
  if (stage === 0) {
    return `<circle cx="50" cy="58" r="3.5" fill="${c.fill}"/>`;
  }
  if (stage === 1) {
    return `<g stroke="${c.stroke}" stroke-width="1"><path d="M45 58 L45 52 M50 58 L50 50 M55 58 L55 53" stroke="${c.fill}"/></g>`;
  }
  const stems =
    stage === 2
      ? `<line x1="42" y1="58" x2="42" y2="46" stroke="${c.fill}" stroke-width="2.5" stroke-linecap="round"/>
         <line x1="50" y1="58" x2="50" y2="42" stroke="${c.fill}" stroke-width="3" stroke-linecap="round"/>
         <line x1="58" y1="58" x2="58" y2="47" stroke="${c.fill}" stroke-width="2.5" stroke-linecap="round"/>`
      : `<line x1="38" y1="58" x2="38" y2="40" stroke="${c.fill}" stroke-width="2.5"/>
         <line x1="46" y1="58" x2="46" y2="36" stroke="${c.fill}" stroke-width="3"/>
         <line x1="54" y1="58" x2="54" y2="38" stroke="${c.fill}" stroke-width="3"/>
         <line x1="62" y1="58" x2="62" y2="44" stroke="${c.fill}" stroke-width="2.5"/>`;

  let capsule = '';
  if (stage >= 4 || (stage >= 3 && id === 'funaria')) {
    capsule = `<ellipse cx="50" cy="32" rx="4" ry="6" fill="${c.stroke}" opacity="0.85"/>
               <line x1="50" y1="36" x2="50" y2="42" stroke="${c.stroke}" stroke-width="1.5"/>`;
  }
  if (stage >= 4) {
    capsule += `<text x="50" y="28" text-anchor="middle" font-size="9">🎉</text>`;
  }
  return `${stems}${capsule}`;
}

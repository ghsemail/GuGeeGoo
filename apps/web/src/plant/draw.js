/**
 * 花盆里的苔藓 — SVG 2D 回退（风格与 visual-style.js / plant3d 一致）
 */

import { stageIndexFromGrowth } from './growth.js';
import { paletteSvg } from './visual-style.js';

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
  const c = paletteSvg(mood, growth >= 100);
  const defs = svgDefs(c);
  if (sp.group === 'liverwort') {
    svg.innerHTML = defs + liverwortSvg(stage, c, sp.id);
  } else {
    svg.innerHTML = defs + mossSvg(stage, c, sp.id);
  }
}

/** @param {ReturnType<paletteSvg>} c */
function svgDefs(c) {
  return `<defs>
    <radialGradient id="plant-soft" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="${c.fillHi}"/>
      <stop offset="100%" stop-color="${c.fill}"/>
    </radialGradient>
    <filter id="plant-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="${c.shadow}" flood-opacity="0.85"/>
    </filter>
  </defs>`;
}

/** @param {number} stage @param {ReturnType<paletteSvg>} c @param {string} id */
function liverwortSvg(stage, c, id) {
  const g = `filter="url(#plant-soft-shadow)" fill="url(#plant-soft)" stroke="${c.stroke}" stroke-width="0.65" stroke-linejoin="round"`;
  let body = '';
  if (stage === 0) {
    body = `<ellipse cx="50" cy="57" rx="7" ry="4.5" ${g} opacity="0.92"/>
            <ellipse cx="44" cy="58" rx="4" ry="2.8" ${g} opacity="0.85"/>`;
  } else if (stage === 1) {
    body = `<ellipse cx="50" cy="56" rx="16" ry="6.5" ${g}/>`;
  } else if (stage === 2) {
    body = `<path d="M32 58 Q50 46 68 58 Q50 66 32 58" ${g}/>`;
  } else {
    body = `<path d="M26 58 Q50 40 74 58 Q50 70 26 58" ${g}/>`;
  }

  let extra = '';
  if (stage >= 3 && (id === 'marchantia' || id === 'conocephalum')) {
    extra += `<ellipse cx="62" cy="50" rx="5.5" ry="3.2" ${g}/>
              <ellipse cx="62" cy="49" rx="3.2" ry="1.6" fill="${c.stroke}" opacity="0.35"/>`;
  }
  if (stage >= 4) {
    if (id === 'marchantia') {
      extra += `<line x1="50" y1="58" x2="50" y2="42" stroke="${c.stroke}" stroke-width="1.4" stroke-linecap="round"/>
                <ellipse cx="50" cy="38" rx="9" ry="3" ${g}/>
                <path d="M41 38 Q50 32 59 38" fill="none" stroke="${c.fillHi}" stroke-width="1.2" stroke-linecap="round"/>`;
    } else if (id === 'conocephalum') {
      extra += `<line x1="50" y1="58" x2="50" y2="36" stroke="${c.stroke}" stroke-width="1.4" stroke-linecap="round"/>
                <path d="M44 36 L50 28 L56 36 Z" ${g}/>`;
    }
  }
  return `${body}${extra}`;
}

/** @param {number} stage @param {ReturnType<paletteSvg>} c @param {string} id */
function mossSvg(stage, c, id) {
  const stem = (x, y2, w) =>
    `<line x1="${x}" y1="58" x2="${x}" y2="${y2}" stroke="url(#plant-soft)" stroke-width="${w}" stroke-linecap="round" filter="url(#plant-soft-shadow)"/>`;

  if (stage === 0) {
    return `<ellipse cx="50" cy="57" rx="4" ry="3.5" fill="url(#plant-soft)" filter="url(#plant-soft-shadow)"/>`;
  }
  if (stage === 1) {
    return `${stem(45, 52, 2.8)}${stem(50, 49, 3.2)}${stem(55, 51, 2.8)}`;
  }

  const stems =
    stage === 2
      ? `${stem(42, 45, 3)}${stem(50, 40, 3.4)}${stem(58, 46, 3)}`
      : `${stem(38, 39, 3)}${stem(46, 34, 3.4)}${stem(54, 36, 3.4)}${stem(62, 42, 3)}`;

  let capsule = '';
  if (stage >= 4 || (stage >= 3 && id === 'funaria')) {
    const cx = id === 'funaria' ? 54 : 50;
    const cy = id === 'funaria' ? 30 : 32;
    capsule = `<line x1="${cx}" y1="36" x2="${cx}" y2="${cy + 4}" stroke="${c.stroke}" stroke-width="1.3" stroke-linecap="round"/>
               <ellipse cx="${cx}" cy="${cy}" rx="4.2" ry="${id === 'funaria' ? 5.5 : 4.8}" fill="${c.stroke}" opacity="0.75" filter="url(#plant-soft-shadow)"/>`;
  }
  return `${stems}${capsule}`;
}

/**
 * 3D 苔藓/叶状体材质 — 程序化多层绿色、绒面感（仅植物体，花盆仍用 createStylizedMaterial）
 */

/** @typedef {'happy'|'uneasy'|'stressed'|'withered'} PlantMood */

/**
 * @param {number} t 0=基部 … 1=叶尖
 * @param {number} layer 0–1 侧向/层次
 * @param {ReturnType<import('./visual-style.js').palette3d>} palette
 * @param {{ hueShift?: number, sat?: number, species?: string }} [opts]
 */
export function mossFoliageColor(t, layer, palette, opts = {}) {
  const THREE = globalThis.__PLANT_THREE__;
  if (!THREE) return palette.main;

  const base = new THREE.Color(palette.main);
  const alt = new THREE.Color(palette.alt);
  const rim = new THREE.Color(palette.rim);

  const hueShift = opts.hueShift ?? 0;
  const mix = t * 0.55 + layer * 0.25 + (Math.sin(t * 12.7 + layer * 8.3) * 0.04);
  const c = base.clone().lerp(alt, Math.min(1, mix + 0.15));
  c.lerp(rim, (1 - t) * 0.35);

  const h = { h: 0, s: 0, l: 0 };
  c.getHSL(h);
  h.h += hueShift + (opts.species === 'leucobryum' ? -0.02 : 0);
  h.s = Math.min(0.72, (opts.sat ?? 0.52) + layer * 0.08 + t * 0.12);
  h.l = Math.min(0.68, 0.28 + t * 0.34 + layer * 0.08);
  if (t > 0.75) h.l += 0.1;
  if (layer > 0.85) h.l += 0.05;
  const brown = (1 - t) * 0.06 + (Math.sin(t * 23) * 0.015);
  h.l -= brown;
  c.setHSL(h.h, h.s, h.l);
  return c.getHex();
}

/**
 * @param {typeof import('three')} THREE
 * @param {number} [baseColor]
 */
export function createMossFoliageMaterial(THREE, baseColor) {
  const c = baseColor != null ? new THREE.Color(baseColor) : new THREE.Color(0x3d8b40);
  return new THREE.MeshStandardMaterial({
    color: c,
    roughness: 0.82,
    metalness: 0.02,
    flatShading: false,
    vertexColors: true,
    side: THREE.DoubleSide,
    emissive: c.clone().multiplyScalar(0.06),
    emissiveIntensity: 0.28,
  });
}

/**
 * @param {typeof import('three')} THREE
 * @param {number} color
 */
export function createMossStemMaterial(THREE, color) {
  const c = new THREE.Color(color);
  return new THREE.MeshStandardMaterial({
    color: c,
    roughness: 0.86,
    metalness: 0.01,
    vertexColors: true,
    emissive: c.clone().multiplyScalar(0.05),
    emissiveIntensity: 0.22,
  });
}

/**
 * @param {typeof import('three')} THREE
 * @param {ReturnType<import('./visual-style.js').palette3d> | { main: number }} palette
 */
export function createThallusMaterial(THREE, palette) {
  const c = new THREE.Color(palette.main);
  const mat = new THREE.MeshStandardMaterial({
    color: c,
    roughness: 0.74,
    metalness: 0.03,
    vertexColors: true,
    transparent: true,
    opacity: 0.96,
    emissive: c.clone().multiplyScalar(0.07),
    emissiveIntensity: 0.32,
  });
  return mat;
}

/**
 * @param {typeof import('three')} THREE
 * @param {number} color
 * @param {{ roughness?: number }} [opts]
 */
export function createPlantAccentMaterial(THREE, color, opts = {}) {
  const c = new THREE.Color(color);
  return new THREE.MeshStandardMaterial({
    color: c,
    roughness: opts.roughness ?? 0.68,
    metalness: 0.04,
    vertexColors: false,
    emissive: c.clone().multiplyScalar(0.08),
    emissiveIntensity: 0.3,
  });
}

/** 供 mossFoliageColor 使用（构建时注入 THREE） */
export function bindPlantThree(THREE) {
  globalThis.__PLANT_THREE__ = THREE;
}

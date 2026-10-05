/**
 * 3D 苔藓/叶状体材质 — 明亮多层绿、绒面感（仅植物体）
 */

/**
 * @param {number} t 0=基部 … 1=叶尖/表面
 * @param {number} layer 0–1
 * @param {ReturnType<import('./visual-style.js').palette3d>} palette
 * @param {{ hueShift?: number, satBoost?: number, lightMin?: number, liverwort?: boolean }} [opts]
 */
export function mossFoliageColor(t, layer, palette, opts = {}) {
  const THREE = globalThis.__PLANT_THREE__;
  if (!THREE) return palette.main;

  const base = new THREE.Color(palette.main);
  const alt = new THREE.Color(palette.alt);
  const rim = new THREE.Color(palette.rim);

  const mix = t * 0.5 + layer * 0.22 + Math.sin(t * 11 + layer * 6) * 0.05;
  const c = base.clone().lerp(alt, Math.min(1, mix + 0.25));
  c.lerp(rim, Math.max(0, (1 - t) * 0.22));

  const h = { h: 0, s: 0, l: 0 };
  c.getHSL(h);
  h.h += opts.hueShift ?? 0;
  const sat = Math.min(0.85, 0.58 + (opts.satBoost ?? 0.12) + t * 0.1);
  h.s = sat;
  const lightMin = opts.lightMin ?? (opts.liverwort ? 0.42 : 0.38);
  h.l = Math.max(lightMin, 0.36 + t * 0.32 + (1 - layer) * 0.06);
  if (t > 0.7) h.l += 0.14;
  if (opts.liverwort) {
    h.s = Math.min(0.82, h.s + 0.08);
    h.l = Math.max(0.34, h.l - 0.04);
  }
  c.setHSL(h.h, h.s, Math.min(0.82, h.l));
  return c.getHex();
}

/**
 * InstancedMesh 顶点色缺失时 WebGL 读成黑，会乘灭 instanceColor。
 * @param {import('three').BufferGeometry} geo
 * @param {typeof import('three')} THREE
 */
export function ensureWhiteVertexColors(geo, THREE) {
  if (geo.getAttribute('color')) return;
  const n = geo.attributes.position.count;
  const colors = new Float32Array(n * 3);
  colors.fill(1);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/**
 * @param {typeof import('three')} THREE
 * @param {number} [baseColor]
 */
export function createMossFoliageMaterial(THREE, baseColor) {
  const c = baseColor != null ? new THREE.Color(baseColor) : new THREE.Color(0x52ae56);
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.78,
    metalness: 0.04,
    vertexColors: true,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(0x2a5a2e),
    emissiveIntensity: 0.22,
  });
}

/** 外层绒面壳（略亮、半透明叠层感） */
export function createMossShellMaterial(THREE) {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.72,
    metalness: 0.05,
    vertexColors: true,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    emissive: new THREE.Color(0x3d6a40),
    emissiveIntensity: 0.18,
  });
}

/**
 * @param {typeof import('three')} THREE
 */
export function createThallusMaterial(THREE) {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.48,
    metalness: 0.1,
    vertexColors: true,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(0x1a4020),
    emissiveIntensity: 0.28,
  });
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
    roughness: opts.roughness ?? 0.65,
    metalness: 0.03,
    emissive: c.clone().multiplyScalar(0.12),
    emissiveIntensity: 0.35,
  });
}

export function bindPlantThree(THREE) {
  globalThis.__PLANT_THREE__ = THREE;
}

/** @param {import('three').Object3D} root @param {typeof import('three')} THREE */
export function tallyPlantMesh(root, THREE) {
  let drawCalls = 0;
  let triangles = 0;
  root.traverse((ch) => {
    if (ch.isInstancedMesh) {
      drawCalls += 1;
      const g = ch.geometry;
      let per = 0;
      if (g?.index) per = g.index.count / 3;
      else if (g?.parameters?.widthSegments != null) {
        per = g.parameters.widthSegments * g.parameters.heightSegments * 2;
      } else if (g?.attributes?.position) {
        per = Math.max(2, g.attributes.position.count / 3);
      }
      triangles += per * ch.count;
      return;
    }
    if (ch.isMesh) {
      drawCalls += 1;
      const g = ch.geometry;
      if (g?.index) triangles += g.index.count / 3;
      else if (g?.attributes?.position) triangles += g.attributes.position.count / 3;
    }
  });
  return { drawCalls, triangles: Math.round(triangles) };
}

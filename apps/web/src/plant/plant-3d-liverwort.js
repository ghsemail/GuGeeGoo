/**
 * 地钱类 — 平滑扁带叶状体（单面连续条带 + 二叉圆尖）
 */
import {
  bindPlantThree,
  createPlantAccentMaterial,
  createThallusMaterial,
  mossFoliageColor,
  tallyPlantMesh,
} from './plant-3d-materials.js';

/** @typedef {'happy'|'uneasy'|'stressed'|'withered'} PlantMood */

/**
 * @param {typeof import('three')} THREE
 * @param {number} length
 * @param {number} width
 * @param {'marchantia'|'conocephalum'|'riccia'} kind
 * @param {ReturnType<import('./visual-style.js').palette3d>} palette
 * @param {{ yBase?: number, pore?: boolean }} [opts]
 */
function createSmoothRibbonStrip(THREE, length, width, kind, palette, opts = {}) {
  const segL = Math.max(14, Math.floor(length * 40));
  const segW = kind === 'riccia' ? 5 : 7;
  const yBase = opts.yBase ?? 0.018;
  const geo = new THREE.BufferGeometry();
  const verts = [];
  const colors = [];
  const indices = [];

  for (let j = 0; j <= segW; j++) {
    const v = j / segW;
    const across = (v - 0.5) * 2;
    for (let i = 0; i <= segL; i++) {
      const u = i / segL;
      const along = (u - 0.5) * length;
      const tip = Math.sin(u * Math.PI);
      const halfW = width * 0.5 * tip;
      const marginLift = 1 - Math.abs(across) * 0.22;
      const midrib = 1 - Math.abs(across) * 1.25;
      const edgeWave = Math.sin(u * 5.2 + across * 1.8) * 0.004 * tip * Math.abs(across);
      const py = yBase + edgeWave + midrib * 0.0025;
      const px = along;
      const pz = across * halfW;
      verts.push(px, py, pz);

      const layer = Math.abs(across);
      const hex = mossFoliageColor(
        0.48 + tip * 0.22 + (1 - layer) * 0.12,
        layer * 0.22,
        palette,
        {
          liverwort: true,
          satBoost: kind === 'riccia' ? 0.22 : 0.28,
          lightMin: kind === 'riccia' ? 0.36 : 0.32,
        }
      );
      let r = ((hex >> 16) & 255) / 255;
      let g = ((hex >> 8) & 255) / 255;
      let b = (hex & 255) / 255;
      const groove = 0.78 + midrib * 0.22;
      const rimBright = 0.92 + (1 - Math.abs(across)) * 0.08;
      r *= groove * rimBright;
      g *= groove * rimBright;
      b *= groove * rimBright;
      if (opts.pore && kind === 'conocephalum') {
        const pore = (Math.sin(u * 28) * Math.sin(v * 22) + 1) * 0.04;
        r *= 1 - pore;
        g *= 1 - pore * 0.6;
        b *= 1 - pore;
      }
      colors.push(r, g, b);
    }
  }

  const row = segW + 1;
  for (let j = 0; j < segW; j++) {
    for (let i = 0; i < segL; i++) {
      const a = j * row + i;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * @param {typeof import('three')} THREE
 * @param {import('three').Group} root
 * @param {import('three').Material} mat
 * @param {number} ox
 * @param {number} oz
 * @param {number} rotY
 * @param {number} length
 * @param {number} width
 * @param {'marchantia'|'conocephalum'|'riccia'} kind
 * @param {ReturnType<import('./visual-style.js').palette3d>} palette
 * @param {{ pore?: boolean, y?: number }} [opts]
 */
function addRibbonStrip(
  THREE,
  root,
  mat,
  ox,
  oz,
  rotY,
  length,
  width,
  kind,
  palette,
  opts = {}
) {
  const geo = createSmoothRibbonStrip(THREE, length, width, kind, palette, {
    yBase: opts.y ?? 0.018,
    pore: opts.pore,
  });
  const mesh = new THREE.Mesh(geo, mat);
  const reach = length * 0.48;
  mesh.position.set(ox + Math.cos(rotY) * reach * 0.42, 0, oz + Math.sin(rotY) * reach * 0.42);
  mesh.rotation.y = rotY;
  root.add(mesh);
  return mesh;
}

/** 二叉分叉：两条平滑带共基 */
function addForkedRibbon(
  THREE,
  root,
  mat,
  ox,
  oz,
  rotY,
  length,
  width,
  kind,
  palette,
  forkSpread = 0.42
) {
  addRibbonStrip(THREE, root, mat, ox, oz, rotY, length * 0.62, width, kind, palette);
  addRibbonStrip(
    THREE,
    root,
    mat,
    ox,
    oz,
    rotY + forkSpread,
    length * 0.48,
    width * 0.82,
    kind,
    palette,
    { y: 0.019 }
  );
  addRibbonStrip(
    THREE,
    root,
    mat,
    ox,
    oz,
    rotY - forkSpread,
    length * 0.48,
    width * 0.82,
    kind,
    palette,
    { y: 0.017 }
  );
}

/**
 * @param {typeof import('three')} THREE
 * @param {import('three').Group} root
 * @param {number} x
 * @param {number} z
 * @param {number} scale
 * @param {ReturnType<import('./visual-style.js').palette3d>} palette
 */
function addGemmaCup(THREE, root, x, z, scale, palette) {
  const cupMat = createPlantAccentMaterial(THREE, palette.rim, { roughness: 0.62 });
  const outer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022 * scale, 0.028 * scale, 0.012 * scale, 10, 1, true),
    cupMat
  );
  outer.position.set(x, 0.026 * scale, z);
  root.add(outer);
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014 * scale, 0.018 * scale, 0.008 * scale, 8),
    createPlantAccentMaterial(THREE, palette.main, { roughness: 0.55 })
  );
  inner.position.set(x, 0.028 * scale, z);
  root.add(inner);
}

/**
 * @param {typeof import('three')} THREE
 * @param {import('three').Group} root
 * @param {number} scale
 * @param {ReturnType<import('./visual-style.js').palette3d>} palette
 * @param {import('three').Material} thallusMat
 */
function addMarchantiaArchegoniophore(THREE, root, scale, palette, thallusMat) {
  const stalkMat = createPlantAccentMaterial(THREE, 0x5a7048, { roughness: 0.65 });
  const stalk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0045 * scale, 0.006 * scale, 0.1 * scale, 8),
    stalkMat
  );
  stalk.position.set(0, 0.05 * scale, 0);
  root.add(stalk);
  const hubY = 0.098 * scale;
  for (let f = 0; f < 8; f++) {
    const a = (f / 8) * Math.PI * 2 + 0.2;
    const ray = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003 * scale, 0.004 * scale, 0.034 * scale, 6),
      thallusMat
    );
    ray.position.set(Math.cos(a) * 0.026 * scale, hubY, Math.sin(a) * 0.022 * scale);
    ray.rotation.set(0.55, a, 0.08);
    root.add(ray);
  }
}

/**
 * @param {typeof import('three')} THREE
 * @param {import('three').Group} root
 * @param {string} id
 * @param {number} stage
 * @param {number} t
 * @param {ReturnType<import('./visual-style.js').palette3d>} palette
 * @param {PlantMood} [_mood]
 */
export function buildLiverwort(THREE, root, id, stage, t, palette, _mood = 'happy') {
  bindPlantThree(THREE);
  const kind =
    id === 'riccia' ? 'riccia' : id === 'conocephalum' ? 'conocephalum' : 'marchantia';

  const mat = createThallusMaterial(THREE);
  const matAlt = createThallusMaterial(THREE);

  const scale = (0.42 + t * 0.52) * 1.08;

  if (stage === 0) {
    const s0 = Math.max(0.95, scale);
    addForkedRibbon(THREE, root, mat, 0, 0, 0.1, 0.16 * s0, 0.09 * s0, kind, palette, 0.38);
    addRibbonStrip(THREE, root, matAlt, 0.04, 0.02, 1.2, 0.12 * s0, 0.07 * s0, kind, palette, {
      y: 0.017,
    });
    addRibbonStrip(THREE, root, matAlt, -0.03, -0.02, -0.7, 0.11 * s0, 0.065 * s0, kind, palette, {
      y: 0.016,
    });
    return tallyPlantMesh(root, THREE);
  }

  if (stage === 1) {
    addRibbonStrip(THREE, root, mat, 0, 0, 0, 0.34 * scale, 0.13, kind, palette);
    addForkedRibbon(
      THREE,
      root,
      matAlt,
      0.02,
      0.01,
      0.55,
      0.24 * scale,
      0.1,
      kind,
      palette,
      0.35
    );
    return tallyPlantMesh(root, THREE);
  }

  const arms = id === 'riccia' ? 5 : id === 'conocephalum' ? 4 : 3;
  const widthMain =
    id === 'riccia' ? 0.1 : id === 'conocephalum' ? 0.18 : 0.16;
  const lenBase = (0.46 + stage * 0.05) * scale;

  for (let i = 0; i < arms; i++) {
    const ang = (i / arms) * Math.PI * 2 + 0.22;
    const len = Math.min(lenBase, 0.38);
    const ox = Math.cos(ang) * 0.015;
    const oz = Math.sin(ang) * 0.015;
    if (stage >= 2) {
      addForkedRibbon(
        THREE,
        root,
        i % 2 ? mat : matAlt,
        ox,
        oz,
        ang,
        len,
        widthMain,
        kind,
        palette,
        id === 'riccia' ? 0.48 : 0.4
      );
    } else {
      addRibbonStrip(
        THREE,
        root,
        i % 2 ? mat : matAlt,
        ox,
        oz,
        ang,
        len,
        widthMain,
        kind,
        palette,
        { pore: id === 'conocephalum' }
      );
    }
  }

  if (id === 'marchantia' && stage >= 3) {
    addGemmaCup(THREE, root, 0.08 * scale, 0.05 * scale, scale, palette);
    addGemmaCup(THREE, root, -0.06 * scale, 0.04 * scale, scale * 0.9, palette);
  }

  if (stage >= 4) {
    if (id === 'marchantia') {
      addMarchantiaArchegoniophore(THREE, root, scale, palette, matAlt);
    } else if (id === 'conocephalum') {
      const stalk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0035 * scale, 0.005 * scale, 0.075 * scale, 8),
        createPlantAccentMaterial(THREE, 0x6a8060, { roughness: 0.55 })
      );
      stalk.position.set(0.02 * scale, 0.038 * scale, -0.01 * scale);
      root.add(stalk);
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(0.022 * scale, 0.035 * scale, 8),
        mat
      );
      cap.position.set(0.02 * scale, 0.078 * scale, -0.01 * scale);
      root.add(cap);
    }
  }

  return tallyPlantMesh(root, THREE);
}

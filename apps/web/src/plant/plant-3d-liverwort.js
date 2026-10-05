/**
 * 地钱类 — 宽扁叶状体、叉状覆盖、清晰可见
 */
import {
  bindPlantThree,
  createPlantAccentMaterial,
  createThallusMaterial,
  mossFoliageColor,
  tallyPlantMesh,
} from './plant-3d-materials.js';

/**
 * @param {typeof import('three')} THREE
 * @param {number} length
 * @param {number} width
 * @param {'marchantia'|'conocephalum'|'riccia'} kind
 * @param {ReturnType<import('./visual-style.js').palette3d>} palette
 */
function createThallusRibbonGeometry(THREE, length, width, kind, palette) {
  const lengthSeg = Math.max(10, Math.floor(length * 36));
  const widthSeg = kind === 'riccia' ? 8 : 10;
  const geo = new THREE.BufferGeometry();
  const verts = [];
  const colors = [];
  const indices = [];

  for (let j = 0; j <= widthSeg; j++) {
    const v = j / widthSeg;
    const edgeWave = Math.sin(v * Math.PI);
    for (let i = 0; i <= lengthSeg; i++) {
      const u = i / lengthSeg;
      const along = (u - 0.5) * length;
      const curl =
        edgeWave * (0.018 + (kind === 'riccia' ? 0.012 : 0.008)) * Math.sin(u * 6.28);
      const waveMargin = Math.sin(u * 8 + v * 4) * 0.014 * edgeWave;
      const halfW = width * 0.5 * edgeWave + waveMargin;
      const px = along;
      const pz = (v - 0.5) * 2 * halfW;
      const pore = (Math.sin(u * 18) * Math.sin(v * 14) + 1) * 0.5;
      const midrib = 1 - Math.abs(v - 0.5) * 1.4;
      const py = curl + pore * 0.005 * midrib + midrib * 0.004;
      verts.push(px, py, pz);
      const layer = Math.abs(v - 0.5) * 2;
      const hex = mossFoliageColor(
        0.55 + (1 - layer) * 0.15,
        layer * 0.35,
        palette,
        { liverwort: true, satBoost: 0.15, lightMin: 0.45 }
      );
      const r = ((hex >> 16) & 255) / 255;
      const g = ((hex >> 8) & 255) / 255;
      const b = (hex & 255) / 255;
      const midDark = 1 - Math.abs(v - 0.5) * 0.35;
      colors.push(r * midDark, g * midDark, b * midDark);
    }
  }

  const row = widthSeg + 1;
  for (let j = 0; j < widthSeg; j++) {
    for (let i = 0; i < lengthSeg; i++) {
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
 * @param {number} x
 * @param {number} z
 * @param {number} rx
 * @param {number} rz
 * @param {ReturnType<import('./visual-style.js').palette3d>} palette
 */
function addLobeThallus(THREE, root, mat, x, z, rx, rz, palette) {
  const geo = new THREE.BufferGeometry();
  const segments = 12;
  const verts = [];
  const colors = [];
  const indices = [];
  for (let j = 0; j <= 8; j++) {
    const v = j / 8;
    const ang = v * Math.PI * 2;
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const rad = rx * (0.4 + u * 0.6);
      const px = x + Math.cos(ang) * rad;
      const pz = z + Math.sin(ang) * rad * (rz / rx);
      const py = 0.016 + Math.sin(u * 7) * 0.006;
      verts.push(px, py, pz);
      const hex = mossFoliageColor(0.6, v * 0.3, palette, {
        liverwort: true,
        lightMin: 0.46,
      });
      colors.push(
        ((hex >> 16) & 255) / 255,
        ((hex >> 8) & 255) / 255,
        (hex & 255) / 255
      );
    }
  }
  const row = segments + 1;
  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < segments; i++) {
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
  root.add(new THREE.Mesh(geo, mat));
}

function placeRibbon(THREE, root, mat, x, z, length, width, rotY, kind, palette) {
  const geo = createThallusRibbonGeometry(THREE, length, width, kind, palette);
  const mesh = new THREE.Mesh(geo, mat);
  const reach = length * 0.46;
  let px = x + Math.cos(rotY) * reach * 0.35;
  let pz = z + Math.sin(rotY) * reach * 0.35;
  const clampR = 0.33;
  const r = Math.hypot(px, pz);
  if (r > clampR) {
    px *= clampR / r;
    pz *= clampR / r;
  }
  mesh.position.set(px, 0.02, pz);
  mesh.rotation.y = rotY;
  root.add(mesh);
}

/**
 * @param {typeof import('three')} THREE
 * @param {import('three').Group} root
 * @param {string} id
 * @param {number} stage
 * @param {number} t
 * @param {ReturnType<import('./visual-style.js').palette3d>} palette
 */
export function buildLiverwort(THREE, root, id, stage, t, palette) {
  bindPlantThree(THREE);
  const kind =
    id === 'riccia' ? 'riccia' : id === 'conocephalum' ? 'conocephalum' : 'marchantia';

  const mat = createThallusMaterial(THREE);
  const matAlt = createThallusMaterial(THREE);
  const matRim = createPlantAccentMaterial(THREE, palette.rim, { roughness: 0.68 });

  const scale = (0.42 + t * 0.52) * 1.08;

  if (stage === 0) {
    const s0 = Math.max(0.95, scale);
    addLobeThallus(THREE, root, mat, 0, 0, 0.13 * s0, 0.07 * s0, palette);
    addLobeThallus(THREE, root, matAlt, 0.06, 0.015, 0.1 * s0, 0.055 * s0, palette);
    addLobeThallus(THREE, root, matAlt, -0.05, -0.018, 0.09 * s0, 0.05 * s0, palette);
    return tallyPlantMesh(root, THREE);
  }

  if (stage === 1) {
    placeRibbon(THREE, root, mat, 0, 0, 0.32 * scale, 0.12, 0, kind, palette);
    placeRibbon(THREE, root, matAlt, 0.02, 0.01, 0.22 * scale, 0.1, 0.45, kind, palette);
    return tallyPlantMesh(root, THREE);
  }

  const branches = id === 'riccia' ? 5 : id === 'conocephalum' ? 4 : 3;
  const potRadius = 0.34;
  const widthMain =
    id === 'riccia' ? 0.11 : id === 'conocephalum' ? 0.19 : 0.17;
  const lenBase = (0.44 + stage * 0.06) * scale;

  for (let i = 0; i < branches; i++) {
    const ang = (i / branches) * Math.PI * 2 + 0.25;
    const len = Math.min(lenBase, potRadius * 1.15);
    const ox = Math.cos(ang) * 0.02;
    const oz = Math.sin(ang) * 0.02;
    placeRibbon(
      THREE,
      root,
      i % 2 ? mat : matAlt,
      ox,
      oz,
      len,
      widthMain,
      ang,
      kind,
      palette
    );
    if (stage >= 2) {
      const forkAng = ang + (id === 'riccia' ? 0.85 : 0.55);
      placeRibbon(
        THREE,
        root,
        matAlt,
        ox + Math.cos(ang) * len * 0.35,
        oz + Math.sin(ang) * len * 0.35,
        len * 0.72,
        widthMain * 0.88,
        forkAng,
        kind,
        palette
      );
    }
    if (id === 'riccia' && stage >= 2) {
      placeRibbon(
        THREE,
        root,
        mat,
        ox,
        oz,
        len * 0.55,
        widthMain * 0.75,
        ang - 0.7,
        kind,
        palette
      );
    }
  }

  if (id === 'conocephalum' && stage >= 2) {
    const bumpGeo = createThallusRibbonGeometry(THREE, 0.18 * scale, 0.12, 'conocephalum', palette);
    const bump = new THREE.Mesh(bumpGeo, matAlt);
    bump.rotation.x = Math.PI / 2;
    bump.position.set(0, 0.032, 0);
    root.add(bump);
  }

  if (stage >= 3 && (id === 'marchantia' || id === 'conocephalum')) {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048 * scale, 0.068 * scale, 0.028, 10),
      matAlt
    );
    cup.position.set(0.1 * scale, 0.045, 0.06 * scale);
    root.add(cup);
    const cupInner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032 * scale, 0.042 * scale, 0.016, 8),
      matRim
    );
    cupInner.position.set(0.1 * scale, 0.05, 0.06 * scale);
    root.add(cupInner);
  }

  if (stage >= 4) {
    const stalk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.013, 0.13 * scale, 8),
      matRim
    );
    stalk.position.set(0, 0.07 * scale, 0);
    root.add(stalk);
    if (id === 'marchantia') {
      const palm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065 * scale, 0.055 * scale, 0.016, 10),
        mat
      );
      palm.position.set(0, 0.135 * scale, 0);
      root.add(palm);
      for (let f = 0; f < 7; f++) {
        const fingerGeo = createThallusRibbonGeometry(
          THREE,
          0.052 * scale,
          0.022,
          'marchantia',
          palette
        );
        const finger = new THREE.Mesh(fingerGeo, matAlt);
        const a = (f / 7) * Math.PI * 2;
        finger.position.set(Math.cos(a) * 0.072 * scale, 0.142 * scale, Math.sin(a) * 0.058 * scale);
        finger.rotation.set(0.32, a, 0.12);
        root.add(finger);
      }
    } else if (id === 'conocephalum') {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.065 * scale, 0.1 * scale, 10),
        mat
      );
      cone.position.set(0, 0.22 * scale, 0);
      root.add(cone);
    }
  }

  return tallyPlantMesh(root, THREE);
}

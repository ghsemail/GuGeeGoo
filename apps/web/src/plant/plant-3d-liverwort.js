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

/** @typedef {'happy'|'uneasy'|'stressed'|'withered'} PlantMood */

/**
 * @param {typeof import('three')} THREE
 * @param {number} length
 * @param {number} width
 * @param {'marchantia'|'conocephalum'|'riccia'} kind
 * @param {ReturnType<import('./visual-style.js').palette3d>} palette
 */
function createThallusRibbonGeometry(THREE, length, width, kind, palette) {
  const lengthSeg = Math.max(10, Math.floor(length * 32));
  const widthSeg = kind === 'riccia' ? 7 : 9;
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
      const curl = edgeWave * (kind === 'riccia' ? 0.008 : 0.006) * Math.sin(u * 4.5);
      const waveMargin = Math.sin(u * 5 + v * 2.5) * 0.006 * edgeWave;
      const halfW = width * 0.5 * edgeWave + waveMargin;
      const px = along;
      const pz = (v - 0.5) * 2 * halfW;
      const midrib = 1 - Math.abs(v - 0.5) * 1.35;
      const py = curl + midrib * 0.003;
      verts.push(px, py, pz);
      const layer = Math.abs(v - 0.5) * 2;
      const hex = mossFoliageColor(
        0.5 + (1 - layer) * 0.22,
        layer * 0.28,
        palette,
        { liverwort: true, satBoost: 0.2, lightMin: 0.38 }
      );
      let r = ((hex >> 16) & 255) / 255;
      let g = ((hex >> 8) & 255) / 255;
      let b = (hex & 255) / 255;
      const marginLift = 0.88 + edgeWave * 0.18;
      const midDark = 0.72 + midrib * 0.28;
      r *= midDark * marginLift;
      g *= midDark * marginLift;
      b *= midDark * marginLift;
      colors.push(r, g, b);
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
      const py = 0.014 + Math.sin(u * 5) * 0.004;
      verts.push(px, py, pz);
      const hex = mossFoliageColor(0.58, v * 0.25, palette, {
        liverwort: true,
        lightMin: 0.4,
        satBoost: 0.18,
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
 * @param {number} scale
 * @param {import('three').Material} mat
 * @param {import('three').Material} matAlt
 */
function addMarchantiaArchegoniophore(THREE, root, scale, mat, matAlt, palette) {
  const stalk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.013, 0.13 * scale, 8),
    createPlantAccentMaterial(THREE, palette.rim, { roughness: 0.58 })
  );
  stalk.position.set(0, 0.07 * scale, 0);
  root.add(stalk);
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07 * scale, 0.062 * scale, 0.012, 12),
    createPlantAccentMaterial(THREE, palette.main, { roughness: 0.52 })
  );
  disc.position.set(0, 0.138 * scale, 0);
  root.add(disc);
  for (let f = 0; f < 8; f++) {
    const a = (f / 8) * Math.PI * 2;
    const lobeGeo = new THREE.PlaneGeometry(0.032 * scale, 0.018 * scale, 1, 1);
    const verts = lobeGeo.attributes.position.count;
    const cols = new Float32Array(verts * 3);
    const hex = mossFoliageColor(0.72, 0.2, palette, { liverwort: true, satBoost: 0.16 });
    const cr = ((hex >> 16) & 255) / 255;
    const cg = ((hex >> 8) & 255) / 255;
    const cb = (hex & 255) / 255;
    for (let i = 0; i < verts; i++) {
      cols[i * 3] = cr;
      cols[i * 3 + 1] = cg;
      cols[i * 3 + 2] = cb;
    }
    lobeGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const lobe = new THREE.Mesh(lobeGeo, matAlt);
    lobe.position.set(Math.cos(a) * 0.072 * scale, 0.144 * scale, Math.sin(a) * 0.058 * scale);
    lobe.rotation.set(-0.62, a, 0.06);
    root.add(lobe);
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
  const matRim = createPlantAccentMaterial(THREE, palette.rim, { roughness: 0.55 });

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
  const hub = id === 'marchantia' && stage >= 4 ? 0.06 : 0.02;

  for (let i = 0; i < branches; i++) {
    const ang = (i / branches) * Math.PI * 2 + 0.25;
    const len = Math.min(lenBase, potRadius * 1.15);
    const ox = Math.cos(ang) * hub;
    const oz = Math.sin(ang) * hub;
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
        ox + Math.cos(ang) * len * 0.38,
        oz + Math.sin(ang) * len * 0.38,
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
    if (id === 'marchantia') {
      addMarchantiaArchegoniophore(THREE, root, scale, mat, matAlt, palette);
    } else if (id === 'conocephalum') {
      const stalk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.013, 0.13 * scale, 8),
        matRim
      );
      stalk.position.set(0, 0.07 * scale, 0);
      root.add(stalk);
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

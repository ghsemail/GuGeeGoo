/**
 * 地钱类 3D — 波状叶状体、菱形网纹感、半透明缘
 */
import {
  bindPlantThree,
  createPlantAccentMaterial,
  createThallusMaterial,
  mossFoliageColor,
} from './plant-3d-materials.js';

/**
 * @param {typeof import('three')} THREE
 * @param {number} length
 * @param {number} width
 * @param {number} lengthSeg
 * @param {number} widthSeg
 * @param {'marchantia'|'conocephalum'|'riccia'} kind
 * @param {ReturnType<import('./visual-style.js').palette3d>} palette
 */
function createThallusRibbonGeometry(THREE, length, width, lengthSeg, widthSeg, kind, palette) {
  const geo = new THREE.BufferGeometry();
  const verts = [];
  const uvs = [];
  const colors = [];
  const indices = [];

  for (let j = 0; j <= widthSeg; j++) {
    const v = j / widthSeg;
    const edgeWave = Math.sin(v * Math.PI) * 0.85;
    for (let i = 0; i <= lengthSeg; i++) {
      const u = i / lengthSeg;
      const along = (u - 0.5) * length;
      const waveMargin =
        kind === 'riccia'
          ? Math.sin(u * 14 + v * 3) * 0.012
          : Math.sin(u * 9 + v * 5) * 0.018 * edgeWave;
      const halfW = (width * 0.5 + waveMargin) * edgeWave;
      const px = along;
      const pz = (v - 0.5) * 2 * halfW;
      const pore =
        (Math.sin(u * 22 + 1.3) * Math.sin(v * 18 + 0.7) + 1) * 0.5;
      const midrib = 1 - Math.abs(v - 0.5) * 1.6;
      const py =
        pore * 0.004 * midrib +
        (kind === 'conocephalum' ? 0.003 : 0.002) * Math.sin(u * 40) * midrib;
      verts.push(px, py, pz);
      uvs.push(u, v);
      const layer = Math.abs(v - 0.5) * 2;
      const tip = 1 - Math.abs(u - 0.55) * 1.2;
      const hex = mossFoliageColor(
        Math.min(1, tip * 0.5 + 0.35),
        layer,
        palette,
        { sat: kind === 'riccia' ? 0.42 : 0.5, hueShift: kind === 'riccia' ? 0.02 : 0 }
      );
      const r = ((hex >> 16) & 255) / 255;
      const g = ((hex >> 8) & 255) / 255;
      const b = (hex & 255) / 255;
      const edgeFade = kind === 'riccia' ? 0.92 + (1 - layer) * 0.08 : 1;
      colors.push(r * edgeFade, g * edgeFade, b * edgeFade);
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
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
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
 */
function addLobeThallus(THREE, root, mat, x, z, rx, rz, palette) {
  const geo = new THREE.BufferGeometry();
  const segments = 10;
  const verts = [];
  const colors = [];
  const indices = [];
  for (let j = 0; j <= 6; j++) {
    const v = j / 6;
    const ang = v * Math.PI * 2;
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const rad = rx * (0.35 + u * 0.65) * (1 + Math.sin(ang * 3) * 0.08);
      const px = x + Math.cos(ang) * rad * (0.9 + u * 0.15);
      const pz = z + Math.sin(ang) * rad * (rz / rx);
      const py = 0.012 + Math.sin(u * 8 + ang) * 0.003;
      verts.push(px, py, pz);
      const hex = mossFoliageColor(u * 0.7 + 0.15, v * 0.4, palette);
      colors.push(
        ((hex >> 16) & 255) / 255,
        ((hex >> 8) & 255) / 255,
        (hex & 255) / 255
      );
    }
  }
  const row = segments + 1;
  for (let j = 0; j < 6; j++) {
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

/**
 * @param {typeof import('three')} THREE
 * @param {import('three').Group} root
 * @param {import('three').Material} mat
 * @param {number} x
 * @param {number} z
 * @param {number} length
 * @param {number} width
 * @param {number} rotY
 * @param {'marchantia'|'conocephalum'|'riccia'} kind
 */
function addRibbonThallus(THREE, root, mat, x, z, length, width, rotY, kind, palette) {
  const geo = createThallusRibbonGeometry(
    THREE,
    length,
    width,
    Math.max(8, Math.floor(length * 28)),
    kind === 'riccia' ? 5 : 7,
    kind,
    palette
  );
  const mesh = new THREE.Mesh(geo, mat);
  const reach = length * 0.48;
  let px = x + Math.cos(rotY) * reach;
  let pz = z + Math.sin(rotY) * reach;
  const clampR = 0.34;
  const r = Math.hypot(px, pz);
  if (r > clampR) {
    px *= clampR / r;
    pz *= clampR / r;
  }
  mesh.position.set(px, 0.018, pz);
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
 * @returns {{ triangles: number, drawCalls: number }}
 */
export function buildLiverwort(THREE, root, id, stage, t, palette) {
  bindPlantThree(THREE);
  const kind =
    id === 'riccia' ? 'riccia' : id === 'conocephalum' ? 'conocephalum' : 'marchantia';

  const mat = createThallusMaterial(THREE, palette);
  const matAlt = createThallusMaterial(THREE, { ...palette, main: palette.alt });
  const matRim = createPlantAccentMaterial(THREE, palette.rim, { roughness: 0.7 });

  const scale = (0.38 + t * 0.48) * 1.06;
  /** @param {import('three').Object3D} obj */
  const tally = (obj) => {
    let drawCalls = 0;
    let triangles = 0;
    obj.traverse((ch) => {
      if (ch instanceof THREE.Mesh) {
        drawCalls += 1;
        const g = ch.geometry;
        if (g?.index) triangles += g.index.count / 3;
        else if (g?.attributes?.position) triangles += g.attributes.position.count / 3;
      } else if (ch instanceof THREE.InstancedMesh && ch.geometry?.index) {
        drawCalls += 1;
        triangles += (ch.count * ch.geometry.index.count) / 3;
      }
    });
    return { drawCalls, triangles: Math.round(triangles) };
  };

  if (stage === 0) {
    const s0 = Math.max(0.92, scale);
    addLobeThallus(THREE, root, mat, 0, 0, 0.11 * s0, 0.058 * s0, palette);
    addLobeThallus(THREE, root, matAlt, 0.055, 0.012, 0.082 * s0, 0.048 * s0, palette);
    addLobeThallus(THREE, root, matAlt, -0.048, -0.015, 0.072 * s0, 0.042 * s0, palette);
    return tally(root);
  }

  if (stage === 1) {
    addRibbonThallus(THREE, root, mat, 0, 0, 0.26 * scale, 0.085, 0, kind, palette);
    addRibbonThallus(THREE, root, matAlt, 0.02, 0.01, 0.17 * scale, 0.072, 0.4, kind, palette);
    return tally(root);
  }

  const branches = id === 'riccia' ? 4 : id === 'conocephalum' ? 3 : 2;
  const potRadius = 0.36;
  for (let i = 0; i < branches; i++) {
    const ang = (i / branches) * Math.PI * 2 + 0.3;
    const len = Math.min((0.28 + stage * 0.06) * scale, potRadius * 1.05);
    const w = id === 'riccia' ? 0.048 : id === 'conocephalum' ? 0.11 : 0.082;
    const ox = Math.cos(ang) * 0.04;
    const oz = Math.sin(ang) * 0.032;
    addRibbonThallus(
      THREE,
      root,
      i % 2 ? mat : matAlt,
      ox,
      oz,
      len,
      w,
      ang,
      kind,
      palette
    );
    if (id === 'riccia' && stage >= 2) {
      addRibbonThallus(
        THREE,
        root,
        matAlt,
        Math.cos(ang) * 0.12,
        Math.sin(ang) * 0.1,
        len * 0.68,
        w * 0.88,
        ang + 0.7,
        kind,
        palette
      );
    }
  }

  if (id === 'conocephalum' && stage >= 2) {
    const bumpGeo = createThallusRibbonGeometry(
      THREE,
      0.14 * scale,
      0.09,
      6,
      5,
      'conocephalum',
      palette
    );
    const bump = new THREE.Mesh(bumpGeo, matAlt);
    bump.rotation.x = Math.PI / 2;
    bump.position.set(0, 0.026, 0);
    root.add(bump);
  }

  if (stage >= 3 && (id === 'marchantia' || id === 'conocephalum')) {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055 * scale, 0.078 * scale, 0.034, 12),
      matAlt
    );
    cup.position.set(0.09 * scale, 0.042, 0.055 * scale);
    root.add(cup);
    const cupInner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038 * scale, 0.048 * scale, 0.018, 10),
      matRim
    );
    cupInner.position.set(0.09 * scale, 0.048, 0.055 * scale);
    root.add(cupInner);
  }

  if (stage >= 4) {
    const stalk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.02, 0.2 * scale, 10),
      matRim
    );
    stalk.position.set(0, 0.1 * scale, 0);
    root.add(stalk);
    if (id === 'marchantia') {
      const palm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11 * scale, 0.095 * scale, 0.024, 12),
        mat
      );
      palm.position.set(0, 0.21 * scale, 0);
      root.add(palm);
      for (let f = 0; f < 7; f++) {
        const fingerGeo = createThallusRibbonGeometry(
          THREE,
          0.07 * scale,
          0.022,
          4,
          3,
          'marchantia',
          palette
        );
        const finger = new THREE.Mesh(fingerGeo, matAlt);
        const a = (f / 7) * Math.PI * 2;
        finger.position.set(Math.cos(a) * 0.095 * scale, 0.222 * scale, Math.sin(a) * 0.075 * scale);
        finger.rotation.set(0.35, a, 0.15);
        root.add(finger);
      }
    } else if (id === 'conocephalum') {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.076 * scale, 0.12 * scale, 12),
        mat
      );
      cone.position.set(0, 0.265 * scale, 0);
      root.add(cone);
    }
  }

  return tally(root);
}

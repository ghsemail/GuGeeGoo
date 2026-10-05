/**
 * 地钱类 — 宽扁 Shape 叶状体（贴地、圆尖二叉、盘内约束）
 */
import {
  bindPlantThree,
  createPlantAccentMaterial,
  createThallusMaterial,
  mossFoliageColor,
  tallyPlantMesh,
} from './plant-3d-materials.js';

/** @typedef {'happy'|'uneasy'|'stressed'|'withered'} PlantMood */

/** 内土半径 0.42 × 0.92 */
export const LIVERWORT_SOIL_MAX_R = 0.386;

/**
 * @param {typeof import('three')} THREE
 * @param {ReturnType<import('./visual-style.js').palette3d>} palette
 */
function getThallusMaterial(THREE, palette) {
  const mat = createThallusMaterial(THREE);
  mat.roughness = 0.62;
  mat.metalness = 0.04;
  const em = new THREE.Color(palette.main).multiplyScalar(0.28);
  mat.emissive = em;
  const hsl = { h: 0, s: 0, l: 0 };
  em.getHSL(hsl);
  mat.emissiveIntensity = hsl.s < 0.38 ? 0.12 : 0.26;
  return mat;
}

/**
 * 宽扁带 + 圆钝二叉尖（heart notch）
 * @param {number} L 长度
 * @param {number} W 半宽
 * @param {boolean} forkTip
 * @param {typeof import('three')} THREE
 */
function createBroadThallusShape(L, W, forkTip, THREE) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(L * 0.08, W * 0.95, L * 0.38, W * 1.02, L * 0.58, W * 0.96);
  if (forkTip) {
    shape.bezierCurveTo(L * 0.7, W * 0.88, L * 0.76, W * 0.62, L * 0.8, W * 0.48);
    shape.quadraticCurveTo(L * 0.86, W * 0.12, L * 0.72, 0);
    shape.quadraticCurveTo(L * 0.86, -W * 0.12, L * 0.8, -W * 0.48);
    shape.bezierCurveTo(L * 0.76, -W * 0.62, L * 0.7, -W * 0.88, L * 0.58, -W * 0.96);
  } else {
    shape.bezierCurveTo(L * 0.78, -W * 0.98, L * 0.9, -W * 0.35, L * 0.88, 0);
    shape.bezierCurveTo(L * 0.9, W * 0.35, L * 0.78, W * 0.98, L * 0.58, W * 0.96);
  }
  shape.bezierCurveTo(L * 0.38, W * 1.02, L * 0.08, W * 0.95, 0, 0);
  return shape;
}

/**
 * @param {typeof import('three')} THREE
 * @param {'marchantia'|'conocephalum'|'riccia'} kind
 * @param {number} L
 * @param {number} W
 * @param {boolean} forkTip
 * @param {ReturnType<import('./visual-style.js').palette3d>} palette
 */
function buildLobeGeometry(THREE, kind, L, W, forkTip, palette) {
  const shape = createBroadThallusShape(L, W, forkTip, THREE);
  const segments = kind === 'riccia' ? 32 : 40;
  const geo = new THREE.ShapeGeometry(shape, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let z = pos.getZ(i);
    const u = Math.max(0, Math.min(1, x / Math.max(0.001, L)));
    const across = W > 0.001 ? z / W : 0;
    const edge = Math.min(1, Math.abs(across));
    const marginLift = 1 + edge * 0.06;
    const midrib = 0.97 + (1 - edge) * 0.03;
    let y = 0.017 + edge * 0.0012;
    if (forkTip && u > 0.52) y = 0.0178 + edge * 0.0008;

    pos.setX(i, x);
    pos.setY(i, y);
    pos.setZ(i, z);

    const hex = mossFoliageColor(0.42 + u * 0.35, edge * 0.25, palette, {
      liverwort: true,
      satBoost: kind === 'conocephalum' ? 0.26 : kind === 'riccia' ? 0.2 : 0.24,
      lightMin: kind === 'riccia' ? 0.38 : 0.34,
    });
    let r = ((hex >> 16) & 255) / 255;
    let g = ((hex >> 8) & 255) / 255;
    let b = (hex & 255) / 255;
    let shade = midrib * marginLift;
    if (forkTip && u > 0.58) shade *= 1.06;
    r *= shade;
    g *= shade;
    b *= shade;
    if (kind === 'conocephalum') {
      const pore = (Math.sin(u * 24) * Math.sin(across * 18) + 1) * 0.025;
      r *= 1 - pore;
      g *= 1 - pore * 0.5;
    }
    if (kind === 'marchantia') {
      const dot = (Math.sin(u * 31 + 2) * Math.sin(across * 22 + 1) + 1) * 0.015;
      r *= 1 - dot;
      g *= 1 - dot * 0.6;
    }
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  pos.needsUpdate = true;
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * @param {import('three').BufferGeometry} geo
 * @param {import('three').Mesh} mesh
 * @param {typeof import('three')} THREE
 * @param {number} maxR
 */
function clampLobeGeometryToSoil(geo, mesh, THREE, maxR) {
  mesh.updateMatrix();
  const m = mesh.matrix.clone();
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    v.applyMatrix4(m);
    const r = Math.hypot(v.x, v.z);
    if (v.y < 0.09 && r > maxR) {
      v.x *= maxR / r;
      v.z *= maxR / r;
      v.applyMatrix4(m.clone().invert());
      pos.setXYZ(i, v.x, v.y, v.z);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

/**
 * @param {typeof import('three')} THREE
 * @param {import('three').Group} root
 * @param {'marchantia'|'conocephalum'|'riccia'} kind
 * @param {number} rotY
 * @param {number} L
 * @param {number} W
 * @param {boolean} forkTip
 * @param {number} yLift
 * @param {ReturnType<import('./visual-style.js').palette3d>} palette
 */
function addLobe(THREE, root, kind, rotY, L, W, forkTip, yLift, palette) {
  const mat = getThallusMaterial(THREE, palette);
  const geo = buildLobeGeometry(THREE, kind, L, W, forkTip, palette);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, yLift, 0);
  mesh.rotation.y = rotY;
  clampLobeGeometryToSoil(geo, mesh, THREE, LIVERWORT_SOIL_MAX_R);
  root.add(mesh);
}

function addGemmaCup(THREE, root, x, z, scale, palette) {
  const cupMat = createPlantAccentMaterial(THREE, palette.rim, { roughness: 0.62 });
  const outer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022 * scale, 0.028 * scale, 0.01 * scale, 10, 1, true),
    cupMat
  );
  outer.position.set(x, 0.026 * scale, z);
  root.add(outer);
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014 * scale, 0.018 * scale, 0.006 * scale, 8),
    createPlantAccentMaterial(THREE, palette.main, { roughness: 0.55 })
  );
  inner.position.set(x, 0.027 * scale, z);
  root.add(inner);
}

function addMarchantiaArchegoniophore(THREE, root, scale, palette) {
  const stalkMat = createPlantAccentMaterial(THREE, 0x5a7048, { roughness: 0.65 });
  const thallusMat = getThallusMaterial(THREE, palette);
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

  const spread = Math.min(1.32, 1.12 + t * 0.28);
  const mature = stage >= 4;

  if (stage === 0) {
    addLobe(THREE, root, kind, 0.1, 0.14 * spread, 0.055 * spread, true, 0.018, palette);
    addLobe(THREE, root, kind, 1.05, 0.11 * spread, 0.042 * spread, false, 0.017, palette);
    addLobe(THREE, root, kind, -0.7, 0.1 * spread, 0.038 * spread, false, 0.016, palette);
    return tallyPlantMesh(root, THREE);
  }

  if (stage === 1) {
    addLobe(THREE, root, kind, 0, 0.22 * spread, 0.08 * spread, true, 0.018, palette);
    addLobe(THREE, root, kind, 0.62, 0.16 * spread, 0.065 * spread, true, 0.019, palette);
    return tallyPlantMesh(root, THREE);
  }

  if (id === 'riccia') {
    const L = 0.2 * spread;
    const W = 0.044 * spread;
    const arms = stage >= 2 ? 8 : 5;
    for (let i = 0; i < arms; i++) {
      const ang = (i / arms) * Math.PI * 2 + 0.2;
      addLobe(THREE, root, kind, ang, L, W, true, 0.017 + (i % 3) * 0.0015, palette);
      if (stage >= 2) {
        addLobe(
          THREE,
          root,
          kind,
          ang + 0.42,
          L * 0.78,
          W * 0.88,
          true,
          0.018 + (i % 2) * 0.001,
          palette
        );
      }
      if (stage >= 3 && i % 2 === 0) {
        addLobe(
          THREE,
          root,
          kind,
          ang + 0.18,
          L * 0.55,
          W * 0.92,
          true,
          0.0175,
          palette
        );
      }
    }
  } else {
    const L = id === 'conocephalum' ? 0.3 * spread : 0.28 * spread;
    const W = id === 'conocephalum' ? 0.1 * spread : 0.088 * spread;
    const lobes = id === 'conocephalum' ? 5 : 4;
    for (let i = 0; i < lobes; i++) {
      const ang = (i / lobes) * Math.PI * 2 + 0.15;
      addLobe(
        THREE,
        root,
        kind,
        ang,
        L,
        W,
        stage >= 2,
        0.017 + (i % 4) * 0.0012,
        palette
      );
    }
  }

  if (id === 'marchantia' && stage >= 3) {
    addGemmaCup(THREE, root, 0.08 * spread, 0.05 * spread, spread, palette);
    addGemmaCup(THREE, root, -0.07 * spread, 0.04 * spread, spread * 0.92, palette);
  }

  if (mature) {
    if (id === 'marchantia') {
      addMarchantiaArchegoniophore(THREE, root, spread, palette);
    } else if (id === 'conocephalum') {
      const mat = getThallusMaterial(THREE, palette);
      const stalk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0035 * spread, 0.005 * spread, 0.075 * spread, 8),
        createPlantAccentMaterial(THREE, 0x6a8060, { roughness: 0.55 })
      );
      stalk.position.set(0.02 * spread, 0.038 * spread, -0.01 * spread);
      root.add(stalk);
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(0.022 * spread, 0.035 * spread, 8),
        mat
      );
      cap.position.set(0.02 * spread, 0.078 * spread, -0.01 * spread);
      root.add(cap);
    }
  }

  return tallyPlantMesh(root, THREE);
}

/**
 * QA：贴地叶状体顶点不得超出土盘（verify-plant-3d-touch）
 * @param {import('three').Object3D} root
 * @param {typeof import('three')} THREE
 * @param {number} [maxR]
 */
export function assertLiverwortThalliInsideSoil(root, THREE, maxR = LIVERWORT_SOIL_MAX_R) {
  root.updateWorldMatrix(true, true);
  const v = new THREE.Vector3();
  let worstR = 0;
  let violations = 0;
  const yMin = 0.008;
  const yMax = 0.095;
  root.traverse((ch) => {
    if (!ch.isMesh || !ch.geometry?.attributes?.position) return;
    const pos = ch.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      v.applyMatrix4(ch.matrixWorld);
      if (v.y < yMin || v.y > yMax) continue;
      const r = Math.hypot(v.x, v.z);
      if (r > worstR) worstR = r;
      if (r > maxR + 1e-4) violations += 1;
    }
  });
  return { ok: violations === 0, violations, worstR, maxR };
}

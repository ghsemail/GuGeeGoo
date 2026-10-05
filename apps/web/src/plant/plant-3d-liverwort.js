/**
 * 地钱类 — Shape 扁带叶状体（平滑单面 + 程序化纹理）
 */
import {
  bindPlantThree,
  createPlantAccentMaterial,
  mossFoliageColor,
  tallyPlantMesh,
} from './plant-3d-materials.js';

/** @typedef {'happy'|'uneasy'|'stressed'|'withered'} PlantMood */

/** @type {Map<string, import('three').MeshStandardMaterial>} */
const thallusMatCache = new Map();

/**
 * @param {typeof import('three')} THREE
 * @param {'marchantia'|'conocephalum'|'riccia'} kind
 */
function createThallusTexture(THREE, kind) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grd = ctx.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, kind === 'riccia' ? '#7cb87a' : '#5a9e52');
  grd.addColorStop(0.45, kind === 'riccia' ? '#8ecf88' : '#6bb862');
  grd.addColorStop(0.5, kind === 'riccia' ? '#3d7040' : '#2e6534');
  grd.addColorStop(0.55, kind === 'riccia' ? '#8ecf88' : '#6bb862');
  grd.addColorStop(1, kind === 'riccia' ? '#7cb87a' : '#5a9e52');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = 'rgba(28,72,32,0.55)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(256, 8);
  ctx.lineTo(256, 248);
  ctx.stroke();

  if (kind === 'conocephalum') {
    ctx.fillStyle = 'rgba(22,58,28,0.12)';
    const step = 22;
    for (let py = 10; py < 246; py += step) {
      for (let px = 10; px < 502; px += step * 1.15) {
        const ox = ((py / step) % 2) * (step * 0.55);
        ctx.beginPath();
        ctx.arc(px + ox, py, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  if (kind === 'marchantia') {
    ctx.fillStyle = 'rgba(18,50,24,0.1)';
    for (let i = 0; i < 120; i++) {
      const px = 40 + ((i * 47) % 430);
      const py = 20 + ((i * 83) % 210);
      ctx.beginPath();
      ctx.arc(px, py, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * @param {typeof import('three')} THREE
 * @param {'marchantia'|'conocephalum'|'riccia'} kind
 */
function getThallusMaterial(THREE, kind) {
  const key = kind;
  if (thallusMatCache.has(key)) return thallusMatCache.get(key);
  const map = createThallusTexture(THREE, kind);
  const mat = new THREE.MeshStandardMaterial({
    map,
    color: 0xffffff,
    roughness: 0.5,
    metalness: 0.09,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnits: 2,
  });
  thallusMatCache.set(key, mat);
  return mat;
}

/**
 * @param {typeof import('three')} THREE
 * @param {'marchantia'|'conocephalum'|'riccia'} kind
 * @param {number} length 沿叶状体方向（未缩放）
 * @param {number} halfW 最大半宽
 * @param {boolean} forkTip
 */
function createForkedStrapShape(THREE, kind, length, halfW, forkTip) {
  const shape = new THREE.Shape();
  const L = length;
  const W = halfW;
  const fork = forkTip && kind !== 'riccia';
  const forkW = kind === 'riccia' ? 0.55 : 0.72;

  shape.moveTo(0, 0);
  shape.bezierCurveTo(-W * 0.35, L * 0.15, -W * 0.95, L * 0.42, -W * 0.88, L * 0.62);
  if (fork) {
    shape.bezierCurveTo(-W * 0.75, L * 0.78, -W * forkW, L * 0.92, -W * 0.42, L * 1.02);
    shape.quadraticCurveTo(-W * 0.18, L * 1.08, 0, L * 0.96);
    shape.quadraticCurveTo(W * 0.18, L * 1.08, W * 0.42, L * 1.02);
    shape.bezierCurveTo(W * forkW, L * 0.92, W * 0.75, L * 0.78, W * 0.88, L * 0.62);
  } else {
    shape.quadraticCurveTo(-W * 0.35, L * 0.95, 0, L * 1.02);
    shape.quadraticCurveTo(W * 0.35, L * 0.95, W * 0.88, L * 0.62);
  }
  shape.bezierCurveTo(W * 0.95, L * 0.42, W * 0.35, L * 0.15, 0, 0);
  return shape;
}

/**
 * @param {typeof import('three')} THREE
 * @param {'marchantia'|'conocephalum'|'riccia'} kind
 * @param {number} length
 * @param {number} halfW
 * @param {boolean} forkTip
 */
function buildLobeGeometry(THREE, kind, length, halfW, forkTip) {
  const shape = createForkedStrapShape(THREE, kind, length, halfW, forkTip);
  const segments = kind === 'riccia' ? 28 : 36;
  const geo = new THREE.ShapeGeometry(shape, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const u = x / Math.max(0.001, length);
    const v = Math.abs(z) / Math.max(0.001, halfW);
    const edge = Math.min(1, v);
    const curl = edge * edge * 0.012 * Math.sin(u * 7.5);
    const wave = 0.004 * Math.sin(u * 11 + z * 18);
    pos.setY(i, 0.018 + curl + wave);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * @param {typeof import('three')} THREE
 * @param {import('three').Group} root
 * @param {'marchantia'|'conocephalum'|'riccia'} kind
 * @param {number} ox
 * @param {number} oz
 * @param {number} rotY
 * @param {number} length
 * @param {number} halfW
 * @param {boolean} forkTip
 * @param {number} yLift
 */
function addLobe(
  THREE,
  root,
  kind,
  ox,
  oz,
  rotY,
  length,
  halfW,
  forkTip,
  yLift
) {
  const mat = getThallusMaterial(THREE, kind);
  const geo = buildLobeGeometry(THREE, kind, length, halfW, forkTip);
  const mesh = new THREE.Mesh(geo, mat);
  const reach = length * 0.52;
  mesh.position.set(ox + Math.cos(rotY) * reach * 0.38, yLift, oz + Math.sin(rotY) * reach * 0.38);
  mesh.rotation.y = rotY;
  root.add(mesh);
}

function addGemmaCup(THREE, root, x, z, scale, palette) {
  const cupMat = createPlantAccentMaterial(THREE, palette.rim, { roughness: 0.62 });
  const outer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024 * scale, 0.03 * scale, 0.011 * scale, 10, 1, true),
    cupMat
  );
  outer.position.set(x, 0.028 * scale, z);
  root.add(outer);
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015 * scale, 0.019 * scale, 0.007 * scale, 8),
    createPlantAccentMaterial(THREE, palette.main, { roughness: 0.55 })
  );
  inner.position.set(x, 0.029 * scale, z);
  root.add(inner);
}

function addMarchantiaArchegoniophore(THREE, root, scale, palette) {
  const stalkMat = createPlantAccentMaterial(THREE, 0x5a7048, { roughness: 0.65 });
  const thallusMat = getThallusMaterial(THREE, 'marchantia');
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
  void palette;
  const kind =
    id === 'riccia' ? 'riccia' : id === 'conocephalum' ? 'conocephalum' : 'marchantia';

  const spread = 1.55 + t * 0.45;
  const mature = stage >= 4;

  if (stage === 0) {
    addLobe(THREE, root, kind, 0, 0, 0.15, 0.22 * spread, 0.055, true, 0.018);
    addLobe(THREE, root, kind, 0.03, 0.02, 1.05, 0.16 * spread, 0.042, false, 0.017);
    addLobe(THREE, root, kind, -0.02, -0.02, -0.65, 0.14 * spread, 0.038, false, 0.016);
    return tallyPlantMesh(root, THREE);
  }

  if (stage === 1) {
    addLobe(THREE, root, kind, 0, 0, 0, 0.38 * spread, 0.075, true, 0.018);
    addLobe(THREE, root, kind, 0.02, 0.01, 0.62, 0.28 * spread, 0.06, true, 0.019);
    return tallyPlantMesh(root, THREE);
  }

  const lobes = id === 'riccia' ? 6 : id === 'conocephalum' ? 5 : 4;
  const len =
    id === 'riccia' ? 0.42 * spread : id === 'conocephalum' ? 0.58 * spread : 0.55 * spread;
  const halfW =
    id === 'riccia' ? 0.048 * spread : id === 'conocephalum' ? 0.095 * spread : 0.088 * spread;
  const fork = stage >= 2;

  for (let i = 0; i < lobes; i++) {
    const ang = (i / lobes) * Math.PI * 2 + 0.18;
    const ox = Math.cos(ang) * 0.055;
    const oz = Math.sin(ang) * 0.055;
    addLobe(THREE, root, kind, ox, oz, ang, len, halfW, fork, 0.016 + i * 0.003);
    if (id === 'riccia' && stage >= 2 && i % 2 === 0) {
      addLobe(
        THREE,
        root,
        kind,
        ox + Math.cos(ang) * len * 0.35,
        oz + Math.sin(ang) * len * 0.35,
        ang + 0.55,
        len * 0.55,
        halfW * 0.75,
        true,
        0.018 + (i % 2) * 0.002
      );
    }
  }

  if (id === 'marchantia' && stage >= 3) {
    addGemmaCup(THREE, root, 0.12 * spread, 0.08 * spread, spread, palette);
    addGemmaCup(THREE, root, -0.1 * spread, 0.06 * spread, spread * 0.92, palette);
  }

  if (mature) {
    if (id === 'marchantia') {
      addMarchantiaArchegoniophore(THREE, root, spread, palette);
    } else if (id === 'conocephalum') {
      const mat = getThallusMaterial(THREE, kind);
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

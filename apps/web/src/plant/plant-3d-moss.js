/**
 * 藓类 — 密集垫状丛 + 多层叶卡/绒面壳
 */
import {
  bindPlantThree,
  createMossFoliageMaterial,
  createMossShellMaterial,
  createPlantAccentMaterial,
  mossFoliageColor,
  tallyPlantMesh,
} from './plant-3d-materials.js';

/** @type {import('three').BufferGeometry | null} */
let leafGeoInner = null;
/** @type {import('three').BufferGeometry | null} */
let leafGeoOuter = null;

/**
 * @param {typeof import('three')} THREE
 * @param {boolean} outer
 */
function getLeafGeometry(THREE, outer) {
  if (outer && leafGeoOuter) return leafGeoOuter;
  if (!outer && leafGeoInner) return leafGeoInner;
  const w = outer ? 0.028 : 0.022;
  const h = outer ? 0.042 : 0.034;
  const geo = new THREE.PlaneGeometry(w, h, 2, 3);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = y / h + 0.5;
    pos.setZ(i, Math.sin(t * Math.PI) * (outer ? 0.008 : 0.006));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  if (outer) leafGeoOuter = geo;
  else leafGeoInner = geo;
  return geo;
}

/**
 * @param {typeof import('three')} THREE
 * @param {import('three').InstancedMesh} mesh
 * @param {number} idx
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} rotY
 * @param {number} tilt
 * @param {number} scale
 * @param {number} hex
 */
function setLeafInstance(THREE, mesh, idx, x, y, z, rotY, tilt, scale, hex) {
  const dummy = new THREE.Object3D();
  dummy.position.set(x, y, z);
  dummy.rotation.set(tilt, rotY, 0);
  dummy.scale.setScalar(scale);
  dummy.updateMatrix();
  mesh.setMatrixAt(idx, dummy.matrix);
  const color = new THREE.Color(hex);
  mesh.setColorAt(idx, color);
}

/** @typedef {{ shoots: number, radius: number, height: number, leavesPerShoot: number, shells: number, satBoost: number, hueShift: number, flatMat?: boolean, pale?: boolean }} MossSpeciesLayout */

/** @param {string} id @param {number} stage @param {number} t */
function layoutFor(id, stage, t) {
  const mature = stage >= 4;
  const mid = stage >= 2;
  /** @type {MossSpeciesLayout} */
  const base = {
    shoots: stage === 0 ? 6 : stage === 1 ? 10 : mid ? 48 : 72,
    radius: stage === 0 ? 0.1 : stage === 1 ? 0.16 : 0.28 + t * 0.06,
    height: 0.08,
    leavesPerShoot: stage === 0 ? 6 : stage === 1 ? 8 : 10,
    shells: mature ? 2 : stage === 0 ? 0 : 1,
    satBoost: 0.1,
    hueShift: 0,
  };

  if (id === 'leucobryum') {
    return {
      ...base,
      shoots: mature ? 110 : base.shoots,
      height: mature ? 0.09 : 0.06,
      radius: mature ? 0.3 : base.radius,
      leavesPerShoot: mature ? 9 : base.leavesPerShoot,
      pale: true,
      hueShift: -0.03,
      satBoost: 0.06,
    };
  }
  if (id === 'hypnum') {
    return {
      ...base,
      shoots: mature ? 130 : base.shoots,
      height: mature ? 0.07 : 0.05,
      flatMat: true,
      leavesPerShoot: mature ? 8 : base.leavesPerShoot,
      satBoost: 0.14,
      hueShift: 0.02,
    };
  }
  if (id === 'polytrichum') {
    return {
      ...base,
      shoots: mature ? 95 : base.shoots,
      height: mature ? 0.22 : 0.1,
      radius: mature ? 0.27 : base.radius,
      leavesPerShoot: mature ? 14 : base.leavesPerShoot,
      satBoost: 0.08,
      hueShift: -0.01,
    };
  }
  if (id === 'funaria') {
    return {
      ...base,
      shoots: mature ? 100 : base.shoots,
      height: mature ? 0.11 : 0.06,
      radius: mature ? 0.26 : base.radius,
      leavesPerShoot: mature ? 9 : base.leavesPerShoot,
    };
  }
  return base;
}

/**
 * @param {typeof import('three')} THREE
 * @param {import('three').Group} root
 * @param {string} id
 * @param {number} stage
 * @param {number} t
 * @param {ReturnType<import('./visual-style.js').palette3d>} palette
 */
export function buildMossCushion(THREE, root, id, stage, t, palette) {
  bindPlantThree(THREE);
  const cfg = layoutFor(id, stage, t);
  const mature = stage >= 4;
  const colorOpts = {
    hueShift: cfg.hueShift,
    satBoost: cfg.satBoost,
    lightMin: cfg.pale ? 0.48 : 0.4,
  };
  if (cfg.pale) {
    palette = {
      ...palette,
      main: 0xb8cf9a,
      alt: 0xdce8c8,
      rim: 0x8fa876,
    };
  }

  const innerMat = createMossFoliageMaterial(THREE, palette.main);
  const shellMat = createMossShellMaterial(THREE);
  const accentMat = createPlantAccentMaterial(THREE, 0x7d5e48, { roughness: 0.6 });

  const golden = Math.PI * (3 - Math.sqrt(5));
  const totalInner = cfg.shoots * cfg.leavesPerShoot;
  const shellMul = cfg.shells > 0 ? cfg.shells : 0;
  const totalOuter = Math.floor(totalInner * 0.85) * shellMul;
  const innerMesh = new THREE.InstancedMesh(
    getLeafGeometry(THREE, false),
    innerMat,
    totalInner
  );
  /** @type {import('three').InstancedMesh | null} */
  let shellMesh = null;
  if (totalOuter > 0) {
    shellMesh = new THREE.InstancedMesh(getLeafGeometry(THREE, true), shellMat, totalOuter);
  }

  let innerIdx = 0;
  let shellIdx = 0;

  for (let i = 0; i < cfg.shoots; i++) {
    const rNorm = Math.sqrt((i + 0.5) / cfg.shoots);
    const r = rNorm * cfg.radius;
    const ang = i * golden;
    const rx = Math.cos(ang) * r;
    const rz = Math.sin(ang) * r;
    const dist = r / Math.max(0.01, cfg.radius);
    let stemH = cfg.height * (0.65 + (1 - dist) * 0.55);
    if (id === 'polytrichum' && dist < 0.35) stemH *= 1.35;
    if (cfg.flatMat) stemH *= 0.55 + (1 - dist) * 0.35;

    for (let l = 0; l < cfg.leavesPerShoot; l++) {
      const along = l / Math.max(1, cfg.leavesPerShoot - 1);
      const ly = 0.022 + along * stemH;
      const spiral = ang + l * (id === 'polytrichum' ? 0.62 : 0.95);
      const spread =
        (cfg.flatMat ? 0.034 : 0.028) * (0.7 + along * 0.65) * (1 + dist * 0.25);
      const lx = rx + Math.cos(spiral) * spread;
      const lz = rz + Math.sin(spiral) * spread;
      const tilt = cfg.flatMat ? 0.65 + along * 0.25 : 0.45 + along * 0.4;
      const scale = (cfg.pale ? 1.05 : 1) * (0.9 + (i % 5) * 0.04);
      const hex = mossFoliageColor(along, dist * 0.4, palette, colorOpts);
      if (innerIdx < totalInner) {
        setLeafInstance(THREE, innerMesh, innerIdx++, lx, ly, lz, spiral, tilt, scale, hex);
      }
      if (shellMesh && l % 2 === 0 && shellIdx < totalOuter) {
        const hex2 = mossFoliageColor(Math.min(1, along + 0.15), dist * 0.3, palette, {
          ...colorOpts,
          lightMin: (colorOpts.lightMin ?? 0.4) + 0.08,
        });
        setLeafInstance(
          THREE,
          shellMesh,
          shellIdx++,
          lx,
          ly + 0.012,
          lz,
          spiral + 0.4,
          tilt * 0.92,
          scale * 1.22,
          hex2
        );
      }
    }

    if (cfg.flatMat && mature && i % 3 === 0) {
      for (let b = 0; b < 4 && innerIdx < totalInner; b++) {
        const bx = rx + Math.cos(ang + 1.1) * 0.02 * b;
        const bz = rz + Math.sin(ang + 1.1) * 0.02 * b;
        const hex = mossFoliageColor(0.5, 0.5, palette, colorOpts);
        setLeafInstance(THREE, innerMesh, innerIdx++, bx, 0.028, bz, ang + 1.2, 0.75, 0.85, hex);
      }
    }
  }

  innerMesh.count = innerIdx;
  innerMesh.instanceMatrix.needsUpdate = true;
  if (innerMesh.instanceColor) innerMesh.instanceColor.needsUpdate = true;
  root.add(innerMesh);

  if (shellMesh && shellIdx > 0) {
    shellMesh.count = shellIdx;
    shellMesh.instanceMatrix.needsUpdate = true;
    if (shellMesh.instanceColor) shellMesh.instanceColor.needsUpdate = true;
    root.add(shellMesh);
  }

  if (mature || (stage >= 3 && id === 'funaria')) {
    const sporCount = id === 'funaria' ? 3 : 2;
    for (let s = 0; s < sporCount; s++) {
      const ang = (s / sporCount) * Math.PI * 2 + 0.5;
      const sx = Math.cos(ang) * 0.08;
      const sz = Math.sin(ang) * 0.07;
      const setaH =
        (id === 'polytrichum' ? 0.22 : id === 'funaria' ? 0.16 : 0.18) *
        (0.85 + (s % 2) * 0.12);
      const seta = new THREE.Mesh(
        new THREE.CylinderGeometry(0.004, 0.005, setaH, 6),
        accentMat
      );
      seta.position.set(sx, setaH / 2 + 0.04, sz);
      if (id === 'funaria' && s === 0) seta.rotation.z = 0.28;
      root.add(seta);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), accentMat);
      if (id === 'funaria') cap.scale.set(0.9, 1.25, 0.9);
      else cap.scale.set(1, 1.2, 1);
      cap.position.set(
        sx + (id === 'funaria' && s === 0 ? 0.025 : 0),
        setaH + 0.038,
        sz + (id === 'funaria' && s === 0 ? 0.01 : 0)
      );
      root.add(cap);
    }
  }

  return tallyPlantMesh(root, THREE);
}

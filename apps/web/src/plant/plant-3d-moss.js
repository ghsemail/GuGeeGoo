/**
 * 藓类 — 密集垫状丛 + 多层叶卡/绒面壳
 */
import {
  bindPlantThree,
  createMossFoliageMaterial,
  createMossShellMaterial,
  createPlantAccentMaterial,
  ensureWhiteVertexColors,
  mossFoliageColor,
  tallyPlantMesh,
} from './plant-3d-materials.js';

/** @typedef {'happy'|'uneasy'|'stressed'|'withered'} PlantMood */

/** @type {import('three').BufferGeometry | null} */
let leafGeoInner = null;
/** @type {import('three').BufferGeometry | null} */
let leafGeoOuter = null;
/** @type {import('three').BufferGeometry | null} */
let leafGeoStar = null;

/**
 * @param {typeof import('three')} THREE
 * @param {'inner'|'outer'|'star'} kind
 */
function getLeafGeometry(THREE, kind) {
  if (kind === 'inner' && leafGeoInner) return leafGeoInner;
  if (kind === 'outer' && leafGeoOuter) return leafGeoOuter;
  if (kind === 'star' && leafGeoStar) return leafGeoStar;
  const w = kind === 'outer' ? 0.016 : kind === 'star' ? 0.012 : 0.013;
  const h = kind === 'outer' ? 0.024 : kind === 'star' ? 0.018 : 0.02;
  const geo = new THREE.PlaneGeometry(w, h, 1, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = y / h + 0.5;
    pos.setZ(i, Math.sin(t * Math.PI) * (kind === 'outer' ? 0.004 : 0.003));
  }
  pos.needsUpdate = true;
  ensureWhiteVertexColors(geo, THREE);
  geo.computeVertexNormals();
  if (kind === 'outer') leafGeoOuter = geo;
  else if (kind === 'star') leafGeoStar = geo;
  else leafGeoInner = geo;
  return geo;
}

/**
 * @param {PlantMood} mood
 */
function moodDroop(mood) {
  if (mood === 'withered') return 0.42;
  if (mood === 'stressed') return 0.22;
  if (mood === 'uneasy') return 0.1;
  return 0;
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
  mesh.setColorAt(idx, new THREE.Color(hex));
}

/** @typedef {{ shoots: number, radius: number, height: number, leavesPerShoot: number, shells: number, satBoost: number, hueShift: number, flatMat?: boolean, upright?: boolean, pale?: boolean, startBoost?: number }} MossSpeciesLayout */

/** @param {string} id @param {number} stage @param {number} t */
function layoutFor(id, stage, t) {
  const mature = stage >= 4;
  const mid = stage >= 2;
  const start = stage === 0;
  /** @type {MossSpeciesLayout} */
  const base = {
    shoots: start ? 6 : stage === 1 ? 14 : mid ? 56 : 88,
    radius: start ? 0.11 : stage === 1 ? 0.17 : 0.28 + t * 0.05,
    height: start ? 0.07 : 0.09,
    leavesPerShoot: start ? 5 : stage === 1 ? 9 : 14,
    shells: mature ? 2 : start ? 0 : 1,
    satBoost: 0.14,
    hueShift: 0,
    startBoost: start ? 1.55 : stage === 1 ? 1.15 : 1,
  };

  if (id === 'leucobryum') {
    return {
      ...base,
      shoots: mature ? 120 : base.shoots,
      height: mature ? 0.1 : start ? 0.08 : 0.07,
      radius: mature ? 0.3 : base.radius,
      leavesPerShoot: mature ? 12 : base.leavesPerShoot,
      pale: true,
      hueShift: -0.03,
      satBoost: 0.1,
    };
  }
  if (id === 'hypnum') {
    return {
      ...base,
      shoots: mature ? 150 : base.shoots,
      height: mature ? 0.065 : 0.05,
      flatMat: true,
      leavesPerShoot: mature ? 16 : base.leavesPerShoot,
      satBoost: 0.16,
      hueShift: 0.02,
    };
  }
  if (id === 'polytrichum') {
    return {
      ...base,
      shoots: mature ? 105 : base.shoots,
      height: mature ? 0.24 : start ? 0.12 : 0.14,
      radius: mature ? 0.26 : base.radius,
      leavesPerShoot: mature ? 11 : base.leavesPerShoot,
      upright: true,
      satBoost: 0.12,
      hueShift: -0.01,
    };
  }
  if (id === 'funaria') {
    return {
      ...base,
      shoots: mature ? 110 : base.shoots,
      height: mature ? 0.12 : 0.07,
      radius: mature ? 0.26 : base.radius,
      leavesPerShoot: mature ? 12 : base.leavesPerShoot,
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
 * @param {PlantMood} [mood]
 */
export function buildMossCushion(THREE, root, id, stage, t, palette, mood = 'happy') {
  bindPlantThree(THREE);
  const cfg = layoutFor(id, stage, t);
  const mature = stage >= 4;
  const droop = moodDroop(mood);
  const colorOpts = {
    hueShift: cfg.hueShift,
    satBoost: cfg.satBoost,
    lightMin: cfg.pale ? 0.48 : 0.42,
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
  const starGeo = cfg.upright && mature ? getLeafGeometry(THREE, 'star') : null;
  const starMat = starGeo ? createMossFoliageMaterial(THREE, palette.alt) : null;

  const golden = Math.PI * (3 - Math.sqrt(5));
  const starTips = cfg.upright && mature ? cfg.shoots * 5 : 0;
  const totalInner = cfg.shoots * cfg.leavesPerShoot;
  const shellMul = cfg.shells > 0 ? cfg.shells : 0;
  const totalOuter = Math.floor(cfg.shoots * cfg.leavesPerShoot * 0.9) * shellMul;
  const innerMesh = new THREE.InstancedMesh(
    getLeafGeometry(THREE, 'inner'),
    innerMat,
    totalInner
  );
  /** @type {import('three').InstancedMesh | null} */
  let shellMesh = null;
  if (totalOuter > 0) {
    shellMesh = new THREE.InstancedMesh(getLeafGeometry(THREE, 'outer'), shellMat, totalOuter);
  }
  /** @type {import('three').InstancedMesh | null} */
  let starMesh = null;
  if (starGeo && starMat && starTips > 0) {
    starMesh = new THREE.InstancedMesh(starGeo, starMat, starTips);
  }

  let innerIdx = 0;
  let shellIdx = 0;
  let starIdx = 0;
  const scaleMul = cfg.startBoost ?? 1;

  for (let i = 0; i < cfg.shoots; i++) {
    const rNorm = Math.sqrt((i + 0.5) / cfg.shoots);
    const r = rNorm * cfg.radius;
    const ang = i * golden;
    const rx = Math.cos(ang) * r;
    const rz = Math.sin(ang) * r;
    const dist = r / Math.max(0.01, cfg.radius);
    let stemH = cfg.height * (0.7 + (1 - dist) * 0.5);
    if (id === 'polytrichum' && dist < 0.4) stemH *= 1.25;
    if (cfg.flatMat) stemH *= 0.5 + (1 - dist) * 0.4;

    for (let l = 0; l < cfg.leavesPerShoot; l++) {
      const along = l / Math.max(1, cfg.leavesPerShoot - 1);
      const ly = 0.018 + along * stemH;
      const spiral = ang + l * (cfg.upright ? 0.48 : cfg.flatMat ? 0.55 : 0.82);
      const spreadBase = cfg.flatMat ? 0.022 : cfg.upright ? 0.014 : 0.018;
      const spread = spreadBase * (0.65 + along * 0.55) * (1 + dist * 0.2);
      const lx = rx + Math.cos(spiral) * spread;
      const lz = rz + Math.sin(spiral) * spread;
      let tilt = cfg.flatMat ? 0.78 + along * 0.12 : cfg.upright ? 0.28 + along * 0.55 : 0.42 + along * 0.38;
      tilt += droop * along * (0.45 + dist * 0.55);
      const scale =
        scaleMul * (cfg.pale ? 1.05 : 1) * (0.82 + (i % 7) * 0.03) * (0.92 + along * 0.12);
      const hex = mossFoliageColor(along, dist * 0.35, palette, colorOpts);
      if (innerIdx < totalInner) {
        setLeafInstance(THREE, innerMesh, innerIdx++, lx, ly, lz, spiral, tilt, scale, hex);
      }
      if (shellMesh && (l % 2 === 0 || cfg.flatMat) && shellIdx < totalOuter) {
        const hex2 = mossFoliageColor(Math.min(1, along + 0.18), dist * 0.28, palette, {
          ...colorOpts,
          lightMin: (colorOpts.lightMin ?? 0.42) + 0.1,
        });
        setLeafInstance(
          THREE,
          shellMesh,
          shellIdx++,
          lx,
          ly + 0.008,
          lz,
          spiral + 0.35,
          tilt * 0.95 + droop * 0.05,
          scale * 1.15,
          hex2
        );
      }
    }

    if (starMesh && mature && id === 'polytrichum') {
      const tipY = 0.018 + stemH + 0.012;
      for (let s = 0; s < 5; s++) {
        const sa = ang + (s / 5) * Math.PI * 2;
        const tipSpread = 0.028;
        const tx = rx + Math.cos(sa) * tipSpread;
        const tz = rz + Math.sin(sa) * tipSpread;
        const hex = mossFoliageColor(0.92, dist * 0.2, palette, {
          ...colorOpts,
          lightMin: (colorOpts.lightMin ?? 0.42) + 0.14,
        });
        setLeafInstance(
          THREE,
          starMesh,
          starIdx++,
          tx,
          tipY,
          tz,
          sa,
          0.18 + droop * 0.35,
          scaleMul * 1.05,
          hex
        );
      }
    }

    if (cfg.flatMat && mature && i % 2 === 0) {
      for (let b = 0; b < 3 && innerIdx < totalInner; b++) {
        const bx = rx + Math.cos(ang + 0.9) * 0.015 * b;
        const bz = rz + Math.sin(ang + 0.9) * 0.015 * b;
        const hex = mossFoliageColor(0.45, 0.45, palette, colorOpts);
        setLeafInstance(
          THREE,
          innerMesh,
          innerIdx++,
          bx,
          0.024,
          bz,
          ang + 1.1,
          0.82 + droop * 0.08,
          0.75 * scaleMul,
          hex
        );
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

  if (starMesh && starIdx > 0) {
    starMesh.count = starIdx;
    starMesh.instanceMatrix.needsUpdate = true;
    if (starMesh.instanceColor) starMesh.instanceColor.needsUpdate = true;
    root.add(starMesh);
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

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
let leafGeoSpike = null;

/**
 * @param {typeof import('three')} THREE
 * @param {'inner'|'outer'|'spike'} kind
 */
function getLeafGeometry(THREE, kind) {
  if (kind === 'inner' && leafGeoInner) return leafGeoInner;
  if (kind === 'outer' && leafGeoOuter) return leafGeoOuter;
  if (kind === 'spike' && leafGeoSpike) return leafGeoSpike;
  const w = kind === 'outer' ? 0.016 : kind === 'spike' ? 0.007 : 0.013;
  const h = kind === 'outer' ? 0.024 : kind === 'spike' ? 0.019 : 0.02;
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
  else if (kind === 'spike') leafGeoSpike = geo;
  else leafGeoInner = geo;
  return geo;
}

/** @param {number} i */
function hashJitter(i) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * @param {typeof import('three')} THREE
 * @param {import('three').Group} root
 * @param {number} stage
 * @param {number} t
 * @param {ReturnType<import('./visual-style.js').palette3d>} palette
 * @param {PlantMood} mood
 */
function buildPolytrichumCushion(THREE, root, stage, t, palette, mood) {
  const mature = stage >= 4;
  const droop = moodDroop(mood);
  const start = stage === 0;
  const shoots = start ? 6 : stage === 1 ? 12 : mature ? 80 : 40;
  const radius = start ? 0.1 : mature ? 0.22 : 0.18;
  const stemH = start ? 0.09 : mature ? 0.2 : 0.12;
  const whorls = start ? 4 : mature ? 7 : 5;
  const leavesPerWhorl = 5;
  const totalLeaves = shoots * whorls * leavesPerWhorl;
  const scaleMul = start ? 1.5 : stage === 1 ? 1.2 : 1;

  const leafMat = createMossFoliageMaterial(THREE, palette.main);
  const stemMat = createPlantAccentMaterial(THREE, palette.main, { roughness: 0.72 });
  const setaMat = createPlantAccentMaterial(THREE, 0x8b4a3a, { roughness: 0.58 });
  const leafMesh = new THREE.InstancedMesh(getLeafGeometry(THREE, 'spike'), leafMat, totalLeaves);
  const stemGeo = new THREE.CylinderGeometry(0.0055, 0.007, 1, 7);
  const stemMesh = new THREE.InstancedMesh(stemGeo, stemMat, shoots);
  let leafIdx = 0;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const dummy = new THREE.Object3D();

  for (let i = 0; i < shoots; i++) {
    const rNorm = i < 10 && mature ? 0.08 + (i / 10) * 0.12 : Math.pow((i + 0.5) / shoots, 0.72);
    const r = rNorm * radius;
    const ang = i * golden;
    const rx = Math.cos(ang) * r;
    const rz = Math.sin(ang) * r;
    const h = stemH * (0.75 + (1 - rNorm) * 0.35);

    dummy.position.set(rx, h / 2 + 0.016, rz);
    dummy.scale.set(1, h, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    stemMesh.setMatrixAt(i, dummy.matrix);

    for (let w = 0; w < whorls; w++) {
      const along = w / Math.max(1, whorls - 1);
      const ly = 0.022 + along * h;
      for (let k = 0; k < leavesPerWhorl; k++) {
        const leafAng = ang + (k / leavesPerWhorl) * Math.PI * 2 + w * 0.38;
        const tilt = 0.52 + droop * along * 0.35;
        const hex = mossFoliageColor(along, rNorm * 0.3, palette, {
          satBoost: 0.16,
          lightMin: 0.46,
        });
        if (leafIdx < totalLeaves) {
          setLeafInstance(
            THREE,
            leafMesh,
            leafIdx++,
            rx,
            ly,
            rz,
            leafAng,
            tilt,
            scaleMul * (0.88 + (k % 2) * 0.06),
            hex
          );
        }
      }
    }
  }

  leafMesh.count = leafIdx;
  leafMesh.instanceMatrix.needsUpdate = true;
  if (leafMesh.instanceColor) leafMesh.instanceColor.needsUpdate = true;
  root.add(leafMesh);
  stemMesh.instanceMatrix.needsUpdate = true;
  root.add(stemMesh);

  if (mature) {
    for (let s = 0; s < 2; s++) {
      const a = s * 1.4 + 0.3;
      const sx = Math.cos(a) * 0.06;
      const sz = Math.sin(a) * 0.05;
      const setaH = 0.24;
      const seta = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, setaH, 6), setaMat);
      seta.position.set(sx, setaH / 2 + 0.04, sz);
      root.add(seta);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), setaMat);
      cap.position.set(sx, setaH + 0.042, sz);
      root.add(cap);
    }
  }

  return tallyPlantMesh(root, THREE);
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
  if (id === 'polytrichum') {
    return buildPolytrichumCushion(THREE, root, stage, t, palette, mood);
  }
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
  const golden = Math.PI * (3 - Math.sqrt(5));
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
  let innerIdx = 0;
  let shellIdx = 0;
  const scaleMul = cfg.startBoost ?? 1;

  for (let i = 0; i < cfg.shoots; i++) {
    const rNorm = Math.sqrt((i + 0.5) / cfg.shoots);
    const r = rNorm * cfg.radius;
    const ang = i * golden;
    const jx = cfg.flatMat ? (hashJitter(i + 17) - 0.5) * 0.028 : 0;
    const jz = cfg.flatMat ? (hashJitter(i) - 0.5) * 0.032 : 0;
    const rx = Math.cos(ang) * r + jx;
    const rz = Math.sin(ang) * r + jz;
    const dist = r / Math.max(0.01, cfg.radius);
    let stemH = cfg.height * (0.7 + (1 - dist) * 0.5);
    if (cfg.flatMat) stemH *= 0.5 + (1 - dist) * 0.4;

    for (let l = 0; l < cfg.leavesPerShoot; l++) {
      const along = l / Math.max(1, cfg.leavesPerShoot - 1);
      const ly = 0.018 + along * stemH;
      const spiral = ang + l * (cfg.flatMat ? 0.55 : 0.82);
      const spreadBase = cfg.flatMat ? 0.022 : 0.018;
      const spread = spreadBase * (0.65 + along * 0.55) * (1 + dist * 0.2);
      const lx = rx + Math.cos(spiral) * spread;
      const lz = rz + Math.sin(spiral) * spread;
      let tilt = cfg.flatMat ? 0.78 + along * 0.12 : 0.42 + along * 0.38;
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

  if (mature || (stage >= 3 && id === 'funaria')) {
    const sporCount = id === 'funaria' ? 3 : 2;
    for (let s = 0; s < sporCount; s++) {
      const ang = (s / sporCount) * Math.PI * 2 + 0.5;
      const sx = Math.cos(ang) * 0.08;
      const sz = Math.sin(ang) * 0.07;
      const setaH = (id === 'funaria' ? 0.16 : 0.18) * (0.85 + (s % 2) * 0.12);
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

/**
 * 藓类 3D — 茎 + InstancedMesh 小叶，按种类区分形态
 */
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  bindPlantThree,
  createMossFoliageMaterial,
  createMossStemMaterial,
  createPlantAccentMaterial,
  mossFoliageColor,
} from './plant-3d-materials.js';

/** @type {import('three').BufferGeometry | null} */
let sharedLeafletGeo = null;

/**
 * @param {typeof import('three')} THREE
 */
function getLeafletGeometry(THREE) {
  if (sharedLeafletGeo) return sharedLeafletGeo;
  const w = 0.014;
  const h = 0.026;
  const geo = new THREE.PlaneGeometry(w, h, 2, 4);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = y / h + 0.5;
    const curl = Math.sin(t * Math.PI) * 0.005;
    const twist = Math.sin(t * 6.28) * 0.002;
    pos.setZ(i, curl);
    pos.setX(i, pos.getX(i) + twist);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  sharedLeafletGeo = geo;
  return geo;
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
export function buildMossCushion(THREE, root, id, stage, t, palette) {
  bindPlantThree(THREE);

  const shootCount =
    stage === 0 ? 6 : stage === 1 ? 6 : stage === 2 ? 6 : stage === 3 ? 9 : 12;
  const heightBase =
    id === 'polytrichum' ? 0.24 : id === 'funaria' ? 0.13 : id === 'hypnum' ? 0.11 : 0.15;
  const stageScale = stage === 0 ? 0.42 : stage === 1 ? 0.55 : 0.48 + t * 0.95;
  const h = heightBase * stageScale * 1.05;
  const spread = stage === 0 ? 0.11 : 0.13 + t * 0.24;

  const speciesOpts = { species: id, hueShift: id === 'leucobryum' ? -0.04 : 0, sat: 0.48 };
  const stemBaseColor = id === 'leucobryum' ? 0xc5d4b0 : palette.rim;
  const leafMat = createMossFoliageMaterial(THREE, palette.main);
  const stemMat = createMossStemMaterial(THREE, stemBaseColor);
  const matRim = createPlantAccentMaterial(THREE, palette.rim, { roughness: 0.72 });

  const leafGeo = getLeafletGeometry(THREE);
  const leavesPerShoot =
    stage === 0
      ? 7
      : stage === 1
        ? 10
        : stage >= 3
          ? id === 'polytrichum'
            ? 22
            : id === 'hypnum'
              ? 16
              : 14
          : 12;
  const branchFactor = id === 'hypnum' && stage >= 2 ? 1.45 : 1;
  const totalLeaves = Math.ceil(shootCount * leavesPerShoot * branchFactor);

  const leafInst = new THREE.InstancedMesh(leafGeo, leafMat, totalLeaves);
  leafInst.castShadow = false;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let leafIdx = 0;

  const stemGeos = [];

  for (let i = 0; i < shootCount; i++) {
    const ang = (i / shootCount) * Math.PI * 2 + (id === 'hypnum' ? i * 0.4 : 0);
    const rx = Math.cos(ang) * spread * (0.4 + (i % 3) * 0.15);
    const rz = Math.sin(ang) * spread * (0.4 + (i % 2) * 0.2);
    const stemH = h * (0.78 + (i % 4) * 0.08);
    const stemRad = id === 'polytrichum' ? 0.011 : 0.009;
    const stemGeo = new THREE.CylinderGeometry(stemRad * 0.85, stemRad, stemH, 6, 1);
    stemGeo.translate(rx, stemH / 2 + 0.02, rz);
    if (id === 'hypnum') {
      stemGeo.rotateZ(0.25 * Math.sin(ang));
    }
    stemGeos.push(stemGeo);

    const placeLeaf = (lx, ly, lz, rotY, rotX, scaleMul, alongT) => {
      if (leafIdx >= totalLeaves) return;
      dummy.position.set(lx, ly, lz);
      dummy.rotation.set(rotX, rotY, id === 'hypnum' ? 0.12 : 0);
      const s = scaleMul * (0.85 + (i % 3) * 0.06);
      dummy.scale.set(s, s * (1.05 + alongT * 0.15), s * 0.75);
      dummy.updateMatrix();
      leafInst.setMatrixAt(leafIdx, dummy.matrix);
      color.setHex(mossFoliageColor(alongT, (rotY % 1) * 0.3, palette, speciesOpts));
      leafInst.setColorAt(leafIdx, color);
      leafIdx += 1;
    };

    const leafCount = Math.floor(leavesPerShoot * (stage === 0 ? 0.6 : 1));
    for (let l = 0; l < leafCount; l++) {
      const alongT = l / Math.max(1, leafCount - 1);
      const ly = 0.03 + alongT * stemH * 0.92;
      const spiral = l * (id === 'polytrichum' ? 0.55 : 0.72) + ang;
      const radial =
        id === 'polytrichum' && alongT > 0.65
          ? 0.042
          : id === 'polytrichum'
            ? 0.028
            : 0.024;
      const lx = rx + Math.cos(spiral) * radial;
      const lz = rz + Math.sin(spiral) * radial;
      const tilt = 0.35 + alongT * (id === 'polytrichum' ? 0.55 : 0.35);
      placeLeaf(lx, ly, lz, spiral, tilt, 1, alongT);
    }

    if (id === 'hypnum' && stage >= 2 && leafIdx < totalLeaves - 4) {
      const sideLen = stemH * 0.45;
      const bx = rx + Math.cos(ang + 0.9) * 0.04;
      const bz = rz + Math.sin(ang + 0.9) * 0.04;
      for (let b = 0; b < 6; b++) {
        const bt = b / 5;
        const ly = 0.04 + bt * sideLen;
        placeLeaf(
          bx + Math.cos(ang + 1.2) * 0.018 * bt,
          ly,
          bz + Math.sin(ang + 1.2) * 0.018 * bt,
          ang + 1.4,
          0.5,
          0.75,
          bt
        );
      }
    }
  }

  leafInst.count = leafIdx;
  leafInst.instanceMatrix.needsUpdate = true;
  if (leafInst.instanceColor) leafInst.instanceColor.needsUpdate = true;
  root.add(leafInst);

  let stemTris = 0;
  if (stemGeos.length) {
    const merged = mergeGeometries(stemGeos, false);
    stemGeos.forEach((g) => g.dispose());
    if (merged) {
      const pos = merged.attributes.position;
      const colArr = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const along = Math.min(1, y / (h + 0.08));
        const hex = mossFoliageColor(along * 0.4, 0.1, palette, { ...speciesOpts, sat: 0.38 });
        colArr[i * 3] = ((hex >> 16) & 255) / 255;
        colArr[i * 3 + 1] = ((hex >> 8) & 255) / 255;
        colArr[i * 3 + 2] = (hex & 255) / 255;
      }
      merged.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
      stemTris = merged.index ? merged.index.count / 3 : pos.count / 3;
      root.add(new THREE.Mesh(merged, stemMat));
    }
  }

  let extraTris = 0;
  let extraDraw = 2;

  if (stage >= 4 || (stage >= 3 && id === 'funaria')) {
    const setaH = id === 'polytrichum' ? 0.38 : id === 'funaria' ? 0.24 : 0.3;
    const seta = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.009, setaH, 8),
      matRim
    );
    seta.position.set(0, setaH / 2 + 0.05, 0);
    if (id === 'funaria') seta.rotation.z = 0.35;
    root.add(seta);
    extraTris += 8 * 2;
    extraDraw += 1;

    const capMat = createPlantAccentMaterial(THREE, 0x6d4c41, { roughness: 0.62 });
    let cap;
    if (id === 'funaria') {
      cap = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 12), capMat);
      cap.scale.set(0.88, 1.28, 0.88);
    } else {
      cap = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), capMat);
      cap.scale.set(1, 1.35, 1);
    }
    cap.position.set(id === 'funaria' ? 0.06 : 0, setaH + 0.062, id === 'funaria' ? 0.02 : 0);
    root.add(cap);
    extraTris += 120;
    extraDraw += 1;
  }

  const leafTris = leafIdx * 16;
  const drawCalls = extraDraw + (stemTris > 0 ? 1 : 0) + (leafIdx > 0 ? 1 : 0);
  return {
    triangles: Math.round(leafTris + stemTris + extraTris),
    drawCalls,
  };
}

/**
 * 花盆 3D 视图 — Three.js（只在养植物页 lazy-load）
 * 风格见 visual-style.js（柔和半写实）
 */
import { stageIndexFromGrowth } from './growth.js';
import {
  applyStylizedLighting,
  createStylizedMaterial,
  palette3d,
} from './visual-style.js';

/** @typedef {'happy'|'uneasy'|'stressed'|'withered'} PlantMood */

/** 垂直视角：约 5°（俯视）～ 175°（贴地侧视）；水平不限 */
export const PLANT3D_POLAR_MIN_DEG = 5;
export const PLANT3D_POLAR_MAX_DEG = 175;

const DEG2RAD = Math.PI / 180;

/**
 * @param {HTMLElement} mount
 */
export async function createPlant3dView(mount) {
  if (!mount) return { ok: false };
  try {
    const THREE = await import('three');
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
    const view = new Plant3dView(THREE, OrbitControls, mount);
    const ok = await view.init();
    return ok ? { ok: true, view } : { ok: false };
  } catch {
    return { ok: false };
  }
}

class Plant3dView {
  /**
   * @param {typeof import('three')} THREE
   * @param {typeof import('three/addons/controls/OrbitControls.js').OrbitControls} OrbitControls
   * @param {HTMLElement} mount
   */
  constructor(THREE, OrbitControls, mount) {
    this.THREE = THREE;
    this.OrbitControls = OrbitControls;
    this.mount = mount;
    /** @type {HTMLCanvasElement | null} */
    this.canvas = null;
    /** @type {import('three').WebGLRenderer | null} */
    this.renderer = null;
    /** @type {import('three').Scene | null} */
    this.scene = null;
    /** @type {import('three').PerspectiveCamera | null} */
    this.camera = null;
    /** @type {import('three').Group | null} */
    this.potGroup = null;
    /** @type {import('three').Group | null} */
    this.plantGroup = null;
    /** @type {InstanceType<typeof OrbitControls> | null} */
    this.controls = null;
    this.raf = 0;
    this.running = false;
    this.idleSpin = 0;
    /** @type {string} */
    this._sig = '';
    /** @type {ReturnType<palette3d> | null} */
    this._potPalette = null;
    /** @type {import('three').Vector3 | null} */
    this._defaultCameraPos = null;
    /** @type {import('three').Vector3 | null} */
    this._defaultTarget = null;
    this._lastTapMs = 0;
    /** @type {{ x: number, y: number } | null} */
    this._tapStart = null;
  }

  async init() {
    const { THREE } = this;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'plant-3d-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.style.touchAction = 'none';
    this.mount.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.renderer.setPixelRatio(dpr);
    this.resize();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40);
    this.camera.position.set(0.9, 0.75, 1.15);

    applyStylizedLighting(THREE, this.scene, this.renderer);

    this._potPalette = palette3d('happy', false);
    this.potGroup = this.buildPot(this._potPalette);
    this.scene.add(this.potGroup);
    this.plantGroup = new THREE.Group();
    this.plantGroup.position.y = 0.062;
    this.scene.add(this.plantGroup);

    this.controls = new this.OrbitControls(this.camera, this.canvas);
    this.controls.enablePan = false;
    this.controls.enableRotate = true;
    this.controls.enableZoom = true;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.rotateSpeed = 0.85;
    this.controls.zoomSpeed = 0.9;
    this.controls.minDistance = 0.75;
    this.controls.maxDistance = 2.35;
    this.controls.minPolarAngle = PLANT3D_POLAR_MIN_DEG * DEG2RAD;
    this.controls.maxPolarAngle = PLANT3D_POLAR_MAX_DEG * DEG2RAD;
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;
    this.controls.target.set(0, 0.15, 0);
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.35;

    this._defaultCameraPos = this.camera.position.clone();
    this._defaultTarget = this.controls.target.clone();

    this.canvas.addEventListener('pointerdown', (e) => {
      this.controls.autoRotate = false;
      this.idleSpin = 0;
      this._tapStart = { x: e.clientX, y: e.clientY };
    });

    this.canvas.addEventListener('pointerup', (e) => {
      const start = this._tapStart;
      this._tapStart = null;
      if (!start) return;
      const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (dist > 14) return;
      const now = Date.now();
      if (now - this._lastTapMs < 340) {
        this.resetView();
        this._lastTapMs = 0;
      } else {
        this._lastTapMs = now;
      }
    });

    installPlant3dTestHook(this);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
      else this.resume();
    });
    window.addEventListener('resize', () => this.resize());
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => this.resize());
      ro.observe(this.mount);
    }

    this.running = true;
    this.loop();
    return true;
  }

  resize() {
    if (!this.renderer || !this.camera || !this.mount) return;
    const w = Math.max(1, this.mount.clientWidth);
    const h = Math.max(1, this.mount.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  pause() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  resume() {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  loop() {
    if (!this.running || !this.renderer || !this.scene || !this.camera) return;
    this.raf = requestAnimationFrame(() => this.loop());
    if (document.hidden) return;
    this.idleSpin += 0.016;
    if (this.idleSpin > 4 && this.controls) {
      this.controls.autoRotate = true;
    }
    this.controls?.update();
    this.renderer.render(this.scene, this.camera);
  }

  /** @param {import('./species.js').BryophyteSpecies | null} sp @param {number} growth @param {PlantMood} mood */
  update(sp, growth, mood) {
    if (!this.plantGroup || !this.THREE) return;
    const mature = growth >= 100;
    const sig = `${sp?.id ?? ''}|${Math.floor(growth)}|${mood}`;
    if (sig === this._sig) {
      this.applyMoodTransform(mood);
      return;
    }
    this._sig = sig;
    this.clearGroup(this.plantGroup);
    if (!sp) return;
    const palette = palette3d(mood, mature);
    const stage = stageIndexFromGrowth(growth);
    const t = growth / 100;
    if (sp.group === 'liverwort') {
      buildLiverwort(this.THREE, this.plantGroup, sp.id, stage, t, palette);
    } else {
      buildMossCushion(this.THREE, this.plantGroup, sp.id, stage, t, palette);
    }
    this.applyMoodTransform(mood);
  }

  resetView() {
    if (!this.camera || !this.controls || !this._defaultCameraPos || !this._defaultTarget) return;
    this.controls.autoRotate = false;
    this.idleSpin = 0;
    this.camera.position.copy(this._defaultCameraPos);
    this.controls.target.copy(this._defaultTarget);
    this.controls.update();
  }

  /** @param {PlantMood} mood */
  applyMoodTransform(mood) {
    if (!this.plantGroup) return;
    const droop =
      mood === 'withered' ? 0.55 : mood === 'stressed' ? 0.25 : mood === 'uneasy' ? 0.12 : 0;
    this.plantGroup.rotation.x = -droop;
    this.plantGroup.scale.setScalar(mood === 'withered' ? 0.85 : 1);
  }

  /** @param {ReturnType<palette3d>} pal */
  buildPot(pal) {
    const { THREE } = this;
    const g = new THREE.Group();
    const soilMat = createStylizedMaterial(THREE, pal.soil, { roughness: 0.78, emissiveScale: 0.06 });
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.06, 28), soilMat);
    soil.position.y = 0.03;
    g.add(soil);

    const clayMat = createStylizedMaterial(THREE, pal.pot, { roughness: 0.68, emissiveScale: 0.05 });
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.38, 0.32, 28, 1, true),
      clayMat
    );
    wall.position.y = -0.1;
    g.add(wall);

    const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.375, 28), clayMat);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = -0.26;
    g.add(bottom);

    const innerFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.375, 0.375, 0.012, 28),
      soilMat
    );
    innerFloor.position.y = -0.248;
    g.add(innerFloor);

    const rimMat = createStylizedMaterial(THREE, pal.potRim, { roughness: 0.62, emissiveScale: 0.06 });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.038, 12, 32), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.06;
    g.add(rim);

    return g;
  }

  /** @param {import('three').Group} group */
  clearGroup(group) {
    while (group.children.length) {
      const ch = group.children[0];
      group.remove(ch);
      if ('geometry' in ch && ch.geometry) ch.geometry.dispose();
      if ('material' in ch) {
        const m = ch.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else if (m) m.dispose();
      }
    }
  }
}

/**
 * @param {typeof import('three')} THREE
 * @param {import('three').Group} root
 */
function buildLiverwort(THREE, root, id, stage, t, palette) {
  const mat = createStylizedMaterial(THREE, palette.main);
  const matAlt = createStylizedMaterial(THREE, palette.alt, { roughness: 0.62 });
  const matRim = createStylizedMaterial(THREE, palette.rim, { roughness: 0.65 });

  const scale = (0.38 + t * 0.48) * 1.06;

  if (stage === 0) {
    const s0 = Math.max(0.92, scale);
    addLobe(THREE, root, mat, 0, 0, 0.11 * s0, 0.058 * s0);
    addLobe(THREE, root, matAlt, 0.055, 0.012, 0.082 * s0, 0.048 * s0);
    addLobe(THREE, root, matAlt, -0.048, -0.015, 0.072 * s0, 0.042 * s0);
    return;
  }

  if (stage === 1) {
    addRibbon(THREE, root, mat, 0, 0, 0.26 * scale, 0.085, 0);
    addRibbon(THREE, root, matAlt, 0.02, 0.01, 0.17 * scale, 0.072, 0.4);
    return;
  }

  const branches = id === 'riccia' ? 4 : id === 'conocephalum' ? 3 : 2;
  const potRadius = 0.36;
  for (let i = 0; i < branches; i++) {
    const ang = (i / branches) * Math.PI * 2 + 0.3;
    const len = Math.min((0.28 + stage * 0.06) * scale, potRadius * 1.05);
    const w = id === 'riccia' ? 0.048 : id === 'conocephalum' ? 0.11 : 0.082;
    const ox = Math.cos(ang) * 0.04;
    const oz = Math.sin(ang) * 0.032;
    addRibbon(THREE, root, i % 2 ? mat : matAlt, ox, oz, len, w, ang);
    if (id === 'riccia' && stage >= 2) {
      addRibbon(
        THREE,
        root,
        matAlt,
        Math.cos(ang) * 0.12,
        Math.sin(ang) * 0.1,
        len * 0.68,
        w * 0.88,
        ang + 0.7
      );
    }
  }

  if (id === 'conocephalum' && stage >= 2) {
    const bump = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.07 * scale, 0.12 * scale, 6, 12),
      matAlt
    );
    bump.rotation.x = Math.PI / 2;
    bump.position.set(0, 0.028, 0);
    root.add(bump);
  }

  if (stage >= 3 && (id === 'marchantia' || id === 'conocephalum')) {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055 * scale, 0.078 * scale, 0.034, 14),
      matAlt
    );
    cup.position.set(0.09 * scale, 0.042, 0.055 * scale);
    root.add(cup);
    const cupInner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038 * scale, 0.048 * scale, 0.02, 12),
      matRim
    );
    cupInner.position.set(0.09 * scale, 0.048, 0.055 * scale);
    root.add(cupInner);
  }

  if (stage >= 4) {
    const stalk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.022, 0.2 * scale, 12),
      matRim
    );
    stalk.position.set(0, 0.1 * scale, 0);
    root.add(stalk);
    if (id === 'marchantia') {
      const palm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12 * scale, 0.1 * scale, 0.028, 14),
        mat
      );
      palm.position.set(0, 0.21 * scale, 0);
      root.add(palm);
      for (let f = 0; f < 7; f++) {
        const finger = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.022, 0.055 * scale, 4, 10),
          matAlt
        );
        const a = (f / 7) * Math.PI * 2;
        finger.position.set(Math.cos(a) * 0.095 * scale, 0.225 * scale, Math.sin(a) * 0.075 * scale);
        finger.rotation.set(0.35, a, 0.15);
        root.add(finger);
      }
    } else if (id === 'conocephalum') {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.078 * scale, 0.13 * scale, 14),
        mat
      );
      cone.position.set(0, 0.27 * scale, 0);
      root.add(cone);
    }
  }
}

/**
 * @param {typeof import('three')} THREE
 * @param {import('three').Group} root
 */
function buildMossCushion(THREE, root, id, stage, t, palette) {
  const shootCount =
    stage === 0 ? 6 : stage === 1 ? 6 : stage === 2 ? 6 : stage === 3 ? 9 : 12;
  const heightBase =
    id === 'polytrichum' ? 0.24 : id === 'funaria' ? 0.13 : id === 'hypnum' ? 0.11 : 0.15;
  const stageScale = stage === 0 ? 0.42 : stage === 1 ? 0.55 : 0.48 + t * 0.95;
  const h = heightBase * stageScale * 1.05;
  const spread = stage === 0 ? 0.11 : 0.13 + t * 0.24;

  const mainColor = id === 'leucobryum' ? 0xdce8c8 : palette.main;
  const mat = createStylizedMaterial(THREE, mainColor, { roughness: 0.6 });
  const leafMat = createStylizedMaterial(THREE, palette.alt, { roughness: 0.55 });
  const matRim = createStylizedMaterial(THREE, palette.rim, { roughness: 0.65 });

  for (let i = 0; i < shootCount; i++) {
    const ang = (i / shootCount) * Math.PI * 2 + (id === 'hypnum' ? i * 0.4 : 0);
    const rx = Math.cos(ang) * spread * (0.4 + (i % 3) * 0.15);
    const rz = Math.sin(ang) * spread * (0.4 + (i % 2) * 0.2);
    const stemH = h * (0.78 + (i % 4) * 0.08);
    const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, stemH, 5, 12), mat);
    stem.position.set(rx, stemH / 2 + 0.02, rz);
    if (id === 'hypnum') stem.rotation.z = 0.25 * Math.sin(ang);
    root.add(stem);

    const leaves = stage >= 1 ? 3 + (stage >= 3 ? 2 : 0) : 1;
    for (let l = 0; l < leaves; l++) {
      const ly = 0.04 + l * (stemH / (leaves + 1));
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.055, 6), leafMat);
      leaf.position.set(rx, ly, rz);
      leaf.rotation.z = (l / leaves) * Math.PI * 0.35 + ang;
      leaf.rotation.x = 0.42;
      root.add(leaf);
    }
  }

  if (stage >= 4 || (stage >= 3 && id === 'funaria')) {
    const setaH = id === 'polytrichum' ? 0.38 : id === 'funaria' ? 0.24 : 0.3;
    const seta = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, setaH, 4, 10), matRim);
    seta.position.set(0, setaH / 2 + 0.05, 0);
    if (id === 'funaria') seta.rotation.z = 0.35;
    root.add(seta);

    let cap;
    const capMat = createStylizedMaterial(THREE, 0x6d4c41, { roughness: 0.55, emissiveScale: 0.08 });
    if (id === 'funaria') {
      cap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 14), capMat);
      cap.scale.set(0.88, 1.28, 0.88);
    } else {
      cap = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.055, 5, 12), capMat);
    }
    cap.position.set(id === 'funaria' ? 0.06 : 0, setaH + 0.065, id === 'funaria' ? 0.02 : 0);
    root.add(cap);
  }
}

/**
 * @param {typeof import('three')} THREE
 * @param {import('three').Group} root
 * @param {import('three').Material} mat
 */
function addLobe(THREE, root, mat, x, z, rx, rz) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(rx, 14, 10), mat);
  m.scale.set(1, 0.28, rz / rx);
  m.position.set(x, 0.018, z);
  root.add(m);
}

function addRibbon(THREE, root, mat, x, z, length, width, rotY) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(width * 0.42, length, 6, 14), mat);
  m.rotation.y = rotY;
  m.rotation.z = Math.PI / 2;
  const reach = length * 0.45;
  const px = x + Math.cos(rotY) * reach;
  const pz = z + Math.sin(rotY) * reach;
  const clampR = 0.34;
  const r = Math.hypot(px, pz);
  const k = r > clampR ? clampR / r : 1;
  m.position.set(px * k, 0.022, pz * k);
  root.add(m);
}

/** @param {Plant3dView} view */
function installPlant3dTestHook(view) {
  if (typeof globalThis === 'undefined') return;
  const g = globalThis;
  g.__PLANT3D_TEST__ = {
    getState() {
      const c = view.controls;
      const canvas = view.canvas;
      const mount = view.mount;
      if (!c || !canvas) return null;
      const rad2deg = (r) => (r * 180) / Math.PI;
      return {
        polarDeg: rad2deg(c.getPolarAngle()),
        azimuthDeg: rad2deg(c.getAzimuthalAngle()),
        minPolarDeg: rad2deg(c.minPolarAngle),
        maxPolarDeg: rad2deg(c.maxPolarAngle),
        touchActionCanvas: canvas ? getComputedStyle(canvas).touchAction : '',
        touchActionMount: mount ? getComputedStyle(mount).touchAction : '',
        damping: c.enableDamping,
      };
    },
    resetView: () => view.resetView(),
  };
}

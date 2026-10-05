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
import {
  assertLiverwortThalliInsideSoil,
  buildLiverwort,
  LIVERWORT_SOIL_MAX_R,
} from './plant-3d-liverwort.js';
import { buildMossCushion } from './plant-3d-moss.js';
import { tallyPlantMesh } from './plant-3d-materials.js';

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
    /** @type {{ triangles: number, drawCalls: number } | null} */
    this._meshStats = null;
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
    this.controls.update();
    this.controls.saveState();

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
      this.applyMoodTransform(mood, sp?.group);
      return;
    }
    this._sig = sig;
    this.clearGroup(this.plantGroup);
    if (!sp) return;
    const palette = palette3d(mood, mature);
    const stage = stageIndexFromGrowth(growth);
    const t = growth / 100;
    if (sp.group === 'liverwort') {
      this._meshStats = buildLiverwort(this.THREE, this.plantGroup, sp.id, stage, t, palette, mood);
    } else {
      this._meshStats = buildMossCushion(this.THREE, this.plantGroup, sp.id, stage, t, palette, mood);
    }
    this.applyMoodTransform(mood, sp.group);
  }

  resetView() {
    if (!this.camera || !this.controls || !this._defaultCameraPos || !this._defaultTarget) return;
    this.controls.autoRotate = false;
    this.idleSpin = 0;
    const wasDamping = this.controls.enableDamping;
    this.controls.enableDamping = false;
    this.controls._sphericalDelta.set(0, 0, 0);
    this.controls._scale = 1;
    this.camera.position.copy(this._defaultCameraPos);
    this.controls.target.copy(this._defaultTarget);
    for (let i = 0; i < 4; i++) {
      this.controls.update();
    }
    this.controls.enableDamping = wasDamping;
    if (this.renderer && this.scene) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /** @param {PlantMood} mood @param {'liverwort'|'moss'|undefined} group */
  applyMoodTransform(mood, group) {
    if (!this.plantGroup) return;
    this.plantGroup.rotation.x = group === 'liverwort' && mood === 'withered' ? -0.08 : 0;
    this.plantGroup.scale.setScalar(mood === 'withered' ? 0.92 : 1);
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
    clayMat.side = THREE.DoubleSide;
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.38, 0.32, 28, 1, true),
      clayMat
    );
    wall.position.y = -0.1;
    g.add(wall);

    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.045, 28), clayMat);
    foot.position.y = -0.278;
    g.add(foot);

    const bottomOuter = new THREE.Mesh(new THREE.CircleGeometry(0.4, 28), clayMat);
    bottomOuter.rotation.x = Math.PI / 2;
    bottomOuter.position.y = -0.302;
    g.add(bottomOuter);

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
      ch.traverse?.((node) => {
        if ('geometry' in node && node.geometry && node !== ch) node.geometry.dispose();
      });
      if ('geometry' in ch && ch.geometry && !ch.isInstancedMesh) ch.geometry.dispose();
      if ('material' in ch) {
        const m = ch.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else if (m) m.dispose();
      }
    }
  }
}

/** @param {Plant3dView} view */
function installPlant3dTestHook(view) {
  if (typeof globalThis === 'undefined') return;
  const g = globalThis;
  const rad2deg = (r) => (r * 180) / Math.PI;
  const defaultAngles = () => {
    if (!view.camera || !view.controls || !view._defaultCameraPos || !view._defaultTarget) {
      return { polarDeg: 0, azimuthDeg: 0 };
    }
    const THREE = view.THREE;
    const offset = view._defaultCameraPos.clone().sub(view._defaultTarget);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    return { polarDeg: rad2deg(spherical.phi), azimuthDeg: rad2deg(spherical.theta) };
  };

  g.__PLANT3D_TEST__ = {
    getState() {
      const c = view.controls;
      const canvas = view.canvas;
      const mount = view.mount;
      if (!c || !canvas) return null;
      const def = defaultAngles();
      return {
        polarDeg: rad2deg(c.getPolarAngle()),
        azimuthDeg: rad2deg(c.getAzimuthalAngle()),
        defaultPolarDeg: def.polarDeg,
        defaultAzimuthDeg: def.azimuthDeg,
        minPolarDeg: rad2deg(c.minPolarAngle),
        maxPolarDeg: rad2deg(c.maxPolarAngle),
        touchActionCanvas: canvas ? getComputedStyle(canvas).touchAction : '',
        touchActionMount: mount ? getComputedStyle(mount).touchAction : '',
        damping: c.enableDamping,
      };
    },
    resetView: () => view.resetView(),
    setPolarDeg(deg) {
      const c = view.controls;
      const THREE = view.THREE;
      if (!c || !view.camera || !view.renderer || !view.scene || !THREE) return null;
      const phi = (deg * Math.PI) / 180;
      const offset = view.camera.position.clone().sub(c.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.phi = phi;
      offset.setFromSpherical(spherical);
      view.camera.position.copy(c.target).add(offset);
      c.update();
      view.renderer.render(view.scene, view.camera);
      return phi;
    },
    getMeshStats() {
      if (!view.plantGroup || !view.THREE) return view._meshStats;
      return tallyPlantMesh(view.plantGroup, view.THREE);
    },
    assertLiverwortInSoilDisc() {
      if (!view.plantGroup || !view.THREE) return { ok: false, reason: 'no plant' };
      return assertLiverwortThalliInsideSoil(view.plantGroup, view.THREE, LIVERWORT_SOIL_MAX_R);
    },
    getPlantFootprintPct() {
      const THREE = view.THREE;
      if (!view.plantGroup || !THREE) return null;
      view.plantGroup.updateWorldMatrix(true, true);
      const v = new THREE.Vector3();
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;
      view.plantGroup.traverse((ch) => {
        if (!ch.isMesh || !ch.geometry?.attributes?.position) return;
        const pos = ch.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i);
          v.applyMatrix4(ch.matrixWorld);
          if (v.y > 0.12) continue;
          minX = Math.min(minX, v.x);
          maxX = Math.max(maxX, v.x);
          minZ = Math.min(minZ, v.z);
          maxZ = Math.max(maxZ, v.z);
        }
      });
      if (!Number.isFinite(minX)) return null;
      const dx = maxX - minX;
      const dz = maxZ - minZ;
      const diam = (dx + dz) * 0.5;
      const pct = Math.min(100, (diam / 0.84) ** 2 * 100);
      return { pct, diam, dx, dz };
    },
    sampleCanvasPixel(nx = 0.5, ny = 0.82) {
      const canvas = view.canvas;
      const renderer = view.renderer;
      if (!canvas || !renderer) return null;
      renderer.render(view.scene, view.camera);
      const gl = renderer.getContext();
      const x = Math.max(0, Math.min(canvas.width - 1, Math.floor(canvas.width * nx)));
      const y = Math.max(0, Math.min(canvas.height - 1, Math.floor(canvas.height * (1 - ny))));
      const px = new Uint8Array(4);
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return { r: px[0], g: px[1], b: px[2], a: px[3] };
    },
    /** @param {{ nx?: number, ny?: number, w?: number, h?: number }} [opts] */
    sampleCanvasRegionMean(opts = {}) {
      const canvas = view.canvas;
      const renderer = view.renderer;
      if (!canvas || !renderer) return null;
      renderer.render(view.scene, view.camera);
      const gl = renderer.getContext();
      const nx = opts.nx ?? 0.5;
      const ny = opts.ny ?? 0.55;
      const rw = opts.w ?? 0.22;
      const rh = opts.h ?? 0.28;
      const x0 = Math.floor(canvas.width * (nx - rw / 2));
      const y0 = Math.floor(canvas.height * (1 - ny - rh / 2));
      const w = Math.max(4, Math.floor(canvas.width * rw));
      const h = Math.max(4, Math.floor(canvas.height * rh));
      const buf = new Uint8Array(w * h * 4);
      gl.readPixels(x0, y0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let n = 0;
      for (let i = 0; i < buf.length; i += 4) {
        const r = buf[i];
        const g = buf[i + 1];
        const b = buf[i + 2];
        if (g < 25 && r < 25) continue;
        sr += r;
        sg += g;
        sb += b;
        n += 1;
      }
      if (!n) return { r: 0, g: 0, b: 0, n: 0, brightness: 0 };
      const mr = sr / n;
      const mg = sg / n;
      const mb = sb / n;
      return {
        r: Math.round(mr),
        g: Math.round(mg),
        b: Math.round(mb),
        n,
        brightness: Math.round((mr + mg + mb) / 3),
      };
    },
  };
}

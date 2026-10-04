/**
 * 花盆 3D 视图 — Three.js（只在养植物页 lazy-load）
 */
import { stageIndexFromGrowth } from './growth.js';

/** @typedef {'happy'|'uneasy'|'stressed'|'withered'} PlantMood */

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
  }

  async init() {
    const { THREE } = this;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'plant-3d-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
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

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xfff8e1, 0.95);
    sun.position.set(2, 3, 1.5);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xc8e6c9, 0.35);
    fill.position.set(-1.5, 1, -1);
    this.scene.add(fill);

    this.potGroup = this.buildPot();
    this.scene.add(this.potGroup);
    this.plantGroup = new THREE.Group();
    this.plantGroup.position.y = 0.02;
    this.scene.add(this.plantGroup);

    this.controls = new this.OrbitControls(this.camera, this.canvas);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.85;
    this.controls.maxDistance = 2.2;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minPolarAngle = Math.PI * 0.18;
    this.controls.target.set(0, 0.15, 0);
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.35;

    this.canvas.addEventListener('pointerdown', () => {
      this.controls.autoRotate = false;
      this.idleSpin = 0;
    });

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
    const sig = `${sp?.id ?? ''}|${Math.floor(growth)}|${mood}`;
    if (sig === this._sig) {
      this.applyMoodTransform(mood);
      return;
    }
    this._sig = sig;
    this.clearGroup(this.plantGroup);
    if (!sp) return;
    const palette = moodPalette(mood, growth >= 100);
    const stage = stageIndexFromGrowth(growth);
    const t = growth / 100;
    if (sp.group === 'liverwort') {
      buildLiverwort(this.THREE, this.plantGroup, sp.id, stage, t, palette);
    } else {
      buildMossCushion(this.THREE, this.plantGroup, sp.id, stage, t, palette);
    }
    this.applyMoodTransform(mood);
  }

  /** @param {PlantMood} mood */
  applyMoodTransform(mood) {
    if (!this.plantGroup) return;
    const droop =
      mood === 'withered' ? 0.55 : mood === 'stressed' ? 0.25 : mood === 'uneasy' ? 0.12 : 0;
    this.plantGroup.rotation.x = -droop;
    this.plantGroup.scale.setScalar(mood === 'withered' ? 0.85 : 1);
  }

  buildPot() {
    const { THREE } = this;
    const g = new THREE.Group();
    const soil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.44, 0.06, 24),
      new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.95 })
    );
    soil.position.y = 0.03;
    g.add(soil);

    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.38, 0.32, 24, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.85, side: THREE.DoubleSide })
    );
    wall.position.y = -0.1;
    g.add(wall);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.035, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0xa1887f, roughness: 0.7 })
    );
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

/** @param {PlantMood} mood @param {boolean} mature */
function moodPalette(mood, mature) {
  if (mature) return { main: 0x2e7d32, alt: 0x43a047, rim: 0x1b5e20 };
  if (mood === 'withered') return { main: 0x8d6e63, alt: 0xa1887f, rim: 0x5d4037 };
  if (mood === 'stressed') return { main: 0xc0a020, alt: 0xd4af37, rim: 0x8d6e00 };
  if (mood === 'uneasy') return { main: 0x7cb342, alt: 0x9ccc65, rim: 0x558b2f };
  return { main: 0x43a047, alt: 0x66bb6a, rim: 0x2e7d32 };
}

/**
 * @param {typeof import('three')} THREE
 * @param {import('three').Group} root
 */
function buildLiverwort(THREE, root, id, stage, t, palette) {
  const mat = new THREE.MeshStandardMaterial({
    color: palette.main,
    roughness: 0.75,
    flatShading: true,
  });
  const matAlt = new THREE.MeshStandardMaterial({
    color: palette.alt,
    roughness: 0.8,
    flatShading: true,
  });

  const scale = 0.35 + t * 0.45;

  if (stage === 0) {
    addLobe(THREE, root, mat, 0, 0, 0.08 * scale, 0.04 * scale);
    addLobe(THREE, root, matAlt, 0.05, 0.01, 0.06 * scale, 0.035 * scale);
    addLobe(THREE, root, matAlt, -0.04, -0.02, 0.05 * scale, 0.03 * scale);
    return;
  }

  if (stage === 1) {
    addRibbon(THREE, root, mat, 0, 0, 0.22 * scale, 0.07, 0);
    addRibbon(THREE, root, matAlt, 0.02, 0.01, 0.14 * scale, 0.06, 0.4);
    return;
  }

  const branches = id === 'riccia' ? 4 : id === 'conocephalum' ? 3 : 2;
  for (let i = 0; i < branches; i++) {
    const ang = (i / branches) * Math.PI * 2 + 0.3;
    const len = (0.28 + stage * 0.06) * scale;
    const w = id === 'riccia' ? 0.045 : id === 'conocephalum' ? 0.11 : 0.08;
    addRibbon(THREE, root, i % 2 ? mat : matAlt, Math.cos(ang) * 0.05, Math.sin(ang) * 0.04, len, w, ang);
    if (id === 'riccia' && stage >= 2) {
      addRibbon(
        THREE,
        root,
        matAlt,
        Math.cos(ang) * 0.12,
        Math.sin(ang) * 0.1,
        len * 0.65,
        w * 0.85,
        ang + 0.7
      );
    }
  }

  if (id === 'conocephalum' && stage >= 2) {
    const bump = new THREE.Mesh(
      new THREE.BoxGeometry(0.14 * scale, 0.02, 0.1 * scale),
      matAlt
    );
    bump.position.set(0, 0.025, 0);
    root.add(bump);
  }

  if (stage >= 3 && (id === 'marchantia' || id === 'conocephalum')) {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05 * scale, 0.07 * scale, 0.03, 10),
      matAlt
    );
    cup.position.set(0.08 * scale, 0.04, 0.05 * scale);
    root.add(cup);
  }

  if (stage >= 4) {
    const stalk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.02, 0.18 * scale, 8),
      new THREE.MeshStandardMaterial({ color: palette.rim, flatShading: true })
    );
    stalk.position.set(0, 0.09 * scale, 0);
    root.add(stalk);
    if (id === 'marchantia') {
      const palm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11 * scale, 0.09 * scale, 0.025, 9),
        mat
      );
      palm.position.set(0, 0.19 * scale, 0);
      root.add(palm);
      for (let f = 0; f < 7; f++) {
        const finger = new THREE.Mesh(
          new THREE.BoxGeometry(0.025, 0.04, 0.06 * scale),
          matAlt
        );
        const a = (f / 7) * Math.PI * 2;
        finger.position.set(Math.cos(a) * 0.09 * scale, 0.21 * scale, Math.sin(a) * 0.07 * scale);
        finger.rotation.y = a;
        root.add(finger);
      }
    } else if (id === 'conocephalum') {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.07 * scale, 0.12 * scale, 10),
        mat
      );
      cone.position.set(0, 0.25 * scale, 0);
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
    stage === 0 ? 1 : stage === 1 ? 5 : stage === 2 ? 6 : stage === 3 ? 9 : 12;
  const heightBase =
    id === 'polytrichum' ? 0.22 : id === 'funaria' ? 0.12 : id === 'hypnum' ? 0.1 : 0.14;
  const h = heightBase * (0.45 + t * 0.9);
  const spread = 0.12 + t * 0.22;

  const mat = new THREE.MeshStandardMaterial({
    color: id === 'leucobryum' ? 0xdcedc8 : palette.main,
    roughness: 0.82,
    flatShading: true,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: palette.alt,
    roughness: 0.85,
    flatShading: true,
  });

  for (let i = 0; i < shootCount; i++) {
    const ang = (i / shootCount) * Math.PI * 2 + (id === 'hypnum' ? i * 0.4 : 0);
    const rx = Math.cos(ang) * spread * (0.4 + (i % 3) * 0.15);
    const rz = Math.sin(ang) * spread * (0.4 + (i % 2) * 0.2);
    const stemH = h * (0.75 + (i % 4) * 0.08);
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.018, stemH, 6),
      mat
    );
    stem.position.set(rx, stemH / 2 + 0.02, rz);
    if (id === 'hypnum') stem.rotation.z = 0.25 * Math.sin(ang);
    root.add(stem);

    const leaves = stage >= 1 ? 3 + (stage >= 3 ? 2 : 0) : 1;
    for (let l = 0; l < leaves; l++) {
      const ly = 0.04 + l * (stemH / (leaves + 1));
      const leaf = new THREE.Mesh(
        new THREE.ConeGeometry(0.028, 0.05, 4),
        leafMat
      );
      leaf.position.set(rx, ly, rz);
      leaf.rotation.z = (l / leaves) * Math.PI * 0.35 + ang;
      leaf.rotation.x = 0.4;
      root.add(leaf);
    }
  }

  if (stage >= 4 || (stage >= 3 && id === 'funaria')) {
    const setaH = id === 'polytrichum' ? 0.35 : id === 'funaria' ? 0.22 : 0.28;
    const seta = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.012, setaH, 6),
      new THREE.MeshStandardMaterial({ color: palette.rim, flatShading: true })
    );
    seta.position.set(0, setaH / 2 + 0.05, 0);
    if (id === 'funaria') seta.rotation.z = 0.35;
    root.add(seta);

    let cap;
    if (id === 'funaria') {
      cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 8, 10),
        new THREE.MeshStandardMaterial({ color: 0x6d4c41, flatShading: true })
      );
      cap.scale.set(0.85, 1.25, 0.85);
    } else {
      cap = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.035, 0.05, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x5d4037, flatShading: true })
      );
    }
    cap.position.set(id === 'funaria' ? 0.06 : 0, setaH + 0.06, id === 'funaria' ? 0.02 : 0);
    root.add(cap);
  }
}

/**
 * @param {typeof import('three')} THREE
 * @param {import('three').Group} root
 * @param {import('three').Material} mat
 */
function addLobe(THREE, root, mat, x, z, rx, rz) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rx, rx * 0.9, 0.025, 10), mat);
  m.position.set(x, 0.02, z);
  m.scale.z = rz / rx;
  root.add(m);
}

function addRibbon(THREE, root, mat, x, z, length, width, rotY) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(length, 0.022, width), mat);
  m.position.set(x + Math.cos(rotY) * length * 0.45, 0.025, z + Math.sin(rotY) * length * 0.45);
  m.rotation.y = rotY;
  root.add(m);
}

/**
 * 养苔藓 — 统一视觉风格（3D + 2D 回退）
 *
 * 「不要太真实，也不要太卡通」：保留参考里的真实结构（叶状体、胞芽杯、孢蒴等），
 * 用低/中多边形 + 程序化顶点色与小叶实例；花盆仍无贴图；无粗描边、无表情。
 */

/** @typedef {'happy'|'uneasy'|'stressed'|'withered'} PlantMood */

export const VISUAL_STYLE = {
  id: 'stylized-natural',
  labelZh: '柔和半写实',
  summary:
    '真实苔藓结构 + 绒面多层绿与小叶实例：MeshStandardMaterial 顶点色、半球光与轻 rim，略放大可读特征。',
};

/** @typedef {{ main: number, alt: number, rim: number, soil: number, pot: number, potRim: number }} Palette3d */

/** @param {PlantMood} mood @param {boolean} mature @returns {Palette3d} */
export function palette3d(mood, mature) {
  if (mature) {
    return { main: 0x388e3c, alt: 0x66bb6a, rim: 0x2e7d32, soil: 0x4e342e, pot: 0x9a7b6a, potRim: 0xb89585 };
  }
  if (mood === 'withered') {
    return { main: 0x8d6e63, alt: 0xa1887f, rim: 0x5d4037, soil: 0x4a372f, pot: 0x8a7268, potRim: 0x9e8778 };
  }
  if (mood === 'stressed') {
    return { main: 0xb8a030, alt: 0xd4c050, rim: 0x8d6e00, soil: 0x4e342e, pot: 0x9a7b6a, potRim: 0xb89585 };
  }
  if (mood === 'uneasy') {
    return { main: 0x689f38, alt: 0x9ccc65, rim: 0x558b2f, soil: 0x4e342e, pot: 0x9a7b6a, potRim: 0xb89585 };
  }
  return { main: 0x43a047, alt: 0x81c784, rim: 0x2e7d32, soil: 0x4e342e, pot: 0x9a7b6a, potRim: 0xb89585 };
}

/** @param {PlantMood} mood @param {boolean} mature */
export function paletteSvg(mood, mature) {
  if (mature) {
    return { fill: '#388e3c', fillHi: '#66bb6a', stroke: '#1b5e20', shadow: 'rgba(27,94,32,0.35)' };
  }
  if (mood === 'withered') {
    return { fill: '#8d6e63', fillHi: '#a1887f', stroke: '#5d4037', shadow: 'rgba(93,64,55,0.3)' };
  }
  if (mood === 'stressed') {
    return { fill: '#b8a030', fillHi: '#d4c050', stroke: '#8d6e00', shadow: 'rgba(141,110,0,0.28)' };
  }
  if (mood === 'uneasy') {
    return { fill: '#689f38', fillHi: '#9ccc65', stroke: '#558b2f', shadow: 'rgba(85,139,47,0.3)' };
  }
  return { fill: '#43a047', fillHi: '#81c784', stroke: '#2e7d32', shadow: 'rgba(46,125,50,0.32)' };
}

/**
 * @param {typeof import('three')} THREE
 * @param {number} color
 * @param {{ roughness?: number, metalness?: number, emissiveScale?: number }} [opts]
 */
export function createStylizedMaterial(THREE, color, opts = {}) {
  const c = new THREE.Color(color);
  const emissive = c.clone().multiplyScalar(opts.emissiveScale ?? 0.12);
  return new THREE.MeshStandardMaterial({
    color: c,
    roughness: opts.roughness ?? 0.58,
    metalness: opts.metalness ?? 0.05,
    flatShading: false,
    emissive,
    emissiveIntensity: 0.35,
  });
}

/**
 * @param {typeof import('three')} THREE
 * @param {import('three').Scene} scene
 * @param {import('three').WebGLRenderer} renderer
 */
export function applyStylizedLighting(THREE, scene, renderer) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene.add(new THREE.HemisphereLight(0xe8f5e9, 0x4e342e, 0.52));
  const key = new THREE.DirectionalLight(0xfff5e6, 0.82);
  key.position.set(2.2, 3.2, 1.6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc5e1a5, 0.38);
  fill.position.set(-1.8, 1.2, -0.8);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xa5d6a7, 0.48);
  rim.position.set(-2.4, 1.8, -2.2);
  scene.add(rim);
  const under = new THREE.DirectionalLight(0xbcaaa4, 0.42);
  under.position.set(0, -2.5, 0.2);
  scene.add(under);
}

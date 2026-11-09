/**
 * background.ts — Cinematic 3D environment:
 *   - Procedural high-res architectural building facades with glowing night windows
 *   - Varied skyscraper typologies (stepped setbacks, spires, rooftop beacons)
 *   - Continuous sculpted mountain range (Margalla-inspired dramatic ridges)
 *   - Real 3D Tree GLB loader (/models/tree-my.glb, fallback to tree.glb)
 *   - Rolling terrain ground plane flanking the highway
 *   - Dynamic atmospheric sky with horizon glow & stars
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { COLORS } from '../config';
import { getRoadPoint } from './road';

/* ── Constants ────────────────────────────────────────────────────── */

const TREE_COUNT = 36;
const BUILDING_COUNT = 28;
const MOUNTAIN_SPREAD_X = 320;
const LAYER_SPREAD_X = 240;

const FAR_MOUNTAIN_Z = -88;
const MID_FOOTHILL_Z = -64;
const CITY_Z = -44;

/* ── State ────────────────────────────────────────────────────────── */

let skyMesh: THREE.Mesh;
let skyMat: THREE.ShaderMaterial;
let fogRef: THREE.Fog;
let terrainMesh: THREE.Mesh;

let buildingDiffuseTex: THREE.CanvasTexture | null = null;
let buildingEmissiveTex: THREE.CanvasTexture | null = null;
const buildingMaterials: THREE.MeshStandardMaterial[] = [];
const beaconMaterials: THREE.MeshStandardMaterial[] = [];

interface ParallaxLayer {
  group: THREE.Group;
  speed: number;
}
const layers: ParallaxLayer[] = [];

/* ── Sky gradient shader with atmospheric horizon & night stars ───── */

const skyVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragmentShader = /* glsl */ `
  uniform vec3 uTopColor;
  uniform vec3 uBottomColor;
  uniform float uNightAlpha;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    float h = clamp(vUv.y * 1.25 - 0.12, 0.0, 1.0);
    vec3 col = mix(uBottomColor, uTopColor, pow(h, 0.85));

    // Warm horizon haze during daytime and sunset
    float horizonHaze = exp(-pow(abs(vUv.y - 0.44) * 4.5, 2.0)) * 0.18;
    col += mix(vec3(0.0), vec3(0.95, 0.65, 0.4), horizonHaze * (1.0 - uNightAlpha));

    // Night stars (upper hemisphere)
    if (uNightAlpha > 0.05 && vUv.y > 0.5) {
      vec2 starCoord = floor(vUv * 600.0);
      float n = hash(starCoord);
      if (n > 0.988) {
        float brightness = smoothstep(0.988, 1.0, n) * uNightAlpha;
        col += vec3(brightness * 1.5);
      }
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ── Procedural Building Textures (Diffuse + Night Emissive) ──────── */

function generateBuildingTextures(): { diffuse: THREE.CanvasTexture; emissive: THREE.CanvasTexture } {
  const w = 512;
  const h = 1024;

  const dCanvas = document.createElement('canvas');
  dCanvas.width = w;
  dCanvas.height = h;
  const dCtx = dCanvas.getContext('2d')!;

  const eCanvas = document.createElement('canvas');
  eCanvas.width = w;
  eCanvas.height = h;
  const eCtx = eCanvas.getContext('2d')!;

  // Base facade: dark architectural graphite/slate
  dCtx.fillStyle = '#171f2c';
  dCtx.fillRect(0, 0, w, h);

  // Emissive base: pitch black (unlit)
  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, w, h);

  const cols = 16;
  const rows = 36;
  const cellW = w / cols;
  const cellH = h / rows;
  const padX = 3;
  const padY = 5;

  for (let r = 0; r < rows; r++) {
    const isSpandrel = (r % 6 === 0);

    for (let c = 0; c < cols; c++) {
      const x = c * cellW + padX;
      const y = r * cellH + padY;
      const winW = cellW - padX * 2;
      const winH = cellH - padY * 2;

      if (!isSpandrel) {
        // Daytime reflective glass tint
        dCtx.fillStyle = '#233044';
        dCtx.fillRect(x, y, winW, winH);

        // Window mullion frame
        dCtx.strokeStyle = '#0f141d';
        dCtx.lineWidth = 1;
        dCtx.strokeRect(x, y, winW, winH);

        // Deterministic pseudo-randomness for window light pattern
        const seed = Math.sin(r * 19.123 + c * 47.987) * 43758.5453;
        const rand = seed - Math.floor(seed);

        // ~60% of windows are illuminated at night
        if (rand > 0.40) {
          if (rand > 0.85) {
            eCtx.fillStyle = '#f0f9ff'; // cool modern LED light
          } else if (rand > 0.65) {
            eCtx.fillStyle = '#fef08a'; // soft interior warm light
          } else {
            eCtx.fillStyle = '#f59e0b'; // golden amber office light
          }
          eCtx.fillRect(x, y, winW, winH);
        }
      } else {
        // Concrete/metal spandrel band between floor tiers
        dCtx.fillStyle = '#101722';
        dCtx.fillRect(x - padX, y, cellW, winH);
      }
    }
  }

  const diffuse = new THREE.CanvasTexture(dCanvas);
  diffuse.wrapS = THREE.RepeatWrapping;
  diffuse.wrapT = THREE.RepeatWrapping;

  const emissive = new THREE.CanvasTexture(eCanvas);
  emissive.wrapS = THREE.RepeatWrapping;
  emissive.wrapT = THREE.RepeatWrapping;

  return { diffuse, emissive };
}

/* ── Tree GLB Loader ──────────────────────────────────────────────── */

async function loadTreeModel(): Promise<THREE.Group> {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/draco/');
  loader.setDRACOLoader(dracoLoader);

  const candidateUrls = [
    '/models/tree-my.glb',
    '/models/tree.glb',
    '/models/tree1.glb',
    '/models/tree2.glb',
  ];

  for (const url of candidateUrls) {
    try {
      const gltf = await loader.loadAsync(url);
      const scene = gltf.scene;

      const box = new THREE.Box3().setFromObject(scene);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      // Center model horizontally, place base at y = 0
      scene.position.set(-center.x, -box.min.y, -center.z);

      const wrapper = new THREE.Group();
      wrapper.add(scene);

      const baseHeight = size.y > 0.01 ? size.y : 1;
      const targetScale = 6.2 / baseHeight;
      wrapper.scale.setScalar(targetScale);

      wrapper.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.side = THREE.DoubleSide;
            if (child.material instanceof THREE.MeshStandardMaterial) {
              child.material.roughness = 0.85;
            }
          }
        }
      });

      console.info(`[SwiftHaul] Loaded real tree model from: ${url}`);
      return wrapper;
    } catch (e) {
      console.warn(`[SwiftHaul] Failed to load ${url}:`, e);
    }
  }

  return buildProceduralFallbackTree();
}

function buildProceduralFallbackTree(): THREE.Group {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#4a2f18', roughness: 0.95 });
  const foliageMat = new THREE.MeshStandardMaterial({
    color: '#2d5a27',
    roughness: 0.85,
    flatShading: true,
  });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 4, 8), trunkMat);
  trunk.position.y = 2;
  trunk.castShadow = true;
  group.add(trunk);

  const foliage1 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.0, 1), foliageMat);
  foliage1.position.set(0, 4.5, 0);
  foliage1.castShadow = true;
  group.add(foliage1);

  return group;
}

/* ── Sculpted Mountain Range Geometry Generator ───────────────────── */

function createMountainRidgeMesh(
  width: number,
  depth: number,
  baseHeight: number,
  variance: number,
  color: string,
): THREE.Mesh {
  const segmentsX = 48;
  const segmentsZ = 12;
  const geo = new THREE.PlaneGeometry(width, depth, segmentsX, segmentsZ);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);

    // Ridge crest profiles (peaks along central spine)
    const normalizedZ = (z / (depth / 2)); // -1 to +1
    const ridgeProfile = Math.max(0, 1.0 - Math.abs(normalizedZ));

    const peak1 = Math.sin(x * 0.05) * 0.5 + 0.5;
    const peak2 = Math.cos(x * 0.11 + 1.2) * 0.35 + 0.35;
    const peak3 = Math.sin(x * 0.02 + 0.5) * 0.6 + 0.4;
    const jagged = Math.sin(x * 0.28) * 0.12;

    const h = (peak1 * 0.5 + peak2 * 0.3 + peak3 * 0.2 + jagged) * variance * ridgeProfile;
    pos.setY(i, Math.max(0, baseHeight * ridgeProfile + h));
  }

  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = false;
  return mesh;
}

/* ── Create Background Scene ──────────────────────────────────────── */

export async function createBackground(scene: THREE.Scene): Promise<void> {
  /* ── 1. Sky Dome with Atmospheric Atmosphere Shader ─────────────── */
  skyMat = new THREE.ShaderMaterial({
    vertexShader: skyVertexShader,
    fragmentShader: skyFragmentShader,
    uniforms: {
      uTopColor: { value: new THREE.Color(COLORS.sky[0].top) },
      uBottomColor: { value: new THREE.Color(COLORS.sky[0].bottom) },
      uNightAlpha: { value: 0.0 },
    },
    side: THREE.BackSide,
    depthWrite: false,
  });

  const skyGeo = new THREE.SphereGeometry(260, 32, 16);
  skyMesh = new THREE.Mesh(skyGeo, skyMat);
  skyMesh.name = 'sky';
  scene.add(skyMesh);

  /* ── 2. Atmospheric Fog ─────────────────────────────────────────── */
  fogRef = new THREE.Fog(COLORS.sky[0].fog, 45, 190);
  scene.fog = fogRef;

  /* ── 3. Rolling Landscape Ground Plane ──────────────────────────── */
  // High-resolution terrain mesh covering the entire route
  const terrainGeo = new THREE.PlaneGeometry(360, 220, 120, 64);
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);

    // Sample road centerline at exact world X coordinate
    const roadPt = getRoadPoint(x);
    const distFromRoad = Math.abs(z - roadPt.z);

    // Keep highway corridor flat & depressed below road level (y = -0.06)
    // Road half-width is 4.6 (curbs at 5.5). Corridor stays flat up to 8.5 units.
    if (distFromRoad > 8.5) {
      const hillDist = distFromRoad - 8.5;
      const ramp = Math.min(hillDist * 0.12, 1.0);
      const elevation =
        Math.sin(x * 0.04) * 0.8 +
        Math.cos(z * 0.05) * 1.2 +
        Math.sin((x + z) * 0.02) * 1.5;
      posAttr.setY(i, Math.max(0, elevation * ramp * 2.6));
    } else {
      // Depressed slightly below asphalt surface (y = 0.02) to prevent any z-fighting
      posAttr.setY(i, -0.06);
    }
  }
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    color: '#2f4229',
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });

  terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.name = 'terrain';
  // MUST be at (0, 0, 0) so local coordinates match world coordinates identically
  terrainMesh.position.set(0, 0, 0);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  /* ── 4. Majestic Layered Mountain Range (Parallax 0.12 & 0.20) ──── */
  const mountainGroup = new THREE.Group();
  mountainGroup.name = 'mountains';

  // Far majestic mountain range (Margalla-inspired high peaks)
  const farMountains = createMountainRidgeMesh(
    MOUNTAIN_SPREAD_X,
    45,
    16,
    22,
    '#253041',
  );
  farMountains.position.set(40, 0, FAR_MOUNTAIN_Z);
  mountainGroup.add(farMountains);

  // Mid-distance foothill ridge
  const midFoothills = createMountainRidgeMesh(
    MOUNTAIN_SPREAD_X,
    30,
    8,
    12,
    '#1c2534',
  );
  midFoothills.position.set(40, 0, MID_FOOTHILL_Z);
  mountainGroup.add(midFoothills);

  scene.add(mountainGroup);
  layers.push({ group: mountainGroup, speed: 0.14 });

  /* ── 5. Modern City Skyline with Glowing Night Windows (Parallax 0.40) */
  const { diffuse, emissive } = generateBuildingTextures();
  buildingDiffuseTex = diffuse;
  buildingEmissiveTex = emissive;

  const cityGroup = new THREE.Group();
  cityGroup.name = 'skyline';

  // Shared beacon material for skyscraper rooftop warning lights
  const beaconMat = new THREE.MeshStandardMaterial({
    color: '#ef4444',
    emissive: '#ef4444',
    emissiveIntensity: 0.0,
    roughness: 0.3,
  });
  beaconMaterials.push(beaconMat);

  const beaconGeo = new THREE.SphereGeometry(0.18, 6, 6);
  const spireGeo = new THREE.CylinderGeometry(0.04, 0.12, 3.5, 6);

  for (let i = 0; i < BUILDING_COUNT; i++) {
    const isSkyscraper = (i % 4 === 0);
    const isTiered = (i % 3 === 0);

    const w = 2.4 + (i % 3) * 1.4;
    const h = isSkyscraper ? (11 + (i % 5) * 3.5) : (5.5 + (i % 4) * 2.2);
    const d = 2.4 + (i % 2) * 1.4;

    const bMat = new THREE.MeshStandardMaterial({
      map: buildingDiffuseTex,
      emissiveMap: buildingEmissiveTex,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.0, // starts off during day, illuminates at night
      roughness: 0.75,
      metalness: 0.25,
    });
    buildingMaterials.push(bMat);

    const bGroup = new THREE.Group();

    if (isTiered) {
      // 2-tier architectural building (base podium + upper tower)
      const baseH = h * 0.4;
      const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(w * 1.25, baseH, d * 1.25), bMat);
      baseMesh.position.y = baseH / 2;
      baseMesh.castShadow = true;
      bGroup.add(baseMesh);

      const topH = h * 0.6;
      const topMesh = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, topH, d * 0.85), bMat);
      topMesh.position.y = baseH + topH / 2;
      topMesh.castShadow = true;
      bGroup.add(topMesh);
    } else {
      // Monolithic tower
      const mainMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bMat);
      mainMesh.position.y = h / 2;
      mainMesh.castShadow = true;
      bGroup.add(mainMesh);
    }

    // Add rooftop spire & red aviation beacon to tall skyscrapers
    if (isSkyscraper) {
      const spireMesh = new THREE.Mesh(spireGeo, bMat);
      spireMesh.position.y = h + 1.75;
      bGroup.add(spireMesh);

      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.y = h + 3.5;
      bGroup.add(beaconMesh);
    }

    const xPos = -LAYER_SPREAD_X / 2 + (i / BUILDING_COUNT) * LAYER_SPREAD_X + (((i * 17) % 9) - 4);
    const zPos = CITY_Z + (((i * 11) % 8) - 4);

    bGroup.position.set(xPos, 0, zPos);
    cityGroup.add(bGroup);
  }

  scene.add(cityGroup);
  layers.push({ group: cityGroup, speed: 0.40 });

  /* ── 6. Realistic 3D Trees from GLB (Parallax 0.75) ──────────────── */
  const treeTemplate = await loadTreeModel();
  const treeGroup = new THREE.Group();
  treeGroup.name = 'trees';

  for (let i = 0; i < TREE_COUNT; i++) {
    const tree = treeTemplate.clone(true);

    const xPos = -55 + (i / TREE_COUNT) * 190 + (((i * 19) % 11) - 5);
    const roadPt = getRoadPoint(xPos);

    // ONLY place trees on the far / North side of the road (z < roadPt.z)
    // NEVER on the user/camera side (z > roadPt.z) so the car is completely unobstructed!
    const zOffset = -8.2 - ((i * 3.9) % 16); // depth: -8.2 to -24.2 behind the road
    const zPos = roadPt.z + zOffset;

    const scaleVar = 0.55 + ((i * 7) % 9) * 0.045;
    tree.scale.multiplyScalar(scaleVar);
    tree.rotation.y = (i * 1.37) % (Math.PI * 2);

    tree.position.set(xPos, 0, zPos);
    treeGroup.add(tree);
  }

  scene.add(treeGroup);
  layers.push({ group: treeGroup, speed: 0.75 });
}

/* ── Update (per-frame with scroll progress & car position) ───────── */

const _colorA = new THREE.Color();
const _colorB = new THREE.Color();

export function updateBackground(progress: number, carX: number): void {
  if (!skyMat) return;

  /* ── Sky & fog color interpolation ──────────────────────────────── */
  const keys = COLORS.sky;
  let a = keys[0];
  let b = keys[keys.length - 1];

  for (let i = 0; i < keys.length - 1; i++) {
    if (progress >= keys[i].progress && progress <= keys[i + 1].progress) {
      a = keys[i];
      b = keys[i + 1];
      break;
    }
  }

  const range = b.progress - a.progress || 1;
  const t = (progress - a.progress) / range;

  _colorA.set(a.top);
  _colorB.set(b.top);
  (skyMat.uniforms.uTopColor.value as THREE.Color).copy(_colorA).lerp(_colorB, t);

  _colorA.set(a.bottom);
  _colorB.set(b.bottom);
  (skyMat.uniforms.uBottomColor.value as THREE.Color).copy(_colorA).lerp(_colorB, t);

  _colorA.set(a.fog);
  _colorB.set(b.fog);
  fogRef.color.copy(_colorA).lerp(_colorB, t);

  /* ── Night stars & city illumination ────────────────────────────── */
  // Night progress factor (starts sunset ~0.50, peaks at ~0.80+)
  const nightFactor = THREE.MathUtils.clamp((progress - 0.48) / 0.38, 0, 1);
  skyMat.uniforms.uNightAlpha.value = nightFactor;

  // Window lights glow brightly at night
  const windowGlow = nightFactor * 1.4;
  for (const bMat of buildingMaterials) {
    bMat.emissiveIntensity = windowGlow;
  }

  // Flashing red aviation beacons on skyscraper rooftops
  const beaconBlink = nightFactor > 0.1 ? (Math.sin(Date.now() * 0.005) > 0.2 ? 2.5 : 0.2) : 0;
  for (const bcn of beaconMaterials) {
    bcn.emissiveIntensity = beaconBlink;
  }

  /* ── Parallax layers ────────────────────────────────────────────── */
  for (const layer of layers) {
    layer.group.position.x = -carX * layer.speed;
  }
}

/* ── Cleanup ──────────────────────────────────────────────────────── */

export function disposeBackground(): void {
  skyMesh?.geometry.dispose();
  skyMat?.dispose();
  terrainMesh?.geometry.dispose();
  if (terrainMesh?.material instanceof THREE.Material) {
    terrainMesh.material.dispose();
  }

  buildingDiffuseTex?.dispose();
  buildingEmissiveTex?.dispose();

  buildingMaterials.forEach((m) => m.dispose());
  buildingMaterials.length = 0;

  beaconMaterials.forEach((m) => m.dispose());
  beaconMaterials.length = 0;

  for (const layer of layers) {
    layer.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
  }
  layers.length = 0;
}

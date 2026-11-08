/**
 * car.ts — Car model with named parts for independent animation.
 *
 * `loadCar()` tries to load /models/car.glb first (a Ferrari model from
 * the Three.js examples library). If the file is missing it falls back
 * to a procedural low-poly car built from Three.js primitives.
 *
 * ## GLB structure (Ferrari)
 *
 * The Ferrari GLB has these named nodes we care about:
 *   - `body`       → main car body mesh
 *   - `glass`      → windshield / windows (treated as cabin)
 *   - `wheel_fl`   → front-left wheel GROUP (contains rim, tire, brake, etc.)
 *   - `wheel_fr`   → front-right wheel GROUP
 *   - `wheel_rl`   → rear-left wheel GROUP
 *   - `wheel_rr`   → rear-right wheel GROUP
 *   - `lights`     → headlights mesh
 *   - `lights_red` → tail lights
 *
 * Either path returns a `CarModel` with references to animatable parts.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { COLORS, TIMING } from '../config';

/* ── Public interface ─────────────────────────────────────────────── */

export interface CarModel {
  group: THREE.Group;
  body: THREE.Object3D;
  cabin: THREE.Object3D;
  wheels: THREE.Object3D[];          // [fl, fr, rl, rr]
  headlightL: THREE.Object3D;
  headlightR: THREE.Object3D;
  headlightLights: THREE.PointLight[];
  /** True if using the GLB model (affects scale, orientation) */
  isGLB: boolean;
}

/* ── Disposal helper ──────────────────────────────────────────────── */

function disposeMesh(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}

export function disposeCar(car: CarModel): void {
  disposeMesh(car.group);
  car.headlightLights.forEach((l) => l.dispose());
}

/* ── Loader ───────────────────────────────────────────────────────── */

export async function loadCar(): Promise<CarModel> {
  try {
    return await loadGLB();
  } catch (err) {
    console.info('[SwiftHaul] GLB not found — using procedural car.', err);
    return buildProceduralCar();
  }
}

/* ── GLB path ─────────────────────────────────────────────────────── */

async function loadGLB(): Promise<CarModel> {
  const loader = new GLTFLoader();

  /* Set up Draco decoder in case the model uses Draco compression */
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  loader.setDRACOLoader(dracoLoader);

  const gltf = await new Promise<ReturnType<typeof loader.loadAsync> extends Promise<infer T> ? T : never>(
    (resolve, reject) => {
      loader.load('/models/car.glb', resolve, undefined, reject);
    },
  );

  const scene = gltf.scene;

  /**
   * Find a node by name — throws if not found so the fallback triggers.
   */
  const find = (name: string): THREE.Object3D => {
    const obj = scene.getObjectByName(name);
    if (!obj) throw new Error(`GLB missing part: ${name}`);
    return obj;
  };

  /* ── Map Ferrari GLB parts to our interface ─────────────────────── */

  const body = find('body');
  const cabin = find('glass'); // windshield/windows serve as "cabin"

  /* Wheel groups (each contains rim, tire, brake, nuts, etc.) */
  const wheels = [
    find('wheel_fl'),
    find('wheel_fr'),
    find('wheel_rl'),
    find('wheel_rr'),
  ];

  /* Headlights — the Ferrari model has a single "lights" mesh.
     We'll use it for both L and R references and add point lights. */
  const lightsNode = find('lights');

  /* Add point lights at approximate headlight positions */
  const headlightLights: THREE.PointLight[] = [];
  const hlPositions = [
    new THREE.Vector3(0.65, 0.55, -2.0),  // left headlight
    new THREE.Vector3(-0.65, 0.55, -2.0), // right headlight
  ];

  for (const pos of hlPositions) {
    const pl = new THREE.PointLight(COLORS.car.headlight, 0, 15, 2);
    pl.position.copy(pos);
    scene.add(pl);
    headlightLights.push(pl);
  }

  /* Enable shadows on all meshes */
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  /* Scale and orient the Ferrari model to fit our scene.
     The Ferrari is oriented along -Z, and is roughly 4.5m long.
     We rotate it so +X is forward (matching our road direction). */
  scene.rotation.y = -Math.PI / 2; // face +X (front of car points right)
  scene.scale.setScalar(1.0);
  scene.position.y = 0.35; // lift slightly above road

  return {
    group: scene,
    body,
    cabin,
    wheels,
    headlightL: lightsNode,
    headlightR: lightsNode,
    headlightLights,
    isGLB: true,
  };
}

/* ── Procedural fallback ──────────────────────────────────────────── */

function buildProceduralCar(): CarModel {
  const group = new THREE.Group();
  group.name = 'car';

  /* ── Materials ──────────────────────────────────────────────────── */
  const bodyMat = new THREE.MeshStandardMaterial({
    color: COLORS.car.body,
    metalness: 0.4,
    roughness: 0.35,
  });
  const cabinMat = new THREE.MeshStandardMaterial({
    color: COLORS.car.cabin,
    metalness: 0.6,
    roughness: 0.2,
    transparent: true,
    opacity: 0.75,
  });
  const wheelMat = new THREE.MeshStandardMaterial({
    color: COLORS.car.wheel,
    metalness: 0.5,
    roughness: 0.5,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: COLORS.car.headlight,
    emissive: COLORS.car.headlight,
    emissiveIntensity: 0.3,
  });

  /* ── Body ───────────────────────────────────────────────────────── */
  const bodyGeo = new THREE.BoxGeometry(4, 1.0, 2);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.name = 'body';
  body.position.y = 0.7;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  /* ── Cabin (tapered top) ────────────────────────────────────────── */
  const cabinGeo = new THREE.BoxGeometry(2.2, 0.9, 1.8);
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.name = 'cabin';
  cabin.position.set(-0.2, 1.6, 0);
  cabin.castShadow = true;
  group.add(cabin);

  /* ── Wheels ─────────────────────────────────────────────────────── */
  const wheelRadius = 0.38;
  const wheelWidth = 0.28;
  const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
  wheelGeo.rotateX(Math.PI / 2); // orient along Z

  const wheelPositions = [
    { name: 'wheel-fl', x:  1.2, y: 0.38, z:  1.05 },
    { name: 'wheel-fr', x:  1.2, y: 0.38, z: -1.05 },
    { name: 'wheel-rl', x: -1.2, y: 0.38, z:  1.05 },
    { name: 'wheel-rr', x: -1.2, y: 0.38, z: -1.05 },
  ];

  const wheels: THREE.Mesh[] = [];
  for (const wp of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.name = wp.name;
    wheel.position.set(wp.x, wp.y, wp.z);
    wheel.castShadow = true;
    group.add(wheel);
    wheels.push(wheel);
  }

  /* ── Headlights ─────────────────────────────────────────────────── */
  const hlGeo = new THREE.SphereGeometry(0.15, 8, 8);

  const hlL = new THREE.Mesh(hlGeo, headlightMat.clone());
  hlL.name = 'headlight-l';
  hlL.position.set(2.05, 0.85, 0.65);
  group.add(hlL);

  const hlR = new THREE.Mesh(hlGeo, headlightMat.clone());
  hlR.name = 'headlight-r';
  hlR.position.set(2.05, 0.85, -0.65);
  group.add(hlR);

  const headlightLights = createHeadlightPointLights(hlL, hlR, group);

  return { group, body, cabin, wheels, headlightL: hlL, headlightR: hlR, headlightLights, isGLB: false };
}

/* ── Headlight point lights (procedural car only) ─────────────────── */

function createHeadlightPointLights(
  hlL: THREE.Object3D,
  hlR: THREE.Object3D,
  parent: THREE.Object3D,
): THREE.PointLight[] {
  const lights: THREE.PointLight[] = [];
  for (const hl of [hlL, hlR]) {
    const pl = new THREE.PointLight(COLORS.car.headlight, 0, 12, 2);
    pl.position.copy(hl.position);
    pl.position.x += 0.3; // slightly forward
    parent.add(pl);
    lights.push(pl);
  }
  return lights;
}

/* ── Per-frame animation helpers ──────────────────────────────────── */

/** Spin all four wheels proportional to distance delta */
export function spinWheels(car: CarModel, distanceDelta: number): void {
  const angle = distanceDelta * TIMING.wheelSpinFactor;
  for (const w of car.wheels) {
    if (car.isGLB) {
      /* Ferrari wheels: rotation around X axis (the wheel groups face sideways) */
      w.rotation.x -= angle;
    } else {
      /* Procedural wheels: cylinder oriented along Z */
      w.rotation.z -= angle;
    }
  }
}

/** Subtle idle float on the body */
export function idleFloat(car: CarModel, time: number): void {
  if (car.isGLB) {
    /* For GLB, float the whole group subtly */
    car.group.position.y = 0.35 + Math.sin(time * 1.5) * TIMING.idleFloatY;
  } else {
    car.body.position.y = 0.7 + Math.sin(time * 1.5) * TIMING.idleFloatY;
  }
  car.group.rotation.y = (car.isGLB ? -Math.PI / 2 : 0) + Math.sin(time * 0.8) * TIMING.idleYawAmp;
}

/** Lean body into turns */
export function leanBody(car: CarModel, turnDirection: number): void {
  const targetLean = -turnDirection * TIMING.bodyLeanAngle;
  if (car.isGLB) {
    car.group.rotation.z = THREE.MathUtils.lerp(car.group.rotation.z, targetLean, 0.1);
  } else {
    car.body.rotation.z = THREE.MathUtils.lerp(car.body.rotation.z, targetLean, 0.1);
  }
}

/** Control headlight glow intensity (0 = off, 1 = full) */
export function setHeadlights(car: CarModel, intensity: number): void {
  for (const pl of car.headlightLights) {
    pl.intensity = intensity * 3;
  }

  /* Also adjust emissive on headlight meshes (procedural car) */
  if (!car.isGLB) {
    for (const hl of [car.headlightL, car.headlightR]) {
      if (hl instanceof THREE.Mesh && hl.material instanceof THREE.MeshStandardMaterial) {
        hl.material.emissiveIntensity = 0.3 + intensity * 2;
      }
    }
  }
}

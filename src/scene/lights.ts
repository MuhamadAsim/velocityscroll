/**
 * lights.ts — Scene lighting that transitions from sunrise to night.
 *
 * Three light sources:
 *   1. Directional "sun" — changes position, intensity, and color
 *   2. HemisphereLight — ambient fill
 *   3. Array of PointLights — "street lights" enabled at night
 *
 * All driven by scroll progress via `updateLights(progress)`.
 */

import * as THREE from 'three';

/* ── Lighting keyframes keyed to scroll progress ──────────────────── */

interface LightKey {
  progress: number;
  sunColor: string;
  sunIntensity: number;
  sunY: number;
  ambientSky: string;
  ambientGround: string;
  ambientIntensity: number;
}

const LIGHT_KEYS: LightKey[] = [
  { progress: 0.00, sunColor: '#FFF4E0', sunIntensity: 1.8, sunY: 30, ambientSky: '#87CEEB', ambientGround: '#B0C4DE', ambientIntensity: 0.5 },
  { progress: 0.35, sunColor: '#FFD080', sunIntensity: 1.5, sunY: 20, ambientSky: '#87CEEB', ambientGround: '#DEB887', ambientIntensity: 0.45 },
  { progress: 0.55, sunColor: '#FF8C42', sunIntensity: 1.0, sunY: 5,  ambientSky: '#FF6B35', ambientGround: '#8B4513', ambientIntensity: 0.3 },
  { progress: 0.70, sunColor: '#4A3080', sunIntensity: 0.3, sunY: -5, ambientSky: '#2D1B69', ambientGround: '#1A1040', ambientIntensity: 0.2 },
  { progress: 1.00, sunColor: '#B0C4DE', sunIntensity: 0.25, sunY: 15, ambientSky: '#0B0D1A', ambientGround: '#0F172A', ambientIntensity: 0.18 },
];

const STREET_LIGHT_ENABLE_PROGRESS = 0.55;
const STREET_LIGHT_SPACING = 20; // world units apart
const STREET_LIGHT_COUNT = 8;

/* ── Exports ──────────────────────────────────────────────────────── */

let sun: THREE.DirectionalLight;
let ambient: THREE.HemisphereLight;
const streetLights: THREE.PointLight[] = [];

const _colorA = new THREE.Color();
const _colorB = new THREE.Color();

export function createLights(scene: THREE.Scene): void {
  /* Sun */
  sun = new THREE.DirectionalLight(0xfff4e0, 1.8);
  sun.position.set(10, 30, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 80;
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  scene.add(sun);

  /* Hemisphere ambient */
  ambient = new THREE.HemisphereLight('#87CEEB', '#B0C4DE', 0.5);
  scene.add(ambient);

  /* Street lights (start invisible) */
  for (let i = 0; i < STREET_LIGHT_COUNT; i++) {
    const pl = new THREE.PointLight('#FFD080', 0, 15, 2);
    pl.position.set(-3, 5, -40 + i * STREET_LIGHT_SPACING);
    scene.add(pl);
    streetLights.push(pl);
  }
}

/**
 * Interpolate lighting between two keyframes based on scroll progress.
 */
export function updateLights(progress: number): void {
  /* Find surrounding keyframes */
  let a = LIGHT_KEYS[0];
  let b = LIGHT_KEYS[LIGHT_KEYS.length - 1];

  for (let i = 0; i < LIGHT_KEYS.length - 1; i++) {
    if (progress >= LIGHT_KEYS[i].progress && progress <= LIGHT_KEYS[i + 1].progress) {
      a = LIGHT_KEYS[i];
      b = LIGHT_KEYS[i + 1];
      break;
    }
  }

  const range = b.progress - a.progress || 1;
  const t = (progress - a.progress) / range;

  /* Sun */
  _colorA.set(a.sunColor);
  _colorB.set(b.sunColor);
  sun.color.copy(_colorA).lerp(_colorB, t);
  sun.intensity = THREE.MathUtils.lerp(a.sunIntensity, b.sunIntensity, t);
  sun.position.y = THREE.MathUtils.lerp(a.sunY, b.sunY, t);

  /* Ambient */
  _colorA.set(a.ambientSky);
  _colorB.set(b.ambientSky);
  ambient.color.copy(_colorA).lerp(_colorB, t);

  _colorA.set(a.ambientGround);
  _colorB.set(b.ambientGround);
  ambient.groundColor.copy(_colorA).lerp(_colorB, t);
  ambient.intensity = THREE.MathUtils.lerp(a.ambientIntensity, b.ambientIntensity, t);

  /* Street lights */
  const streetAlpha = progress >= STREET_LIGHT_ENABLE_PROGRESS
    ? Math.min((progress - STREET_LIGHT_ENABLE_PROGRESS) / 0.1, 1)
    : 0;

  for (const pl of streetLights) {
    pl.intensity = streetAlpha * 2.0;
  }
}


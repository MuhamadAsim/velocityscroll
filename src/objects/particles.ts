/**
 * particles.ts — Speed lines during travel, floating dots during idle.
 *
 * Uses a single THREE.Points system. Particle velocities increase
 * when the car is travelling and fade to gentle floats during settle.
 *
 * Particle count scales down on mobile via PERF config.
 */

import * as THREE from 'three';
import { PERF } from '../config';

/* ── State ────────────────────────────────────────────────────────── */

let points: THREE.Points;
let geometry: THREE.BufferGeometry;
let material: THREE.PointsMaterial;
let positions: Float32Array;
let velocities: Float32Array;
let count: number;

const SPREAD_X = 60;
const SPREAD_Y = 12;
const SPREAD_Z = 20;

/* ── Create ───────────────────────────────────────────────────────── */

export function createParticles(scene: THREE.Scene): void {
  const isMobile = window.innerWidth < PERF.mobileBreakpoint;
  count = isMobile ? PERF.particleCountMobile : PERF.particleCountDesktop;

  positions = new Float32Array(count * 3);
  velocities = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positions[i3]     = (Math.random() - 0.5) * SPREAD_X;
    positions[i3 + 1] = Math.random() * SPREAD_Y + 1;
    positions[i3 + 2] = (Math.random() - 0.5) * SPREAD_Z;

    velocities[i3]     = 0;
    velocities[i3 + 1] = (Math.random() - 0.5) * 0.005;
    velocities[i3 + 2] = 0;
  }

  geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  material = new THREE.PointsMaterial({
    color: '#FFFFFF',
    size: 0.15,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  points = new THREE.Points(geometry, material);
  points.name = 'particles';
  scene.add(points);
}

/* ── Update ───────────────────────────────────────────────────────── */

/**
 * @param travelIntensity 0 = idle (gentle float), 1 = full speed lines
 * @param carX            car's current X position (particles follow loosely)
 */
export function updateParticles(travelIntensity: number, carX: number): void {
  if (!points) return;

  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
  const speedFactor = 0.05 + travelIntensity * 0.4; // how fast lines move
  material.opacity = 0.15 + travelIntensity * 0.5;
  material.size = 0.1 + travelIntensity * 0.2;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;

    /* Speed lines move in -X direction (car moves +X) */
    positions[i3] -= speedFactor;
    /* Gentle vertical drift */
    positions[i3 + 1] += velocities[i3 + 1];
    /* Slight lateral drift */
    positions[i3 + 2] += (Math.random() - 0.5) * 0.01;

    /* Wrap around when off-screen */
    if (positions[i3] < carX - SPREAD_X / 2) {
      positions[i3] = carX + SPREAD_X / 2;
      positions[i3 + 1] = Math.random() * SPREAD_Y + 1;
      positions[i3 + 2] = (Math.random() - 0.5) * SPREAD_Z;
    }
  }

  posAttr.needsUpdate = true;
}

/* ── Cleanup ──────────────────────────────────────────────────────── */

export function disposeParticles(): void {
  geometry?.dispose();
  material?.dispose();
}


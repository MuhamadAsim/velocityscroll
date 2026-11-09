/**
 * camera.ts — PerspectiveCamera with smooth follow logic.
 *
 * The camera lerps toward a target position each frame to give a
 * slight-lag follow effect behind the car.
 */

import * as THREE from 'three';
import { TIMING } from '../config';

let camera: THREE.PerspectiveCamera;
const targetPos = new THREE.Vector3();
const targetLookAt = new THREE.Vector3();
const currentLookAt = new THREE.Vector3();

/** Default camera offset relative to the car */
const DEFAULT_OFFSET = new THREE.Vector3(6, 4, 8);

/**
 * Compute an adaptive vertical FOV that expands horizontal coverage on
 * narrow / portrait mobile viewports without fisheye distortion.
 */
export function getResponsiveFov(aspect: number): number {
  if (aspect >= 1.6) return 45;
  if (aspect < 1.0) {
    // Smoothly scale up from 48° to 58° for tall narrow phones
    const t = Math.max(0, Math.min(1, (1.0 - aspect) / 0.55));
    return THREE.MathUtils.lerp(48, 58, t);
  }
  // Transition between square (1.0) and widescreen (1.6)
  return THREE.MathUtils.lerp(48, 45, (aspect - 1.0) / 0.6);
}

export function createCamera(): THREE.PerspectiveCamera {
  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(
    getResponsiveFov(aspect),
    aspect,
    0.1,
    500,
  );
  camera.position.copy(DEFAULT_OFFSET);
  camera.lookAt(0, 0, 0);
  currentLookAt.set(0, 0, 0);
  return camera;
}

/** Call on window resize */
export function resizeCamera(): void {
  if (!camera) return;
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  camera.fov = getResponsiveFov(aspect);
  camera.updateProjectionMatrix();
}

/**
 * Set the desired camera position and look-at target.
 * The actual camera lerps toward these each frame via `updateCamera()`.
 */
export function setCameraTarget(
  position: THREE.Vector3,
  lookAt: THREE.Vector3,
): void {
  targetPos.copy(position);
  targetLookAt.copy(lookAt);
}

/**
 * Smoothly interpolate the camera toward its target.
 * Call once per render frame.
 */
export function updateCamera(): void {
  if (!camera) return;
  camera.position.lerp(targetPos, TIMING.cameraLag);
  currentLookAt.lerp(targetLookAt, TIMING.cameraLag);
  camera.lookAt(currentLookAt);
}

export function getCamera(): THREE.PerspectiveCamera {
  return camera;
}


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

export function createCamera(): THREE.PerspectiveCamera {
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
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
  camera.aspect = window.innerWidth / window.innerHeight;
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


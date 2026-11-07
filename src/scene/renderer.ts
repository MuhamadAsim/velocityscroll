/**
 * renderer.ts — Creates and manages the WebGL renderer.
 *
 * - Caps devicePixelRatio at PERF.maxDpr
 * - Disables shadows on mobile
 * - Handles window resize
 * - Provides dispose() for cleanup
 */

import * as THREE from 'three';
import { PERF } from '../config';

let renderer: THREE.WebGLRenderer;
const isMobile = () => window.innerWidth < PERF.mobileBreakpoint;

export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });

  const dpr = Math.min(window.devicePixelRatio, PERF.maxDpr);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  /* Enable shadows on desktop only */
  if (!isMobile() || PERF.shadowsOnMobile) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  return renderer;
}

/** Call on window resize (debounced externally) */
export function resizeRenderer(): void {
  if (!renderer) return;
  const dpr = Math.min(window.devicePixelRatio, PERF.maxDpr);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);

  /* Toggle shadows on breakpoint change */
  renderer.shadowMap.enabled = !isMobile() || PERF.shadowsOnMobile;
}

export function getRenderer(): THREE.WebGLRenderer {
  return renderer;
}

export function disposeRenderer(): void {
  renderer?.dispose();
}


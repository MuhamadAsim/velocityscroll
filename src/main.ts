/**
 * main.ts — Entry point for SwiftHaul Auto Logistics.
 *
 * Initialization order:
 *   1. Lenis (smooth scroll)
 *   2. Scene (renderer, camera, lights)
 *   3. Objects (car, road, background, particles)
 *   4. UI sections (DOM)
 *   5. Quote form
 *   6. GSAP master timeline
 *   7. Render loop
 *   8. Hide loading screen
 *
 * The render loop reads from the timeline's progress store and
 * applies values to Three.js objects every frame.
 */

import * as THREE from 'three';

/* Scene */
import { createRenderer, resizeRenderer, getRenderer, disposeRenderer } from './scene/renderer';
import { createCamera, resizeCamera, getCamera, setCameraTarget, updateCamera } from './scene/camera';
import { createLights, updateLights } from './scene/lights';

/* Objects */
import { loadCar, spinWheels, idleFloat, leanBody, setHeadlights, disposeCar, CarModel } from './objects/car';
import { createRoad, updateRoad, disposeRoad } from './objects/road';
import { createBackground, updateBackground, disposeBackground } from './objects/background';
import { createParticles, updateParticles, disposeParticles } from './objects/particles';

/* Animation */
import { initLenis, destroyLenis } from './animation/lenis';
import { createTimeline, store, getCarXDelta, destroyTimeline } from './animation/timeline';

/* UI */
import { createSections } from './ui/sections';
import { createQuoteForm } from './ui/quoteForm';

/* ── Global state ─────────────────────────────────────────────────── */

let scene: THREE.Scene;
let car: CarModel;
let clock: THREE.Clock;

/* ── Init ─────────────────────────────────────────────────────────── */

async function init(): Promise<void> {
  const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
  if (!canvas) throw new Error('Canvas not found');

  /* 1. Smooth scroll */
  initLenis();

  /* 2. Scene */
  scene = new THREE.Scene();
  createRenderer(canvas);
  createCamera();
  createLights(scene);

  /* 3. Objects */
  car = await loadCar();
  scene.add(car.group);

  createRoad(scene);
  createBackground(scene);
  createParticles(scene);

  /* 4. UI sections */
  createSections();

  /* 5. Quote form */
  createQuoteForm();

  /* 6. Master timeline */
  createTimeline();

  /* 7. Clock & render loop */
  clock = new THREE.Clock();
  startRenderLoop();

  /* 8. Hide loading screen */
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
  }

  /* Handle resize */
  window.addEventListener('resize', onResize);
}

/* ── Render loop ──────────────────────────────────────────────────── */

function startRenderLoop(): void {
  const renderer = getRenderer();
  const camera = getCamera();

  function frame(): void {
    requestAnimationFrame(frame);

    const elapsed = clock.getElapsedTime();
    const progress = store.scrollProgress;

    /* ── Car position ─────────────────────────────────────────────── */
    car.group.position.x = store.carX;

    /* ── Wheel spin (proportional to distance delta) ──────────────── */
    const carXDelta = getCarXDelta();
    spinWheels(car, carXDelta);

    /* ── Idle float (always subtle, stronger when not travelling) ── */
    const idleStrength = 1 - store.travelIntensity;
    if (idleStrength > 0.1) {
      idleFloat(car, elapsed);
    } else {
      /* Reset idle when travelling */
      if (car.isGLB) {
        car.group.position.y = 0.35;
        car.group.rotation.y = Math.PI / 2;
      } else {
        car.body.position.y = 0.7;
        car.group.rotation.y = 0;
      }
    }

    /* ── Body lean in turns ───────────────────────────────────────── */
    leanBody(car, store.turnDirection);

    /* ── Headlights ───────────────────────────────────────────────── */
    setHeadlights(car, store.headlights);

    /* ── Camera ───────────────────────────────────────────────────── */
    const camTarget = new THREE.Vector3(
      store.carX + store.camOffsetX,
      store.camOffsetY,
      store.camOffsetZ,
    );
    const lookTarget = new THREE.Vector3(
      store.carX + store.camLookAheadX,
      1,
      0,
    );
    setCameraTarget(camTarget, lookTarget);
    updateCamera();

    /* ── Road ─────────────────────────────────────────────────────── */
    updateRoad(store.carX);

    /* ── Background & lighting ────────────────────────────────────── */
    updateBackground(progress, store.carX);
    updateLights(progress);

    /* ── Particles ────────────────────────────────────────────────── */
    updateParticles(store.travelIntensity, store.carX);

    /* ── Render ────────────────────────────────────────────────────── */
    renderer.render(scene, camera);
  }

  frame();
}

/* ── Resize handler (debounced) ───────────────────────────────────── */

let resizeTimer: ReturnType<typeof setTimeout>;

function onResize(): void {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    resizeRenderer();
    resizeCamera();
  }, 150);
}

/* ── Cleanup (for Vite HMR) ───────────────────────────────────────── */

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.removeEventListener('resize', onResize);
    destroyTimeline();
    destroyLenis();
    disposeCar(car);
    disposeRoad();
    disposeBackground();
    disposeParticles();
    disposeRenderer();
  });
}

/* ── Bootstrap ────────────────────────────────────────────────────── */

init().catch((err) => {
  console.error('[SwiftHaul] Init failed:', err);
});

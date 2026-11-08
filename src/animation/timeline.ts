/**
 * timeline.ts — Master GSAP timeline scrubbed by scroll progress.
 *
 * One ScrollTrigger controls a single timeline. Scroll progress (0–1)
 * is mapped to the timeline's playhead. Scrolling back reverses everything.
 *
 * ## How it works
 *
 * Instead of directly animating Three.js objects inside GSAP tweens
 * (which would require GSAP to know about Three.js internals), we
 * animate a plain "progress store" object. The render loop reads
 * these values each frame and applies them to the 3D scene.
 *
 * This keeps the timeline declarative and the render loop imperative.
 *
 * ## Stage layout (see config.STAGES for boundaries)
 *
 * | Stage    | Car X travel | Camera angle      | Notes               |
 * |----------|-------------|-------------------|---------------------|
 * | hero     | 0           | front-quarter     | idle float          |
 * | travel-1 | 0 → 40      | side follow       | wheels spin, lines  |
 * | stop-1   | 40          | hold              | card, idle          |
 * | travel-2 | 40 → 80     | rear-quarter      | sunset transition   |
 * | stop-2   | 80          | hold              | card, idle          |
 * | finale   | 80 → 85     | wide front        | park, form          |
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { STAGES, TIMING } from '../config';
import { prefersReducedMotion } from './lenis';

gsap.registerPlugin(ScrollTrigger);

/* ── Progress store — the render loop reads these each frame ──────── */

export interface ProgressStore {
  /** Car position along the road (world X units) */
  carX: number;
  /** How much the car moved since the last timeline position (for wheel spin) */
  carXPrev: number;
  /** 0 = idle, 1 = full speed (used for particles, speed lines) */
  travelIntensity: number;
  /** Camera offset from car */
  camOffsetX: number;
  camOffsetY: number;
  camOffsetZ: number;
  /** Camera look-at offset from car */
  camLookAheadX: number;
  /** Headlight intensity 0–1 */
  headlights: number;
  /** Turn direction for body lean: -1 left, 0 straight, 1 right */
  turnDirection: number;
  /** Raw scroll progress 0–1 */
  scrollProgress: number;
}

export const store: ProgressStore = {
  carX: 0,
  carXPrev: 0,
  travelIntensity: 0,
  camOffsetX: 6,
  camOffsetY: 4,
  camOffsetZ: 8,
  camLookAheadX: 2,
  headlights: 0,
  turnDirection: 0,
  scrollProgress: 0,
};

/* ── Car travel endpoints (world X units) ─────────────────────────── */

const CAR_X_STOP1 = 40;
const CAR_X_STOP2 = 80;
const CAR_X_FINAL = 85;

/* ── Build the master timeline ────────────────────────────────────── */

let masterTimeline: gsap.core.Timeline | null = null;

export function createTimeline(): gsap.core.Timeline | null {
  if (prefersReducedMotion) {
    console.info('[SwiftHaul] Reduced motion — no scroll timeline.');
    return null;
  }

  const totalDur = TIMING.totalDuration;
  masterTimeline = gsap.timeline({ paused: true });

  /**
   * Helper: convert a config stage range (0–1) to timeline seconds.
   */
  const stageStart = (s: keyof typeof STAGES) => STAGES[s].start * totalDur;
  const stageDur = (s: keyof typeof STAGES) =>
    (STAGES[s].end - STAGES[s].start) * totalDur;

  /* ────────────────────────────────────────────────────────────────
   * HERO (0.00 – 0.12): car at X=0, default camera
   * Idle float is handled in the render loop — nothing to tween here
   * except a gentle travelIntensity of 0.
   * ──────────────────────────────────────────────────────────────── */
  masterTimeline.set(store, { travelIntensity: 0 }, stageStart('hero'));

  /* ────────────────────────────────────────────────────────────────
   * TRAVEL 1 (0.12 – 0.32): car drives from 0 → 40
   * Camera moves to a side-follow position.
   * ──────────────────────────────────────────────────────────────── */
  masterTimeline.to(
    store,
    {
      carX: CAR_X_STOP1,
      travelIntensity: 1,
      camOffsetX: 5,
      camOffsetY: 3,
      camOffsetZ: 7,
      camLookAheadX: 4,
      turnDirection: 0.3,
      duration: stageDur('travel1'),
      ease: 'none',
    },
    stageStart('travel1'),
  );

  /* ────────────────────────────────────────────────────────────────
   * STOP 1 (0.32 – 0.45): car holds at X=40
   * travelIntensity eases to 0. Camera settles.
   * ──────────────────────────────────────────────────────────────── */
  masterTimeline.to(
    store,
    {
      travelIntensity: 0,
      turnDirection: 0,
      camOffsetX: 6,
      camOffsetY: 4,
      camOffsetZ: 8,
      camLookAheadX: 2,
      duration: stageDur('stop1') * 0.4,
      ease: 'power1.out',
    },
    stageStart('stop1'),
  );

  /* ────────────────────────────────────────────────────────────────
   * TRAVEL 2 (0.45 – 0.65): car drives 40 → 80
   * Camera swings to rear-quarter view. Headlights start at ~0.58.
   * ──────────────────────────────────────────────────────────────── */
  masterTimeline.to(
    store,
    {
      carX: CAR_X_STOP2,
      travelIntensity: 1,
      camOffsetX: -4,
      camOffsetY: 3.5,
      camOffsetZ: 9,
      camLookAheadX: -3,
      turnDirection: -0.2,
      duration: stageDur('travel2'),
      ease: 'none',
    },
    stageStart('travel2'),
  );

  /* Headlights on partway through travel 2 */
  masterTimeline.to(
    store,
    {
      headlights: 1,
      duration: stageDur('travel2') * 0.2,
      ease: 'power2.in',
    },
    stageStart('travel2') + stageDur('travel2') * 0.6,
  );

  /* ────────────────────────────────────────────────────────────────
   * STOP 2 (0.65 – 0.78): car holds at X=80
   * ──────────────────────────────────────────────────────────────── */
  masterTimeline.to(
    store,
    {
      travelIntensity: 0,
      turnDirection: 0,
      camOffsetX: 5,
      camOffsetY: 4,
      camOffsetZ: 8,
      camLookAheadX: 2,
      duration: stageDur('stop2') * 0.4,
      ease: 'power1.out',
    },
    stageStart('stop2'),
  );

  /* ────────────────────────────────────────────────────────────────
   * FINALE (0.78 – 1.00): car rolls to final park at X=85
   * Camera goes to a wider angle. "Delivered" state.
   * ──────────────────────────────────────────────────────────────── */
  masterTimeline.to(
    store,
    {
      carX: CAR_X_FINAL,
      travelIntensity: 0.3,
      camOffsetX: 7,
      camOffsetY: 5,
      camOffsetZ: 10,
      camLookAheadX: 3,
      turnDirection: 0,
      duration: stageDur('finale') * 0.5,
      ease: 'power1.out',
    },
    stageStart('finale'),
  );

  /* Ease to full stop */
  masterTimeline.to(
    store,
    {
      travelIntensity: 0,
      duration: stageDur('finale') * 0.3,
      ease: 'power1.out',
    },
    stageStart('finale') + stageDur('finale') * 0.5,
  );

  /* ────────────────────────────────────────────────────────────────
   * SCROLL TRIGGER — scrubs the master timeline by scroll position
   * ──────────────────────────────────────────────────────────────── */
  ScrollTrigger.create({
    trigger: '#scroll-container',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.2, // smooth scrub duration in seconds
    animation: masterTimeline,
    onUpdate(self) {
      store.scrollProgress = self.progress;
    },
  });

  /* Keep store.scrollProgress in sync on every tick of the scrubbed timeline */
  masterTimeline.eventCallback('onUpdate', () => {
    store.scrollProgress = masterTimeline!.progress();
  });

  return masterTimeline;
}

/**
 * Call each frame before rendering to compute carX delta.
 * Returns the delta so the caller can spin wheels proportionally.
 */
export function getCarXDelta(): number {
  const delta = store.carX - store.carXPrev;
  store.carXPrev = store.carX;
  return delta;
}

export function destroyTimeline(): void {
  masterTimeline?.kill();
  ScrollTrigger.getAll().forEach((st) => st.kill());
}

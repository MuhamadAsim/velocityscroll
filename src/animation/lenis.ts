/**
 * lenis.ts — Smooth-scroll with Lenis, bridged to GSAP ScrollTrigger.
 *
 * Lenis handles smooth scrolling; its scroll position is fed into
 * ScrollTrigger so both systems agree on progress.
 *
 * Skipped entirely when prefers-reduced-motion is enabled.
 */

import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

/** True if the user prefers reduced motion */
export const prefersReducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initLenis(): void {
  if (prefersReducedMotion) {
    console.info('[SwiftHaul] Reduced motion — skipping Lenis.');
    return;
  }

  lenis = new Lenis({
    lerp: 0.08,
    smoothWheel: true,
  });

  /* Bridge: pipe Lenis scroll position into ScrollTrigger */
  lenis.on('scroll', ScrollTrigger.update);

  /* Use GSAP ticker so Lenis runs on rAF via GSAP's loop */
  gsap.ticker.add((time: number) => {
    lenis?.raf(time * 1000); // Lenis expects ms
  });

  gsap.ticker.lagSmoothing(0);
}

export function getLenis(): Lenis | null {
  return lenis;
}

export function destroyLenis(): void {
  lenis?.destroy();
  lenis = null;
}


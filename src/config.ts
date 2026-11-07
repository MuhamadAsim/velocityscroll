/**
 * config.ts — Single source of truth for brand, routes, copy, colors, and timing.
 *
 * Change the brand name, route cities, or scroll-stage boundaries here
 * and the rest of the app adapts automatically.
 */

/* ── Brand ─────────────────────────────────────────────────────────── */

export const BRAND = {
  name: 'SwiftHaul Auto Logistics',
  tagline: 'Your car. Any city. Delivered safe.',
  ctaText: 'Get a Free Quote',
} as const;

/* ── Route ─────────────────────────────────────────────────────────── */

export interface RouteStop {
  city: string;
  label: string; // card heading at this stop
  description: string; // card body
}

export const ROUTE: RouteStop[] = [
  {
    city: 'Karachi',
    label: 'Pickup in Karachi',
    description: 'We collect your car right from your doorstep — no drop-off needed.',
  },
  {
    city: 'Lahore',
    label: 'Door-to-Door Pickup',
    description:
      'Our enclosed carriers protect your car from weather, dust, and road debris across every kilometre.',
  },
  {
    city: 'Islamabad',
    label: 'Real-Time Tracking & Insurance',
    description:
      'Track your shipment live on the map. Every vehicle is fully insured from pickup to delivery.',
  },
];

/* ── Scroll stage ranges (progress 0–1) ────────────────────────────── */

export const STAGES = {
  hero:     { start: 0.00, end: 0.12 },
  travel1:  { start: 0.12, end: 0.32 },
  stop1:    { start: 0.32, end: 0.45 },
  travel2:  { start: 0.45, end: 0.65 },
  stop2:    { start: 0.65, end: 0.78 },
  finale:   { start: 0.78, end: 1.00 },
} as const;

export type StageName = keyof typeof STAGES;

/* ── Scroll container height (in vh units) ─────────────────────────── */

export const SCROLL_HEIGHT_VH = 600;

/* ── Colors ────────────────────────────────────────────────────────── */

export const COLORS = {
  brand: {
    primary: '#1a3a5c',   // navy
    accent: '#3b82f6',    // electric blue
    white: '#f8fafc',
    dark: '#0f172a',
  },
  car: {
    body: '#dc2626',      // sporty red
    cabin: '#1e293b',     // dark tint
    wheel: '#334155',
    headlight: '#fbbf24', // amber glow
  },
  /** Sky gradient keyframes keyed to scroll progress */
  sky: [
    { progress: 0.00, top: '#87CEEB', bottom: '#E0F0FF', fog: '#C8E6FF' },
    { progress: 0.30, top: '#5BA3D9', bottom: '#FCEABB', fog: '#D4C5A0' },
    { progress: 0.55, top: '#F97316', bottom: '#7C3AED', fog: '#9B6B3D' },
    { progress: 0.70, top: '#2D1B69', bottom: '#0F172A', fog: '#1A1040' },
    { progress: 1.00, top: '#0B0D1A', bottom: '#0F172A', fog: '#0A0C18' },
  ] as { progress: number; top: string; bottom: string; fog: string }[],
  road: '#374151',
  roadLine: '#fbbf24',
} as const;

/* ── Performance ───────────────────────────────────────────────────── */

export const PERF = {
  maxDpr: 2,
  particleCountDesktop: 200,
  particleCountMobile: 60,
  mobileBreakpoint: 768, // px
  shadowsOnMobile: false,
} as const;

/* ── Animation timing constants (seconds within the GSAP timeline) ── */

export const TIMING = {
  /** Total timeline duration mapped to scroll (arbitrary, GSAP scales to scroll) */
  totalDuration: 100,
  /** Idle float amplitude (world units) */
  idleFloatY: 0.06,
  /** Idle yaw amplitude (radians) */
  idleYawAmp: 0.04,
  /** Wheel spin speed multiplier relative to forward distance */
  wheelSpinFactor: 4,
  /** Camera follow lag (lerp factor per frame) */
  cameraLag: 0.08,
  /** Body lean angle in turns (radians) */
  bodyLeanAngle: 0.06,
} as const;

/* ── Quote form field options ──────────────────────────────────────── */

export const CITIES = ROUTE.map((r) => r.city);

# AGENTS.md — AI Agent & Developer Guidelines

> This document defines architectural patterns, coordinate conventions, and execution rules for AI assistants (Antigravity, Cursor, Claude Code, Copilot) and human developers modifying the **SwiftHaul / VelocityScroll** codebase.

---

## 1. Core Architecture Principles

### The Two-Layer Paradigm
The application separates visual rendering from scroll mechanics:
1. **Layer 1 (3D WebGL Canvas)**: Fixed full-screen Three.js canvas (`#scene-canvas`) at `z-index: 0`. Renders at 60 / 120 FPS via `requestAnimationFrame`.
2. **Layer 2 (Foreground HTML DOM)**: Tall scroll container (`#scroll-container`, `600vh`) with `pointer-events: none` on sections and `pointer-events: auto` on interactive cards and buttons.

### The "Progress Store" State Pattern
**CRITICAL RULE: Never mutate Three.js matrices or object positions directly from scroll event listeners.**
* GSAP ScrollTrigger scrubs numeric values inside the shared `store` object defined in [`src/animation/timeline.ts`](file:///c:/Users/ranah/Desktop/projects/3d-web/src/animation/timeline.ts) (`carX`, `camOffsetX`, `headlights`, `travelIntensity`, etc.).
* The imperative render loop in [`src/main.ts`](file:///c:/Users/ranah/Desktop/projects/3d-web/src/main.ts) reads `store` each frame, applies smooth damping via `THREE.MathUtils.lerp`, and updates 3D meshes.
* This decouples discrete mousewheel input ticks from frame rendering, preventing jitter and stutter.

---

## 2. World Coordinate System & Road Geometry

Three.js uses a right-handed coordinate system:

| Axis | World Semantic | Direction |
|---|---|---|
| **+X** | **Highway Travel Direction** | Car moves forward along positive X (from `x = 0` to `x = 85`). |
| **+Y** | **Vertical Elevation / Up** | Ground level is `y = 0`. Car base sits at `y = 0.35`. |
| **+Z** | **Camera / User Side** | Camera sits at `+Z` (`z = 7 to 10`), looking toward the car. |
| **-Z** | **Far / North Side** | Background, mountains, city skyline, and 3D trees sit at `-Z`. |

### Crucial Spatial Rules
1. **No Obstructions on `+Z`**: Never place trees, signposts, or terrain hills on the positive Z side of the road (`z > roadPt.z`). Doing so places objects between the camera lens and the car, blocking the vehicle from view.
2. **Road Curves (`getRoadPoint(x)`)**:
   * All highway geometry, dashes, gantries, trees, and car physics MUST query [`getRoadPoint(x)`](file:///c:/Users/ranah/Desktop/projects/3d-web/src/objects/road.ts).
   * Returns `{ x, z, angle, curvature }`.
   * **Car Yaw**: `car.group.rotation.y = (car.isGLB ? -Math.PI / 2 : 0) - roadPt.angle`.
   * **Centrifugal Body Lean**: `leanBody(car, roadPt.curvature * 25.0 + store.turnDirection)`.
3. **Flat Corridor Padding**:
   * Terrain in [`src/objects/background.ts`](file:///c:/Users/ranah/Desktop/projects/3d-web/src/objects/background.ts) MUST evaluate `distFromRoad = Math.abs(z - roadPt.z)`.
   * Keep a minimum safe flat corridor (`distFromRoad <= 8.5`) at `y = -0.06` so terrain meshes never clip through the asphalt.
   * `terrainMesh` MUST have `position.set(0, 0, 0)` so local grid vertices match world coordinates without coordinate shift.

---

## 3. 3D Model Asset Pipeline & Fallbacks

* Models reside in `public/models/`.
* **Car Loader** ([`src/objects/car.ts`](file:///c:/Users/ranah/Desktop/projects/3d-web/src/objects/car.ts)):
  * Attempts to load `/models/car.glb`.
  * Looks up named subnodes: `body`, `glass`, `wheel_fl`, `wheel_fr`, `wheel_rl`, `wheel_rr`, `lights`.
  * If the file is missing or invalid, gracefully falls back to `buildProceduralCar()`.
  * **Wheel Roll Axis**: For the Ferrari GLB, roll axis is `w.rotation.x -= angle`. For procedural car, it is `w.rotation.z -= angle`.
* **Tree Loader** ([`src/objects/background.ts`](file:///c:/Users/ranah/Desktop/projects/3d-web/src/objects/background.ts)):
  * Attempts to load `/models/tree-my.glb`, then `/models/tree.glb`.
  * Computes bounding box, normalizes base pivot to `y = 0`, and scales to `~6.0` world units.
  * Clones are placed strictly on the far roadside (`z < roadPt.z`).

---

## 4. Animation & Timeline Rules

* **Master Timeline**: Created in [`src/animation/timeline.ts`](file:///c:/Users/ranah/Desktop/projects/3d-web/src/animation/timeline.ts).
* **ScrollTrigger Connection**:
  ```typescript
  ScrollTrigger.create({
    trigger: '#scroll-container',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.2,
    animation: masterTimeline,
  });
  ```
* **Linear Travel Tweens**:
  * In scrubbed timelines, travel tweens MUST use `ease: 'none'` (linear). Non-linear eases (`power1.inOut`) cause unnatural acceleration curves inside stages while scrolling.
  * Lenis + `scrub: 1.2` provides all necessary momentum and deceleration physics.
* **Lenis Sync**:
  * Lenis is driven by GSAP's ticker: `gsap.ticker.add((time) => { lenis.raf(time * 1000); });`.
  * `autoRaf: false` MUST be set on the Lenis instance.

---

## 5. Coding Standards & Conventions

1. **No Magic Numbers**:
   * All brand copy, city names, scroll stage boundaries, sky color stops, and perf constants live in [`src/config.ts`](file:///c:/Users/ranah/Desktop/projects/3d-web/src/config.ts).
2. **Resource Disposal (Vite HMR)**:
   * Always provide `dispose()` methods on geometries and materials to avoid WebGL context leaks during development (`import.meta.hot.dispose`).
3. **TypeScript Strict Mode**:
   * The project compiles with `strict: true`, `noUnusedLocals: true`, and `noUnusedParameters: true`.
   * Unused variables will fail the build (`npx tsc --noEmit`).

---

## 6. Build & Verification Commands

```bash
# Type check without emitting files
npx tsc --noEmit

# Production bundle check
npm run build

# Start local development server
npm run dev
```


# SwiftHaul Auto Logistics 🚗💨
> **Scroll-Driven 3D International Car Shipping Web Experience**

[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r170-black?style=flat&logo=three.js&logoColor=white)](https://threejs.org/)
[![GSAP](https://img.shields.io/badge/GSAP-3.12-88CE02?style=flat&logo=greensock&logoColor=white)](https://gsap.com/)
[![Lenis](https://img.shields.io/badge/Lenis-1.1-FF4081?style=flat)](https://lenis.darkroom.engineering/)

A cutting-edge, scroll-driven 3D web experience built with **Three.js**, **GSAP ScrollTrigger**, and **Lenis Smooth Scroll**. As the user scrolls, a sports car navigates an overland international route across **Pakistan 🇵🇰 → Iran 🇮🇷 → Azerbaijan 🇦🇿**, passing through border checkpoints, dynamic lighting transitions (morning ➔ golden sunset ➔ night with glowing city windows and starry skies), and responsive 3D physics.

---

## 🌟 Key Features

* **Scroll-Driven 3D Journey**: Single full-screen fixed `<canvas>` layered behind a `600vh` DOM container. Scrubbing back and forth rewinds and plays the entire 3D journey in real time.
* **Curved Highway & Vehicle Physics**: The road follows an organic S-curve path. The car automatically steers into every turn (`rotation.y`) and banks with centrifugal body lean.
* **International Checkpoint Gantries**: 3D overhead highway archways and roadside milestone boards complete with high-resolution National Flags (Pakistan 🇵🇰, Iran 🇮🇷, Azerbaijan 🇦🇿), gateway codes, and night spotlights.
* **Real 3D GLB Models**:
  * **Ferrari Sports Car** (`public/models/car.glb`) with independent wheel spinning, suspension lean, and headlights.
  * **3D Oak Trees** (`public/models/tree-my.glb`) flanking the highway on the far roadside without obstructing the camera view.
  * **Automatic Procedural Fallbacks**: Procedural low-poly meshes load seamlessly if any 3D model file is missing.
* **Procedural Architectural City Skyline & Mountains**:
  * In-memory canvas-generated skyscraper textures with glowing night windows that illuminate at dusk.
  * Sculpted distant mountain ranges providing multi-depth parallax separation.
* **Dynamic Time-of-Day Lighting**: Seamless transition from warm morning sunlight to low orange sunset and dark midnight blue with highway streetlights and flashing rooftop aviation beacons.
* **Fluid 60 / 120 FPS Momentum**: Powered by Lenis smooth scrolling piped directly into GSAP's ticker and smoothed with render-loop lerp damping (`THREE.MathUtils.lerp`).
* **Zero Magic Numbers**: Single configuration file (`src/config.ts`) driving brand copy, cities, colors, stage percentages, and performance settings.
* **Accessibility & Responsiveness**:
  * Mobile optimizations: DPR capped at 2, mobile shadow toggle (`<768px`), and reduced particle count.
  * Respects `prefers-reduced-motion` media queries.
  * Accessible quote form with real-time validation and ARIA live regions.

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| **Build & Bundler** | [Vite 6](https://vite.dev/) |
| **Language** | [TypeScript 5.7](https://www.typescriptlang.org/) (Strict Mode) |
| **3D Rendering** | [Three.js r170](https://threejs.org/) (`WebGLRenderer`, `GLTFLoader`, `DRACOLoader`, custom shaders) |
| **Animation Choreography** | [GSAP 3.12](https://gsap.com/) & [ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) |
| **Smooth Scrolling** | [Lenis 1.1](https://lenis.darkroom.engineering/) |
| **Styling** | Vanilla CSS3 (CSS Variables, Glassmorphism `backdrop-filter`, Fluid Typography) |
| **Deployment** | [Netlify](https://www.netlify.com/) (`netlify.toml` pre-configured) |

---

## 🚀 Quick Start

### Prerequisites
* **Node.js** (v18.0.0 or higher recommended)
* **npm** or **pnpm**

### Installation

```bash
# 1. Clone repository
git clone https://github.com/MuhamadAsim/velocityscroll.git
cd velocityscroll

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open **`http://localhost:5173/`** in your browser.

### Production Build

```bash
# Type check and bundle for production
npm run build

# Preview production build locally
npm run preview
```

---

## 📂 Project Architecture

```
3d-web/
├── index.html               # Canvas anchor + scroll wrapper
├── netlify.toml             # Netlify deployment & caching configuration
├── package.json             # Dependencies and build scripts
├── tsconfig.json            # TypeScript compiler options
├── vite.config.ts           # Vite build configuration
├── public/
│   └── models/              # 3D GLB assets (car.glb, tree-my.glb)
└── src/
    ├── main.ts              # Application entry, init sequence, and 60fps render loop
    ├── config.ts            # Single source of truth (brand, route, colors, timings)
    ├── scene/
    │   ├── renderer.ts      # WebGLRenderer, DPR cap, mobile shadow handling
    │   ├── camera.ts        # PerspectiveCamera with lerped follow logic
    │   └── lights.ts        # Dynamic sun, hemisphere fill, and night street lights
    ├── objects/
    │   ├── car.ts           # GLB loader, wheel rotation, body lean, headlights
    │   ├── road.ts          # S-curve road geometry, yellow dashes, 3D country gantries
    │   ├── background.ts    # Sky dome shader, mountain ridges, city skyline, 3D trees
    │   └── particles.ts     # Particle speed lines and idle atmospheric dust
    ├── animation/
    │   ├── timeline.ts      # Master GSAP timeline with labeled stages & progress store
    │   └── lenis.ts         # Lenis smooth-scroll bridge to GSAP ScrollTrigger
    ├── ui/
    │   ├── sections.ts      # DOM story cards, country pills, IntersectionObserver
    │   └── quoteForm.ts     # Interactive quote form with client-side validation
    └── styles/
        └── main.css         # CSS variables, layout, glassmorphism, responsive queries
```

---

## 🗺️ Scroll Journey Stages

| Stage | Progress | Description |
|---|---|---|
| **Hero (Pakistan 🇵🇰)** | `0.00 – 0.12` | Car parked at Pakistan origin gateway. Morning sunlight, headline, route pill, and CTA. |
| **Travel 1** | `0.12 – 0.32` | Highway acceleration through mountain S-curves. Wheels spin, speed lines flare, sky transitions to afternoon. |
| **Stop 1 (Iran 🇮🇷)** | `0.32 – 0.45` | Car settles at Iran transit checkpoint arch. "Cross-Border Transit" milestone card reveals. |
| **Travel 2** | `0.45 – 0.65` | Sunset drive. Camera angle pivots to rear quarter. Headlights ignite, evening dusk sets in. |
| **Stop 2 (Azerbaijan 🇦🇿)**| `0.65 – 0.78` | Car arrives at Baku terminal under night sky, street lights, and illuminated skyline windows. |
| **Finale** | `0.78 – 1.00` | Car rolls into safe delivery bay. "Delivered" badge shines, interactive quote form slides up. |

---

## ⚙️ Customization Guide

All parameters are configured in [`src/config.ts`](file:///c:/Users/ranah/Desktop/projects/3d-web/src/config.ts):

### 1. Renaming Brand & Taglines
```typescript
export const BRAND = {
  name: 'SwiftHaul Auto Logistics',
  tagline: 'Your car. Any city. Delivered safe.',
  ctaText: 'Get a Free Quote',
};
```

### 2. Changing Route & Checkpoints
```typescript
export const ROUTE: RouteStop[] = [
  { city: 'Pakistan', flag: '🇵🇰', label: 'Origin — Pakistan 🇵🇰', ... },
  { city: 'Iran', flag: '🇮🇷', label: 'Transit Corridor — Iran 🇮🇷', ... },
  { city: 'Azerbaijan', flag: '🇦🇿', label: 'Destination — Azerbaijan 🇦🇿', ... },
];
```

### 3. Swapping 3D Car Model
Drop any `.glb` file into `public/models/car.glb`. For animated parts, name sub-meshes inside your 3D software:
* `body` — Main vehicle chassis
* `glass` or `cabin` — Windows / roof
* `wheel_fl`, `wheel_fr`, `wheel_rl`, `wheel_rr` — Wheels
* `lights` — Headlight meshes

If any name is omitted or the file is missing, the procedural car activates automatically.

---

## 🌐 Deployment to Netlify

### Option 1: Git Integration (Continuous Deployment)
1. Push this repository to GitHub.
2. Link your repository in the [Netlify Dashboard](https://app.netlify.com/).
3. Netlify will auto-detect [`netlify.toml`](file:///c:/Users/ranah/Desktop/projects/3d-web/netlify.toml) and deploy instantly.

### Option 2: Drag & Drop (Netlify Drop)
1. Run `npm run build` to generate the `dist/` directory.
2. Go to **[app.netlify.com/drop](https://app.netlify.com/drop)**.
3. Drag the **`dist`** folder into the browser box to go live in 10 seconds.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).


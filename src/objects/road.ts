/**
 * road.ts — Curved highway with gentle S-curves, asphalt surface,
 * animated lane markings, and 3D country milestone checkpoint gantries:
 *   1. Pakistan 🇵🇰 (Origin — x = 0)
 *   2. Iran 🇮🇷     (Transit — x = 40)
 *   3. Azerbaijan 🇦🇿 (Destination — x = 80)
 */

import * as THREE from 'three';
import { COLORS } from '../config';

/* ── Curve Mathematics ────────────────────────────────────────────── */

export interface RoadPoint {
  x: number;
  z: number;
  angle: number; // yaw angle in radians relative to +X
  curvature: number; // rate of turn (for body lean physics)
}

/**
 * Computes road centerline coordinate, tangent angle, and curvature at any X.
 * Uses a smooth combination of sines for natural highway sweeping S-curves.
 */
export function getRoadPoint(x: number): RoadPoint {
  // Gentle S-curves: amplitude ~5.2 units, wavelength ~115 units
  const z = Math.sin(x * 0.055) * 5.2 + Math.sin(x * 0.02) * 2.6;
  const dz = 0.055 * 5.2 * Math.cos(x * 0.055) + 0.02 * 2.6 * Math.cos(x * 0.02);
  const d2z =
    -0.055 * 0.055 * 5.2 * Math.sin(x * 0.055) -
    0.02 * 0.02 * 2.6 * Math.sin(x * 0.02);

  const angle = Math.atan2(dz, 1.0);
  return { x, z, angle, curvature: d2z };
}

/* ── Road Parameters ──────────────────────────────────────────────── */

const ROAD_WIDTH = 9.2;
const ROAD_START_X = -90;
const ROAD_END_X = 230;
const ROAD_LENGTH = ROAD_END_X - ROAD_START_X;
const ROAD_SEGMENTS = 200;

const DASH_COUNT = 55;
const DASH_LENGTH = 2.0;
const DASH_WIDTH = 0.18;
const DASH_SPACING = 5.0; // distance between dash centers

/* ── State ────────────────────────────────────────────────────────── */

let roadGroup: THREE.Group;
const dashes: { mesh: THREE.Mesh; baseOffset: number }[] = [];
const gantrySigns: THREE.Mesh[] = [];

/* ── Ribbon Geometry Generator ────────────────────────────────────── */

function createCurvedRibbonGeometry(
  innerOffset: number,
  outerOffset: number,
  yPos: number,
): THREE.BufferGeometry {
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= ROAD_SEGMENTS; i++) {
    const t = i / ROAD_SEGMENTS;
    const x = ROAD_START_X + t * ROAD_LENGTH;
    const pt = getRoadPoint(x);

    // Normal perpendicular to road direction in XZ plane
    const nx = -Math.sin(pt.angle);
    const nz = Math.cos(pt.angle);

    // Left vertex
    vertices.push(
      pt.x + nx * innerOffset,
      yPos,
      pt.z + nz * innerOffset,
    );
    uvs.push(0, t * 40);

    // Right vertex
    vertices.push(
      pt.x + nx * outerOffset,
      yPos,
      pt.z + nz * outerOffset,
    );
    uvs.push(1, t * 40);

    if (i < ROAD_SEGMENTS) {
      const v0 = i * 2;
      const v1 = i * 2 + 1;
      const v2 = (i + 1) * 2;
      const v3 = (i + 1) * 2 + 1;
      indices.push(v0, v1, v2);
      indices.push(v1, v3, v2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/* ── Country Highway Gantry Arch Generator ────────────────────────── */

interface CountryCheckpoint {
  x: number;
  country: string;
  code: string;
  subheading: string;
  milestone: string;
  colors: string[];
  drawFlag: (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => void;
}

const CHECKPOINTS: CountryCheckpoint[] = [
  {
    x: 0,
    country: 'PAKISTAN',
    code: 'PK',
    subheading: 'ORIGIN HUB — DOORSTEP COLLECTION',
    milestone: 'KM 0 • DEPARTURE',
    colors: ['#01411C', '#FFFFFF'],
    drawFlag: (ctx, x, y, w, h) => {
      // Pakistan 🇵🇰
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, y, w * 0.28, h);
      ctx.fillStyle = '#01411C';
      ctx.fillRect(x + w * 0.28, y, w * 0.72, h);

      // Crescent & Star
      const cx = x + w * 0.65;
      const cy = y + h * 0.5;
      const r = h * 0.32;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#01411C';
      ctx.beginPath();
      ctx.arc(cx + r * 0.32, cy - r * 0.15, r * 0.88, 0, Math.PI * 2);
      ctx.fill();

      // Star
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx + r * 0.42, cy - r * 0.3, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    x: 40,
    country: 'IRAN',
    code: 'IR',
    subheading: 'TRANSIT CORRIDOR — CUSTOMS ESCORT',
    milestone: 'KM 1,480 • OVERLAND TRANSIT',
    colors: ['#239f40', '#ffffff', '#da0000'],
    drawFlag: (ctx, x, y, w, h) => {
      // Iran 🇮🇷
      const bandH = h / 3;
      ctx.fillStyle = '#239f40';
      ctx.fillRect(x, y, w, bandH);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y + bandH, w, bandH);
      ctx.fillStyle = '#da0000';
      ctx.fillRect(x, y + bandH * 2, w, bandH);

      // Red central symbol
      ctx.fillStyle = '#da0000';
      ctx.beginPath();
      ctx.arc(x + w * 0.5, y + h * 0.5, bandH * 0.35, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    x: 80,
    country: 'AZERBAIJAN',
    code: 'AZ',
    subheading: 'DESTINATION — BAKU CASPIAN PORT',
    milestone: 'KM 2,960 • FINAL ARRIVAL',
    colors: ['#00b5e2', '#ef3340', '#509e2f'],
    drawFlag: (ctx, x, y, w, h) => {
      // Azerbaijan 🇦🇿
      const bandH = h / 3;
      ctx.fillStyle = '#00b5e2';
      ctx.fillRect(x, y, w, bandH);
      ctx.fillStyle = '#ef3340';
      ctx.fillRect(x, y + bandH, w, bandH);
      ctx.fillStyle = '#509e2f';
      ctx.fillRect(x, y + bandH * 2, w, bandH);

      // White Crescent & Star
      const cx = x + w * 0.48;
      const cy = y + h * 0.5;
      const r = bandH * 0.36;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ef3340';
      ctx.beginPath();
      ctx.arc(cx + r * 0.3, cy, r * 0.78, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx + r * 0.65, cy, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    },
  },
];

function createSignTexture(cp: CountryCheckpoint): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 420;
  const ctx = canvas.getContext('2d')!;

  // Deep metallic slate background
  const grad = ctx.createLinearGradient(0, 0, 1024, 420);
  grad.addColorStop(0, '#09101d');
  grad.addColorStop(1, '#1e293b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 420);

  // Outer glowing border
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, 1012, 408);

  // Inner reflective line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, 988, 384);

  // Top gateway pill badge
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(32, 28, 220, 38);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(`GATEWAY [${cp.code}]`, 45, 54);

  // Milestone distance badge
  ctx.fillStyle = '#10b981';
  ctx.fillRect(265, 28, 300, 38);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(cp.milestone, 278, 54);

  // National Flag on the left
  const flagX = 35;
  const flagY = 85;
  const flagW = 280;
  const flagH = 175;

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 4;
  ctx.strokeRect(flagX - 2, flagY - 2, flagW + 4, flagH + 4);
  cp.drawFlag(ctx, flagX, flagY, flagW, flagH);
  ctx.restore();

  // Country Name (massive high-contrast typography)
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 96px system-ui, -apple-system, sans-serif';
  ctx.fillText(cp.country, 345, 170);

  // Subtitle / logistics route text
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
  ctx.fillText(cp.subheading, 348, 230);

  // Route security badge
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('SWIFTHAUL SECURE INTERNATIONAL CARRIER PASS', 35, 345);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('CUSTOMS CLEARED • ENCLOSED MULTI-CAR TRANSPORTER', 35, 385);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

function buildCountryGantry(cp: CountryCheckpoint): THREE.Group {
  const pt = getRoadPoint(cp.x);
  const gantry = new THREE.Group();
  gantry.name = `gantry-${cp.country}`;

  const trussMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    metalness: 0.8,
    roughness: 0.35,
  });

  /* ── 1. Overhead Highway Gantry Spanning ACROSS the road (along Z) ─ */
  // Road width is 9.2 (Z = -4.6 to +4.6).
  // Pillars sit at Z = -5.8 (North) and Z = +5.8 (South)
  const pillarHeight = 4.2;
  const pillarGeo = new THREE.CylinderGeometry(0.16, 0.22, pillarHeight, 8);

  const legNorth = new THREE.Mesh(pillarGeo, trussMat);
  legNorth.position.set(0, pillarHeight / 2, -5.8);
  legNorth.castShadow = true;
  gantry.add(legNorth);

  const legSouth = new THREE.Mesh(pillarGeo, trussMat);
  legSouth.position.set(0, pillarHeight / 2, 5.8);
  legSouth.castShadow = true;
  gantry.add(legSouth);

  // Crossbar spans across the road along Z (from -5.8 to +5.8)
  const barGeo = new THREE.BoxGeometry(0.4, 0.4, 12.0);
  const bar = new THREE.Mesh(barGeo, trussMat);
  bar.position.set(0, pillarHeight, 0);
  bar.castShadow = true;
  gantry.add(bar);

  /* ── 2. Prominent Roadside Milestone Board (North side, in camera view) */
  // Placed on the North roadside at Z = -6.2, centered vertically at Y = 2.3
  // This is 100% in view of the camera, perfectly framed, never cut off!
  const signTex = createSignTexture(cp);
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    emissive: new THREE.Color('#ffffff'),
    emissiveMap: signTex,
    emissiveIntensity: 0.6,
    metalness: 0.2,
    roughness: 0.4,
  });

  const boardW = 6.8;
  const boardH = 2.6;
  const boardGeo = new THREE.BoxGeometry(boardW, boardH, 0.18);
  const boardMesh = new THREE.Mesh(boardGeo, signMat);

  // Angle board slightly toward camera (+Z) and approaching car (-X)
  const billboardGroup = new THREE.Group();
  billboardGroup.position.set(1.5, 2.3, -6.4);
  billboardGroup.rotation.y = Math.PI - 0.28; // faces toward user/camera

  boardMesh.castShadow = true;
  billboardGroup.add(boardMesh);

  // Dual support legs for the billboard
  const bLegGeo = new THREE.CylinderGeometry(0.12, 0.16, 2.3, 8);
  const bLegL = new THREE.Mesh(bLegGeo, trussMat);
  bLegL.position.set(-2.2, -1.15, 0);
  billboardGroup.add(bLegL);

  const bLegR = new THREE.Mesh(bLegGeo, trussMat);
  bLegR.position.set(2.2, -1.15, 0);
  billboardGroup.add(bLegR);

  // Overhead hood downlight fixture on the billboard
  const hoodGeo = new THREE.BoxGeometry(boardW + 0.2, 0.15, 0.4);
  const hood = new THREE.Mesh(hoodGeo, trussMat);
  hood.position.set(0, boardH / 2 + 0.08, 0.15);
  billboardGroup.add(hood);

  gantry.add(billboardGroup);
  gantrySigns.push(boardMesh);

  /* ── 3. Overhead Lane Directional Banner on the Gantry ─────────── */
  const overheadSignGeo = new THREE.BoxGeometry(0.16, 1.4, 6.2);
  const overheadSign = new THREE.Mesh(overheadSignGeo, signMat);
  overheadSign.position.set(-0.25, pillarHeight - 0.7, 0);
  overheadSign.castShadow = true;
  gantry.add(overheadSign);
  gantrySigns.push(overheadSign);

  // Overhead spotlights illuminating the road beneath the arch
  const spotL = new THREE.PointLight('#38bdf8', 1.8, 14, 2);
  spotL.position.set(-0.5, pillarHeight - 0.2, -2.5);
  gantry.add(spotL);

  const spotR = new THREE.PointLight('#38bdf8', 1.8, 14, 2);
  spotR.position.set(-0.5, pillarHeight - 0.2, 2.5);
  gantry.add(spotR);

  // Position and rotate gantry perpendicular to road curvature at checkpoint
  gantry.position.set(pt.x, 0, pt.z);
  gantry.rotation.y = -pt.angle;

  return gantry;
}

/* ── Main Create Road Function ────────────────────────────────────── */

export function createRoad(scene: THREE.Scene): THREE.Group {
  roadGroup = new THREE.Group();
  roadGroup.name = 'curved-road';

  /* ── 1. Asphalt Main Surface (Deep Black #16181d) ───────────────── */
  const halfRoad = ROAD_WIDTH / 2;
  const roadGeo = createCurvedRibbonGeometry(-halfRoad, halfRoad, 0.02);
  const roadMat = new THREE.MeshStandardMaterial({
    color: COLORS.road, // '#16181d'
    roughness: 0.92,
    metalness: 0.08,
  });

  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.name = 'asphalt';
  roadMesh.receiveShadow = true;
  roadGroup.add(roadMesh);

  /* ── 2. Road Shoulders / Gravel Edges ───────────────────────────── */
  const shoulderWidth = 0.8;
  const shoulderNorthGeo = createCurvedRibbonGeometry(
    -halfRoad - shoulderWidth,
    -halfRoad,
    0.018,
  );
  const shoulderSouthGeo = createCurvedRibbonGeometry(
    halfRoad,
    halfRoad + shoulderWidth,
    0.018,
  );
  const shoulderMat = new THREE.MeshStandardMaterial({
    color: '#282b33',
    roughness: 0.95,
  });

  const shoulderN = new THREE.Mesh(shoulderNorthGeo, shoulderMat);
  shoulderN.receiveShadow = true;
  roadGroup.add(shoulderN);

  const shoulderS = new THREE.Mesh(shoulderSouthGeo, shoulderMat);
  shoulderS.receiveShadow = true;
  roadGroup.add(shoulderS);

  /* ── 3. Outer Boundary Solid White Stripes ──────────────────────── */
  const lineW = 0.14;
  const whiteMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.35,
  });

  const edgeNorthGeo = createCurvedRibbonGeometry(
    -halfRoad + 0.35,
    -halfRoad + 0.35 + lineW,
    0.025,
  );
  const edgeSouthGeo = createCurvedRibbonGeometry(
    halfRoad - 0.35 - lineW,
    halfRoad - 0.35,
    0.025,
  );

  const lineN = new THREE.Mesh(edgeNorthGeo, whiteMat);
  const lineS = new THREE.Mesh(edgeSouthGeo, whiteMat);
  roadGroup.add(lineN);
  roadGroup.add(lineS);

  /* ── 4. Animated Center Dashed Yellow Stripes ───────────────────── */
  const dashGeo = new THREE.BoxGeometry(DASH_LENGTH, 0.014, DASH_WIDTH);
  const dashMat = new THREE.MeshStandardMaterial({
    color: COLORS.roadLine, // '#fbbf24'
    emissive: COLORS.roadLine,
    emissiveIntensity: 0.3,
    roughness: 0.45,
  });

  for (let i = 0; i < DASH_COUNT; i++) {
    const dashMesh = new THREE.Mesh(dashGeo, dashMat);
    const baseOffset = ROAD_START_X + i * DASH_SPACING;
    const pt = getRoadPoint(baseOffset);

    dashMesh.position.set(pt.x, 0.026, pt.z);
    dashMesh.rotation.y = -pt.angle;

    roadGroup.add(dashMesh);
    dashes.push({ mesh: dashMesh, baseOffset });
  }

  /* ── 5. Build 3D Country Milestone Checkpoint Gantries ──────────── */
  for (const cp of CHECKPOINTS) {
    const gantry = buildCountryGantry(cp);
    roadGroup.add(gantry);
  }

  scene.add(roadGroup);
  return roadGroup;
}

/* ── Per-Frame Road Update ────────────────────────────────────────── */

/**
 * Updates positions and rotations of dashed yellow lines along the curve
 * as the car drives forward.
 */
export function updateRoad(carX: number): void {
  const totalSpan = DASH_COUNT * DASH_SPACING;

  for (let i = 0; i < dashes.length; i++) {
    const d = dashes[i];
    // Smoothly shift dashes with car position
    let x = d.baseOffset - (carX % totalSpan);
    if (x < ROAD_START_X) x += totalSpan;
    if (x > ROAD_END_X) x -= totalSpan;

    const pt = getRoadPoint(x);
    d.mesh.position.set(pt.x, 0.026, pt.z);
    d.mesh.rotation.y = -pt.angle;
  }
}

/* ── Cleanup ──────────────────────────────────────────────────────── */

export function disposeRoad(): void {
  roadGroup?.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else if (child.material instanceof THREE.Material) {
        child.material.dispose();
      }
    }
  });

  gantrySigns.length = 0;
  dashes.length = 0;
}

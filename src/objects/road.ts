/**
 * road.ts — Highway road with dark asphalt, shoulders, curbs, and animated lane markings.
 *
 * Orientation:
 *   - Length runs along the X axis (the direction the car drives).
 *   - Width spans the Z axis (Z = -4.5 to +4.5).
 *   - Sits horizontally on the ground plane (Y = 0.02).
 */

import * as THREE from 'three';
import { COLORS } from '../config';

const ROAD_WIDTH = 9;
const ROAD_LENGTH = 320; // spans from X = -100 to +220
const ROAD_CENTER_X = 60; // centered along car's travel path (0 to 85)

const DASH_COUNT = 60;
const DASH_LENGTH = 2.0;
const DASH_WIDTH = 0.16;
const DASH_GAP = 4.0; // distance between dash centers

let roadGroup: THREE.Group;
const dashes: THREE.Mesh[] = [];

export function createRoad(scene: THREE.Scene): THREE.Group {
  roadGroup = new THREE.Group();
  roadGroup.name = 'road';
  roadGroup.position.set(ROAD_CENTER_X, 0, 0);

  /* ── 1. Main Asphalt Surface (Black) ────────────────────────────── */
  // PlaneGeometry(width, height) in Three.js:
  // width = 320 (X dimension), height = 9 (Z dimension after rotX = -PI/2)
  const roadGeo = new THREE.PlaneGeometry(ROAD_LENGTH, ROAD_WIDTH);
  const roadMat = new THREE.MeshStandardMaterial({
    color: COLORS.road, // '#16181d' dark asphalt
    roughness: 0.92,
    metalness: 0.08,
  });

  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.name = 'asphalt';
  // ONLY rotate around X to lay flat in XZ plane (NO rotation around Z!)
  roadMesh.rotation.x = -Math.PI / 2;
  roadMesh.position.y = 0.02;
  roadMesh.receiveShadow = true;
  roadGroup.add(roadMesh);

  /* ── 2. Road Shoulders / Gravel Edges ───────────────────────────── */
  const shoulderGeo = new THREE.PlaneGeometry(ROAD_LENGTH, 0.8);
  const shoulderMat = new THREE.MeshStandardMaterial({
    color: '#2a2d34',
    roughness: 0.95,
  });

  const shoulderNorth = new THREE.Mesh(shoulderGeo, shoulderMat);
  shoulderNorth.rotation.x = -Math.PI / 2;
  shoulderNorth.position.set(0, 0.018, -(ROAD_WIDTH / 2 + 0.4));
  shoulderNorth.receiveShadow = true;
  roadGroup.add(shoulderNorth);

  const shoulderSouth = new THREE.Mesh(shoulderGeo, shoulderMat);
  shoulderSouth.rotation.x = -Math.PI / 2;
  shoulderSouth.position.set(0, 0.018, ROAD_WIDTH / 2 + 0.4);
  shoulderSouth.receiveShadow = true;
  roadGroup.add(shoulderSouth);

  /* ── 3. Concrete Curbs ───────────────────────────────────────────── */
  const curbGeo = new THREE.BoxGeometry(ROAD_LENGTH, 0.08, 0.25);
  const curbMat = new THREE.MeshStandardMaterial({
    color: '#64748b',
    roughness: 0.85,
  });

  const curbNorth = new THREE.Mesh(curbGeo, curbMat);
  curbNorth.position.set(0, 0.04, -(ROAD_WIDTH / 2 + 0.8 + 0.12));
  curbNorth.receiveShadow = true;
  roadGroup.add(curbNorth);

  const curbSouth = new THREE.Mesh(curbGeo, curbMat);
  curbSouth.position.set(0, 0.04, ROAD_WIDTH / 2 + 0.8 + 0.12);
  curbSouth.receiveShadow = true;
  roadGroup.add(curbSouth);

  /* ── 4. Edge Solid White Lines ───────────────────────────────────── */
  const edgeLineGeo = new THREE.BoxGeometry(ROAD_LENGTH, 0.01, 0.14);
  const edgeLineMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.4,
  });

  const edgeNorth = new THREE.Mesh(edgeLineGeo, edgeLineMat);
  edgeNorth.position.set(0, 0.025, -(ROAD_WIDTH / 2 - 0.45));
  roadGroup.add(edgeNorth);

  const edgeSouth = new THREE.Mesh(edgeLineGeo, edgeLineMat);
  edgeSouth.position.set(0, 0.025, ROAD_WIDTH / 2 - 0.45);
  roadGroup.add(edgeSouth);

  /* ── 5. Center Dashed Yellow Highway Markings ────────────────────── */
  const dashGeo = new THREE.BoxGeometry(DASH_LENGTH, 0.012, DASH_WIDTH);
  const dashMat = new THREE.MeshStandardMaterial({
    color: COLORS.roadLine, // '#fbbf24'
    emissive: COLORS.roadLine,
    emissiveIntensity: 0.25,
    roughness: 0.5,
  });

  for (let i = 0; i < DASH_COUNT; i++) {
    const dash = new THREE.Mesh(dashGeo, dashMat);
    dash.position.set(
      -ROAD_LENGTH / 2 + i * DASH_GAP,
      0.026,
      0, // centered at Z = 0
    );
    roadGroup.add(dash);
    dashes.push(dash);
  }

  scene.add(roadGroup);
  return roadGroup;
}

/**
 * Scroll the dashed lane markings smoothly with car progress.
 * `carX` is the current car X coordinate in world space.
 */
export function updateRoad(carX: number): void {
  const totalSpan = DASH_COUNT * DASH_GAP;
  // Offset relative to the road group's center position
  const relativeX = carX - ROAD_CENTER_X;

  for (let i = 0; i < dashes.length; i++) {
    const base = -ROAD_LENGTH / 2 + i * DASH_GAP;
    // Shift dashes backward as the car moves forward
    let x = base - (relativeX % totalSpan);
    if (x < -ROAD_LENGTH / 2) {
      x += totalSpan;
    } else if (x > ROAD_LENGTH / 2) {
      x -= totalSpan;
    }
    dashes[i].position.x = x;
  }
}

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
  dashes.length = 0;
}

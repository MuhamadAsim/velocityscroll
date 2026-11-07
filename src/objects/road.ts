/**
 * road.ts — Infinite-scroll road with animated dashed lane markings.
 *
 * The road is a flat plane. Lane dashes are small boxes that scroll
 * by offsetting their UV / position based on scroll progress.
 */

import * as THREE from 'three';
import { COLORS } from '../config';

const ROAD_WIDTH = 8;
const ROAD_LENGTH = 200;
const DASH_COUNT = 40;
const DASH_LENGTH = 1.5;
const DASH_WIDTH = 0.12;
const DASH_GAP = 3; // spacing between dash centers

let roadGroup: THREE.Group;
const dashes: THREE.Mesh[] = [];

export function createRoad(scene: THREE.Scene): THREE.Group {
  roadGroup = new THREE.Group();
  roadGroup.name = 'road';

  /* ── Road surface ───────────────────────────────────────────────── */
  const roadGeo = new THREE.PlaneGeometry(ROAD_LENGTH, ROAD_WIDTH);
  const roadMat = new THREE.MeshStandardMaterial({
    color: COLORS.road,
    roughness: 0.9,
    metalness: 0.0,
  });
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.rotation.x = -Math.PI / 2;
  roadMesh.rotation.z = -Math.PI / 2; // road runs along X
  roadMesh.position.y = 0.01;
  roadMesh.receiveShadow = true;
  roadGroup.add(roadMesh);

  /* ── Dashed center line ─────────────────────────────────────────── */
  const dashGeo = new THREE.BoxGeometry(DASH_LENGTH, 0.02, DASH_WIDTH);
  const dashMat = new THREE.MeshStandardMaterial({
    color: COLORS.roadLine,
    emissive: COLORS.roadLine,
    emissiveIntensity: 0.15,
  });

  for (let i = 0; i < DASH_COUNT; i++) {
    const dash = new THREE.Mesh(dashGeo, dashMat);
    dash.position.set(
      -ROAD_LENGTH / 2 + i * DASH_GAP,
      0.03,
      0,
    );
    roadGroup.add(dash);
    dashes.push(dash);
  }

  /* ── Edge lines (solid) ─────────────────────────────────────────── */
  const edgeGeo = new THREE.BoxGeometry(ROAD_LENGTH, 0.02, 0.1);
  const edgeMat = new THREE.MeshStandardMaterial({ color: '#9CA3AF' });

  const edgeL = new THREE.Mesh(edgeGeo, edgeMat);
  edgeL.position.set(0, 0.025, ROAD_WIDTH / 2 - 0.3);
  roadGroup.add(edgeL);

  const edgeR = new THREE.Mesh(edgeGeo, edgeMat);
  edgeR.position.set(0, 0.025, -(ROAD_WIDTH / 2 - 0.3));
  roadGroup.add(edgeR);

  scene.add(roadGroup);
  return roadGroup;
}

/**
 * Scroll the dashed lane markings to match car progress.
 * `offset` is the car's X position — dashes wrap around.
 */
export function updateRoad(offset: number): void {
  const totalSpan = DASH_COUNT * DASH_GAP;
  for (let i = 0; i < dashes.length; i++) {
    const base = -ROAD_LENGTH / 2 + i * DASH_GAP;
    /* Shift dashes and wrap within the visible range */
    let x = base - (offset % totalSpan);
    if (x < -ROAD_LENGTH / 2) x += totalSpan;
    dashes[i].position.x = x;
  }
}

export function disposeRoad(): void {
  roadGroup?.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (child.material instanceof THREE.Material) child.material.dispose();
    }
  });
}


/**
 * background.ts — Sky gradient, 3 parallax layers, fog.
 *
 * Layers (far → near, each at a different parallax speed):
 *   1. Mountains  — parallax ×0.2
 *   2. City skyline — parallax ×0.5
 *   3. Trees — parallax ×0.8
 *
 * Sky color, fog color & density interpolate with scroll progress
 * using the keyframes from config.COLORS.sky.
 */

import * as THREE from 'three';
import { COLORS } from '../config';

/* ── Constants ────────────────────────────────────────────────────── */

const MOUNTAIN_COUNT = 12;
const BUILDING_COUNT = 20;
const TREE_COUNT = 30;
const FAR_Z = -60;
const MID_Z = -35;
const NEAR_Z = -15;
const LAYER_SPREAD_X = 200; // total width of each layer

/* ── State ────────────────────────────────────────────────────────── */

let skyMesh: THREE.Mesh;
let skyMat: THREE.ShaderMaterial;
let fogRef: THREE.Fog;

interface ParallaxLayer {
  group: THREE.Group;
  speed: number;
}
const layers: ParallaxLayer[] = [];

/* ── Sky gradient shader ──────────────────────────────────────────── */

const skyVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragmentShader = /* glsl */ `
  uniform vec3 uTopColor;
  uniform vec3 uBottomColor;
  varying vec2 vUv;
  void main() {
    gl_FragColor = vec4(mix(uBottomColor, uTopColor, vUv.y), 1.0);
  }
`;

/* ── Create ───────────────────────────────────────────────────────── */

export function createBackground(scene: THREE.Scene): void {
  /* ── Sky dome (large background plane) ──────────────────────────── */
  skyMat = new THREE.ShaderMaterial({
    vertexShader: skyVertexShader,
    fragmentShader: skyFragmentShader,
    uniforms: {
      uTopColor: { value: new THREE.Color(COLORS.sky[0].top) },
      uBottomColor: { value: new THREE.Color(COLORS.sky[0].bottom) },
    },
    side: THREE.BackSide,
    depthWrite: false,
  });

  const skyGeo = new THREE.SphereGeometry(200, 32, 16);
  skyMesh = new THREE.Mesh(skyGeo, skyMat);
  skyMesh.name = 'sky';
  scene.add(skyMesh);

  /* ── Fog ────────────────────────────────────────────────────────── */
  fogRef = new THREE.Fog(COLORS.sky[0].fog, 30, 160);
  scene.fog = fogRef;

  /* ── Mountains (parallax ×0.2) ──────────────────────────────────── */
  const mountainGroup = new THREE.Group();
  mountainGroup.name = 'mountains';
  const mtnMat = new THREE.MeshStandardMaterial({
    color: '#4A5568',
    flatShading: true,
    roughness: 1,
  });

  for (let i = 0; i < MOUNTAIN_COUNT; i++) {
    const w = 8 + Math.random() * 12;
    const h = 6 + Math.random() * 10;
    const geo = new THREE.ConeGeometry(w, h, 5 + Math.floor(Math.random() * 3));
    const mesh = new THREE.Mesh(geo, mtnMat);
    mesh.position.set(
      -LAYER_SPREAD_X / 2 + (i / MOUNTAIN_COUNT) * LAYER_SPREAD_X + (Math.random() - 0.5) * 10,
      h / 2 - 1,
      FAR_Z + (Math.random() - 0.5) * 10,
    );
    mesh.rotation.y = Math.random() * Math.PI;
    mountainGroup.add(mesh);
  }
  scene.add(mountainGroup);
  layers.push({ group: mountainGroup, speed: 0.2 });

  /* ── City skyline (parallax ×0.5) ───────────────────────────────── */
  const cityGroup = new THREE.Group();
  cityGroup.name = 'skyline';
  const buildingMat = new THREE.MeshStandardMaterial({
    color: '#1E293B',
    roughness: 0.8,
  });

  for (let i = 0; i < BUILDING_COUNT; i++) {
    const w = 1.5 + Math.random() * 2;
    const h = 3 + Math.random() * 8;
    const d = 1.5 + Math.random() * 2;
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, buildingMat);
    mesh.position.set(
      -LAYER_SPREAD_X / 2 + (i / BUILDING_COUNT) * LAYER_SPREAD_X + (Math.random() - 0.5) * 5,
      h / 2,
      MID_Z + (Math.random() - 0.5) * 6,
    );
    mesh.castShadow = true;
    cityGroup.add(mesh);
  }
  scene.add(cityGroup);
  layers.push({ group: cityGroup, speed: 0.5 });

  /* ── Trees (parallax ×0.8) ──────────────────────────────────────── */
  const treeGroup = new THREE.Group();
  treeGroup.name = 'trees';
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#78350F', roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({
    color: '#166534',
    flatShading: true,
    roughness: 0.9,
  });

  for (let i = 0; i < TREE_COUNT; i++) {
    const tree = new THREE.Group();

    const trunkH = 1 + Math.random() * 1.5;
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, trunkH, 6);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkH / 2;
    tree.add(trunk);

    const leafH = 2 + Math.random() * 2;
    const leafGeo = new THREE.ConeGeometry(1 + Math.random() * 0.8, leafH, 6);
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.y = trunkH + leafH / 2 - 0.3;
    leaf.castShadow = true;
    tree.add(leaf);

    tree.position.set(
      -LAYER_SPREAD_X / 2 + (i / TREE_COUNT) * LAYER_SPREAD_X + (Math.random() - 0.5) * 8,
      0,
      NEAR_Z + (Math.random() - 0.5) * 5,
    );
    tree.scale.setScalar(0.8 + Math.random() * 0.5);
    treeGroup.add(tree);
  }
  scene.add(treeGroup);
  layers.push({ group: treeGroup, speed: 0.8 });
}

/* ── Update (called every frame with scroll progress 0-1) ─────────── */

const _colorA = new THREE.Color();
const _colorB = new THREE.Color();

export function updateBackground(progress: number, carX: number): void {
  /* ── Sky & fog color interpolation ──────────────────────────────── */
  const keys = COLORS.sky;
  let a = keys[0];
  let b = keys[keys.length - 1];

  for (let i = 0; i < keys.length - 1; i++) {
    if (progress >= keys[i].progress && progress <= keys[i + 1].progress) {
      a = keys[i];
      b = keys[i + 1];
      break;
    }
  }

  const range = b.progress - a.progress || 1;
  const t = (progress - a.progress) / range;

  _colorA.set(a.top);
  _colorB.set(b.top);
  (skyMat.uniforms.uTopColor.value as THREE.Color).copy(_colorA).lerp(_colorB, t);

  _colorA.set(a.bottom);
  _colorB.set(b.bottom);
  (skyMat.uniforms.uBottomColor.value as THREE.Color).copy(_colorA).lerp(_colorB, t);

  _colorA.set(a.fog);
  _colorB.set(b.fog);
  fogRef.color.copy(_colorA).lerp(_colorB, t);

  /* ── Parallax layers ────────────────────────────────────────────── */
  for (const layer of layers) {
    layer.group.position.x = -carX * layer.speed;
  }
}

/* ── Cleanup ──────────────────────────────────────────────────────── */

export function disposeBackground(): void {
  skyMesh?.geometry.dispose();
  skyMat?.dispose();
  for (const layer of layers) {
    layer.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) child.material.dispose();
      }
    });
  }
}


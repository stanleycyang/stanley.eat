'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FoodModelProps } from '@/types/dish';
import {
  applyFoodSSS,
  displaceGeometryOrganic,
  getOrganicNormalMap,
  getPankoCrustTextures,
  getWoodGrainTextures,
} from '@/lib/proceduralTextures';
import { FoodLayer } from './FoodLayer';

const SLICE_COUNT = 6;
const SLICE_ARC = (Math.PI * 2) / SLICE_COUNT; // 60 deg
const HALF_ARC = SLICE_ARC / 2;
const SLICE_GAP = 0.016; // subtle artisanal cut seam between slices
const HERO_CENTER_ANGLE = Math.PI / 4; // 45 deg: front-right (+X, +Z)

const PIZZA_BASE_Y = -0.39;
const OUTER_RADIUS = 1.44;
const SAUCE_RADIUS = 1.18;
const RIM_CENTER_RADIUS = 1.3;

interface HeroSliceMoverProps {
  hovered: boolean;
  layerKey: string;
  onHeroEnter: (key: string) => void;
  onHeroLeave: (key: string) => void;
  children: React.ReactNode;
}

function HeroSliceMover({
  hovered,
  layerKey,
  onHeroEnter,
  onHeroLeave,
  children,
}: HeroSliceMoverProps) {
  const moverRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);

  useFrame((_, delta) => {
    const group = moverRef.current;
    if (!group) return;

    const dt = Math.min(delta, 0.05);
    const factor = 1 - Math.exp(-9 * dt);
    const target = hovered ? 1 : 0;

    progressRef.current = THREE.MathUtils.lerp(progressRef.current, target, factor);
    const p = progressRef.current;

    // Pull straight out radially along local +X, lift slightly, and tilt gently up
    group.position.x = 0.39 * p;
    group.position.y = 0.085 * p;
    group.rotation.z = 0.065 * p;
  });

  return (
    <group rotation={[0, -HERO_CENTER_ANGLE, 0]}>
      <group
        ref={moverRef}
        onPointerOver={() => onHeroEnter(layerKey)}
        onPointerOut={() => onHeroLeave(layerKey)}
      >
        {children}
      </group>
    </group>
  );
}

/** Creates a 2D wedge Shape centered on +X (spanning -arc/2 to +arc/2). */
function createWedgeShape(radius: number, halfAngle: number, tipOffset = 0.018): THREE.Shape {
  const shape = new THREE.Shape();
  const a0 = -halfAngle;
  const a1 = halfAngle;
  const segments = 24;

  shape.moveTo(tipOffset, 0);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = a0 + (a1 - a0) * t;
    const wave = 1 + Math.sin(angle * 7) * 0.008;
    shape.lineTo(Math.cos(angle) * radius * wave, Math.sin(angle) * radius * wave);
  }
  shape.closePath();
  return shape;
}

/** Creates an organic puffy cornicione rim along a slice's 60-degree arc with asymmetric blisters. */
function createCornicioneGeometry(seed: number, sliceIdx: number): THREE.BufferGeometry {
  const radialSegs = 20;
  const tubularSegs = 32;
  const arcHalf = HALF_ARC - SLICE_GAP * 0.7;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= tubularSegs; i++) {
    const u = i / tubularSegs;
    const theta = -arcHalf + u * arcHalf * 2;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    const endCap = Math.sin(u * Math.PI);
    const endTaper = 0.78 + 0.22 * Math.pow(endCap, 0.35);

    // Subtle baseline rise; asymmetric wood-fired air blisters come from displaceGeometryOrganic
    const puff = 1 + Math.sin(u * Math.PI * 2.5 + seed * 2.1) * 0.1;

    const tubeRx = 0.155 * puff * endTaper;
    const tubeRy = 0.118 * puff * endTaper;
    const centerR = RIM_CENTER_RADIUS + Math.sin(u * Math.PI * 2 + seed) * 0.012;
    const centerY = PIZZA_BASE_Y + 0.095;

    for (let j = 0; j <= radialSegs; j++) {
      const v = j / radialSegs;
      const phi = v * Math.PI * 2;
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);

      const localY = sinP < 0 ? sinP * tubeRy * 0.65 : sinP * tubeRy * 1.08;
      const localR = centerR + cosP * tubeRx;

      const x = localR * cosT;
      const z = localR * sinT;
      const y = centerY + localY;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let i = 0; i < tubularSegs; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * (radialSegs + 1) + j;
      const b = (i + 1) * (radialSegs + 1) + j;
      const c = (i + 1) * (radialSegs + 1) + (j + 1);
      const d = i * (radialSegs + 1) + (j + 1);
      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  // Asymmetric wood-fired cornicione air blisters while preserving watertight seam & flat base
  return displaceGeometryOrganic(geo, {
    amplitude: 0.024,
    frequency: 4.8,
    seed: 103 + sliceIdx * 37,
    flattenBottomY: PIZZA_BASE_Y + 0.008,
    preserveSeam: true,
  });
}

/** Creates a ruffled shallow curled Neapolitan cup-and-char pepperoni LatheGeometry. */
function createPepperoniCupGeometry(): THREE.BufferGeometry {
  const points: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.06, 0.002),
    new THREE.Vector2(0.115, 0.006),
    new THREE.Vector2(0.155, 0.018),
    new THREE.Vector2(0.178, 0.036),
    new THREE.Vector2(0.184, 0.044),
    new THREE.Vector2(0.176, 0.048),
    new THREE.Vector2(0.162, 0.034),
    new THREE.Vector2(0.132, 0.02),
    new THREE.Vector2(0.085, 0.014),
    new THREE.Vector2(0.0, 0.013),
  ];
  const geo = new THREE.LatheGeometry(points, 28);
  return displaceGeometryOrganic(geo, {
    amplitude: 0.0055,
    frequency: 12.5,
    seed: 311,
    flattenBottomY: 0,
    preserveSeam: true,
  });
}

/** Creates an organic cupped & folded fresh sweet basil leaf BufferGeometry. */
function createBasilLeafGeometry(): THREE.BufferGeometry {
  const lengthSegs = 14;
  const widthSegs = 10;
  const leafLength = 0.34;
  const leafHalfWidth = 0.125;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= lengthSegs; i++) {
    const u = i / lengthSegs;
    const widthProfile = Math.sin(Math.pow(u, 0.72) * Math.PI);
    const halfW = widthProfile * leafHalfWidth;
    const archY = Math.sin(u * Math.PI) * 0.042 - u * 0.008;

    for (let j = 0; j <= widthSegs; j++) {
      const v = j / widthSegs;
      const s = v * 2 - 1;
      // Organic pillowy vein undulation between leaf midrib and margin
      const ribPuff = Math.sin(u * Math.PI * 5) * 0.005 * (1 - Math.abs(s)) * widthProfile;
      const foldY = Math.abs(s) * 0.028 * widthProfile - s * s * 0.014 * widthProfile + ribPuff;
      const x = (u - 0.45) * leafLength;
      const z = s * halfW;
      const y = archY + foldY;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let i = 0; i < lengthSegs; i++) {
    for (let j = 0; j < widthSegs; j++) {
      const a = i * (widthSegs + 1) + j;
      const b = (i + 1) * (widthSegs + 1) + j;
      const c = (i + 1) * (widthSegs + 1) + (j + 1);
      const d = i * (widthSegs + 1) + (j + 1);
      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Creates an organic melted mozzarella puddle ExtrudeGeometry with natural surface swell. */
function createCheeseBlobGeometry(
  rx: number,
  rz: number,
  seed: number,
  thickness = 0.026
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const pts = 28;
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const wobble =
      1 +
      Math.sin(a * 3 + seed) * 0.16 +
      Math.cos(a * 5 + seed * 1.9) * 0.09 +
      Math.sin(a * 2 - seed * 0.7) * 0.08;
    const px = Math.cos(a) * rx * wobble;
    const py = Math.sin(a) * rz * wobble;
    if (i === 0) shape.moveTo(px, py);
    else shape.lineTo(px, py);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.016,
    bevelSegments: 3,
    curveSegments: 14,
  });
  geo.rotateX(-Math.PI / 2);

  return displaceGeometryOrganic(geo, {
    amplitude: 0.01,
    frequency: 6.2,
    seed: Math.round(seed * 41) + 211,
    flattenBottomY: -0.002,
    preserveSeam: true,
  });
}

/** Flour-dusted blistered Neapolitan dough albedo map paired with shared PBR crust normal/roughness. */
function createDoughTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#D99B52';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 320; i++) {
    const x = ((i * 73.1) % 1) * 512;
    const y = ((i * 39.7 + 0.13 * (i % 11)) % 1) * 512;
    const r = 5 + (i % 20);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    if (i % 6 === 0) {
      grad.addColorStop(0, 'rgba(116, 62, 24, 0.42)');
      grad.addColorStop(1, 'rgba(116, 62, 24, 0)');
    } else if (i % 3 === 0) {
      grad.addColorStop(0, 'rgba(252, 236, 206, 0.36)');
      grad.addColorStop(1, 'rgba(252, 236, 206, 0)');
    } else {
      grad.addColorStop(0, 'rgba(222, 162, 92, 0.25)');
      grad.addColorStop(1, 'rgba(222, 162, 92, 0)');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Spiced cured pepperoni albedo with marbled white fat flecks. */
function createPepperoniTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#B8291E';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 40; i++) {
    const x = ((i * 0.7548) % 1) * 256;
    const y = ((i * 0.5698) % 1) * 256;
    ctx.fillStyle = 'rgba(128, 22, 14, 0.28)';
    ctx.beginPath();
    ctx.arc(x, y, 8 + (i % 10), 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 72; i++) {
    const x = ((i * 0.6180339) % 1) * 256;
    const y = ((i * 0.381966 + 0.17 * (i % 7)) % 1) * 256;
    const rx = 2.4 + (i % 5);
    const ry = 1.9 + ((i * 3) % 4);
    ctx.fillStyle = i % 3 === 0 ? 'rgba(248, 222, 198, 0.62)' : 'rgba(232, 166, 134, 0.44)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, (i * 0.9) % Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

interface SlicePlacement {
  sliceIndex: number;
  r: number;
  phi: number;
  scale?: number;
  rotY?: number;
}

const PEPPERONI_PLACEMENTS: SlicePlacement[] = [
  { sliceIndex: 0, r: 0.48, phi: -0.04, scale: 0.96, rotY: 0.3 },
  { sliceIndex: 0, r: 0.88, phi: -0.22, scale: 1.04, rotY: 1.4 },
  { sliceIndex: 0, r: 0.93, phi: 0.21, scale: 0.98, rotY: 2.5 },
  { sliceIndex: 1, r: 0.55, phi: 0.14, scale: 1.0, rotY: 0.8 },
  { sliceIndex: 1, r: 0.92, phi: -0.18, scale: 0.95, rotY: 2.1 },
  { sliceIndex: 2, r: 0.44, phi: -0.1, scale: 0.92, rotY: 1.2 },
  { sliceIndex: 2, r: 0.84, phi: 0.2, scale: 1.05, rotY: 0.4 },
  { sliceIndex: 2, r: 0.96, phi: -0.22, scale: 0.94, rotY: 3.0 },
  { sliceIndex: 3, r: 0.62, phi: 0.05, scale: 1.02, rotY: 1.9 },
  { sliceIndex: 3, r: 0.94, phi: 0.24, scale: 0.96, rotY: 0.7 },
  { sliceIndex: 4, r: 0.46, phi: 0.12, scale: 0.94, rotY: 2.7 },
  { sliceIndex: 4, r: 0.88, phi: -0.16, scale: 1.03, rotY: 1.1 },
  { sliceIndex: 5, r: 0.58, phi: -0.14, scale: 0.98, rotY: 0.5 },
  { sliceIndex: 5, r: 0.92, phi: 0.16, scale: 1.02, rotY: 2.3 },
];

const BASIL_PLACEMENTS: SlicePlacement[] = [
  { sliceIndex: 0, r: 0.72, phi: 0.03, scale: 1.08, rotY: 0.45 },
  { sliceIndex: 1, r: 0.76, phi: -0.04, scale: 1.0, rotY: 1.35 },
  { sliceIndex: 2, r: 0.68, phi: 0.02, scale: 0.96, rotY: 2.4 },
  { sliceIndex: 3, r: 0.36, phi: -0.06, scale: 0.92, rotY: 0.95 },
  { sliceIndex: 3, r: 0.84, phi: -0.18, scale: 1.02, rotY: 3.1 },
  { sliceIndex: 4, r: 0.74, phi: 0.08, scale: 1.05, rotY: 1.85 },
  { sliceIndex: 5, r: 0.75, phi: -0.02, scale: 0.98, rotY: 2.75 },
];

interface CheesePlacement {
  sliceIndex: number;
  r: number;
  phi: number;
  blobIndex: number;
  rotY: number;
  hasBubble?: boolean;
}

const CHEESE_PLACEMENTS: CheesePlacement[] = [
  { sliceIndex: 0, r: 0.42, phi: 0.02, blobIndex: 0, rotY: 0.4, hasBubble: true },
  { sliceIndex: 0, r: 0.78, phi: -0.18, blobIndex: 1, rotY: 1.2 },
  { sliceIndex: 0, r: 0.84, phi: 0.17, blobIndex: 2, rotY: 2.5, hasBubble: true },
  { sliceIndex: 1, r: 0.46, phi: -0.08, blobIndex: 1, rotY: 0.9 },
  { sliceIndex: 1, r: 0.82, phi: 0.14, blobIndex: 0, rotY: 1.8, hasBubble: true },
  { sliceIndex: 1, r: 0.92, phi: -0.18, blobIndex: 2, rotY: 0.2 },
  { sliceIndex: 2, r: 0.4, phi: 0.06, blobIndex: 2, rotY: 2.1 },
  { sliceIndex: 2, r: 0.78, phi: -0.14, blobIndex: 0, rotY: 0.7, hasBubble: true },
  { sliceIndex: 2, r: 0.88, phi: 0.19, blobIndex: 1, rotY: 2.8 },
  { sliceIndex: 3, r: 0.45, phi: -0.04, blobIndex: 0, rotY: 1.4, hasBubble: true },
  { sliceIndex: 3, r: 0.82, phi: 0.16, blobIndex: 2, rotY: 0.5 },
  { sliceIndex: 3, r: 0.86, phi: -0.2, blobIndex: 1, rotY: 2.3 },
  { sliceIndex: 4, r: 0.44, phi: 0.05, blobIndex: 1, rotY: 0.3 },
  { sliceIndex: 4, r: 0.8, phi: -0.16, blobIndex: 2, rotY: 1.9, hasBubble: true },
  { sliceIndex: 4, r: 0.9, phi: 0.18, blobIndex: 0, rotY: 2.6 },
  { sliceIndex: 5, r: 0.42, phi: -0.05, blobIndex: 2, rotY: 1.1 },
  { sliceIndex: 5, r: 0.8, phi: 0.15, blobIndex: 1, rotY: 2.4, hasBubble: true },
  { sliceIndex: 5, r: 0.89, phi: -0.17, blobIndex: 0, rotY: 0.8 },
];

interface CharBlister {
  phi: number;
  radialOffset: number;
  yOffset: number;
  scale: [number, number, number];
}

const SLICE_BLISTERS: CharBlister[][] = Array.from({ length: SLICE_COUNT }, (_, s) => [
  {
    phi: -0.34 + (s % 2) * 0.05,
    radialOffset: 0.02,
    yOffset: 0.195,
    scale: [0.068, 0.024, 0.052],
  },
  {
    phi: -0.13 + ((s * 3) % 4) * 0.02,
    radialOffset: -0.04,
    yOffset: 0.205,
    scale: [0.055, 0.022, 0.045],
  },
  {
    phi: 0.08 - (s % 3) * 0.03,
    radialOffset: 0.05,
    yOffset: 0.188,
    scale: [0.078, 0.026, 0.058],
  },
  {
    phi: 0.26 - (s % 2) * 0.04,
    radialOffset: -0.02,
    yOffset: 0.2,
    scale: [0.062, 0.022, 0.048],
  },
  {
    phi: 0.39 - (s % 3) * 0.02,
    radialOffset: 0.04,
    yOffset: 0.182,
    scale: [0.05, 0.02, 0.04],
  },
]);

export function PizzaModel({ exploded, highlightedPart, onSelectPart }: FoodModelProps) {
  const [hoveredSlice, setHoveredSlice] = useState(false);
  const hoveredLayersRef = useRef<Set<string>>(new Set());

  const handleHeroEnter = useCallback((key: string) => {
    hoveredLayersRef.current.add(key);
    setHoveredSlice(true);
  }, []);

  const handleHeroLeave = useCallback((key: string) => {
    hoveredLayersRef.current.delete(key);
    if (hoveredLayersRef.current.size === 0) {
      setHoveredSlice(false);
    }
  }, []);

  const assets = useMemo(() => {
    // Shared cached 512x512 procedural PBR & Sobel normal maps (DO NOT dispose these!)
    const boardWood = getWoodGrainTextures('cedar');
    const crustPbr = getPankoCrustTextures();
    const charNormal = getOrganicNormalMap(17, 12, 2.8);
    const sauceNormal = getOrganicNormalMap(31, 14, 2.2);
    const cheeseNormal = getOrganicNormalMap(43, 8, 1.8);
    const pepNormal = getOrganicNormalMap(59, 18, 2.5);
    const basilNormal = getOrganicNormalMap(77, 16, 2.4);

    // Local per-component color textures (disposed on unmount)
    const doughTex = createDoughTexture();
    const pepTex = createPepperoniTexture();

    const baseShape = createWedgeShape(OUTER_RADIUS - 0.08, HALF_ARC - SLICE_GAP);
    const baseSliceGeo = new THREE.ExtrudeGeometry(baseShape, {
      depth: 0.052,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 2,
      curveSegments: 16,
    });
    baseSliceGeo.rotateX(-Math.PI / 2);

    const sauceShape = createWedgeShape(SAUCE_RADIUS, HALF_ARC - SLICE_GAP * 1.15, 0.028);
    const sauceSliceGeo = new THREE.ExtrudeGeometry(sauceShape, {
      depth: 0.018,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.012,
      bevelSegments: 2,
      curveSegments: 16,
    });
    sauceSliceGeo.rotateX(-Math.PI / 2);

    const rimGeos = Array.from({ length: SLICE_COUNT }, (_, i) =>
      createCornicioneGeometry(i + 1.3, i)
    );

    const cheeseGeos = [
      createCheeseBlobGeometry(0.24, 0.19, 1.1, 0.026),
      createCheeseBlobGeometry(0.21, 0.16, 2.7, 0.024),
      createCheeseBlobGeometry(0.19, 0.17, 4.3, 0.025),
    ];

    const pepCupGeo = createPepperoniCupGeometry();
    const pepCharRimGeo = new THREE.TorusGeometry(0.176, 0.013, 12, 28);
    pepCharRimGeo.rotateX(Math.PI / 2);
    displaceGeometryOrganic(pepCharRimGeo, {
      amplitude: 0.004,
      frequency: 12.5,
      seed: 311,
      preserveSeam: true,
    });

    const pepGreaseGeo = new THREE.CircleGeometry(0.114, 22);
    pepGreaseGeo.rotateX(-Math.PI / 2);

    const basilLeafGeo = createBasilLeafGeometry();
    const basilStemGeo = new THREE.CylinderGeometry(0.005, 0.007, 0.24, 6);
    const blisterGeo = new THREE.SphereGeometry(1, 14, 10);
    const bubbleGeo = displaceGeometryOrganic(new THREE.SphereGeometry(0.038, 14, 12), {
      amplitude: 0.005,
      frequency: 14,
      seed: 241,
      preserveSeam: true,
    });
    const boardGeo = new THREE.CylinderGeometry(1.64, 1.68, 0.055, 48);

    // v3 Look-Dev PBR Materials with 512x512 RGB Normal Maps & Backlit Food SSS
    const boardMat = new THREE.MeshStandardMaterial({
      color: '#D8B392',
      map: boardWood.map,
      normalMap: boardWood.normalMap,
      normalScale: new THREE.Vector2(0.7, 0.7),
      roughnessMap: boardWood.roughnessMap,
      roughness: 0.85,
      metalness: 0.02,
    });

    const crustBaseMat = new THREE.MeshStandardMaterial({
      color: '#EDD0A2',
      map: doughTex,
      normalMap: crustPbr.normalMap,
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughnessMap: crustPbr.roughnessMap,
      roughness: 0.92,
      metalness: 0.0,
    });

    const cornicioneMat = new THREE.MeshStandardMaterial({
      color: '#E6BD83',
      map: doughTex,
      normalMap: crustPbr.normalMap,
      normalScale: new THREE.Vector2(1.05, 1.05),
      roughnessMap: crustPbr.roughnessMap,
      roughness: 0.94,
      metalness: 0.0,
    });

    // Ultra-matte charred leopard-spot blisters contrasting against warm baked dough
    const charBlisterMat = new THREE.MeshStandardMaterial({
      color: '#291910',
      normalMap: charNormal,
      normalScale: new THREE.Vector2(0.95, 0.95),
      roughness: 0.96,
      metalness: 0.0,
    });

    // Deep crushed San Marzano tomato sauce with glossy extra-virgin olive-oil sheen
    const sauceMat = new THREE.MeshPhysicalMaterial({
      color: '#B81F14',
      normalMap: sauceNormal,
      normalScale: new THREE.Vector2(0.65, 0.65),
      roughness: 0.16,
      metalness: 0.0,
      clearcoat: 0.92,
      clearcoatRoughness: 0.08,
    });

    const sauceChunkMat = new THREE.MeshPhysicalMaterial({
      color: '#91160E',
      normalMap: sauceNormal,
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughness: 0.22,
      clearcoat: 0.78,
    });

    // Creamy melted Fior di Latte mozzarella with warm backlit SSS translucency
    const cheeseMat = applyFoodSSS(
      new THREE.MeshPhysicalMaterial({
        color: '#FCF5E2',
        normalMap: cheeseNormal,
        normalScale: new THREE.Vector2(0.55, 0.55),
        roughness: 0.24,
        metalness: 0.0,
        clearcoat: 0.58,
        clearcoatRoughness: 0.16,
        sheen: 0.45,
        sheenColor: new THREE.Color('#FFF2CC'),
        sheenRoughness: 0.35,
      }),
      { color: '#FFF2CE', intensity: 0.45, power: 2.6, scale: 1.15 }
    );

    const cheeseBubbleMat = applyFoodSSS(
      new THREE.MeshPhysicalMaterial({
        color: '#DD9B44',
        normalMap: cheeseNormal,
        normalScale: new THREE.Vector2(0.65, 0.65),
        roughness: 0.32,
        clearcoat: 0.54,
        clearcoatRoughness: 0.2,
      }),
      { color: '#FFCF86', intensity: 0.28, power: 2.8, scale: 1.0 }
    );

    // High-contrast cup-and-char pepperoni: cured spiced body, dark crispy rim, mirror oil pool
    const pepMat = new THREE.MeshPhysicalMaterial({
      color: '#C22C1F',
      map: pepTex,
      normalMap: pepNormal,
      normalScale: new THREE.Vector2(0.75, 0.75),
      roughness: 0.2,
      metalness: 0.02,
      clearcoat: 0.86,
      clearcoatRoughness: 0.12,
    });

    const pepCharMat = new THREE.MeshStandardMaterial({
      color: '#5A100A',
      normalMap: pepNormal,
      normalScale: new THREE.Vector2(0.95, 0.95),
      roughness: 0.68,
      metalness: 0.02,
    });

    const pepGreaseMat = new THREE.MeshPhysicalMaterial({
      color: '#DF5016',
      roughness: 0.04,
      metalness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      ior: 1.46,
      reflectivity: 1.0,
      transparent: true,
      opacity: 0.78,
    });

    // Fresh veined sweet basil glowing warmly where backlit
    const basilMat = applyFoodSSS(
      new THREE.MeshPhysicalMaterial({
        color: '#347A26',
        normalMap: basilNormal,
        normalScale: new THREE.Vector2(0.75, 0.75),
        roughness: 0.32,
        metalness: 0.0,
        clearcoat: 0.34,
        clearcoatRoughness: 0.26,
        sheen: 0.28,
        sheenColor: new THREE.Color('#74C35C'),
        sheenRoughness: 0.45,
        side: THREE.DoubleSide,
      }),
      { color: '#88E050', intensity: 0.55, power: 2.2, scale: 1.2 }
    );

    const basilVeinMat = new THREE.MeshStandardMaterial({
      color: '#5CA646',
      roughness: 0.44,
    });

    return {
      localTextures: [doughTex, pepTex],
      geometries: {
        baseSliceGeo,
        sauceSliceGeo,
        rimGeos,
        cheeseGeos,
        pepCupGeo,
        pepCharRimGeo,
        pepGreaseGeo,
        basilLeafGeo,
        basilStemGeo,
        blisterGeo,
        bubbleGeo,
        boardGeo,
      },
      materials: {
        boardMat,
        crustBaseMat,
        cornicioneMat,
        charBlisterMat,
        sauceMat,
        sauceChunkMat,
        cheeseMat,
        cheeseBubbleMat,
        pepMat,
        pepCharMat,
        pepGreaseMat,
        basilMat,
        basilVeinMat,
      },
    };
  }, []);

  useEffect(() => {
    return () => {
      assets.localTextures.forEach((t) => t?.dispose());
      const g = assets.geometries;
      g.baseSliceGeo.dispose();
      g.sauceSliceGeo.dispose();
      g.rimGeos.forEach((rg) => rg.dispose());
      g.cheeseGeos.forEach((cg) => cg.dispose());
      g.pepCupGeo.dispose();
      g.pepCharRimGeo.dispose();
      g.pepGreaseGeo.dispose();
      g.basilLeafGeo.dispose();
      g.basilStemGeo.dispose();
      g.blisterGeo.dispose();
      g.bubbleGeo.dispose();
      g.boardGeo.dispose();
      Object.values(assets.materials).forEach((m) => m.dispose());
    };
  }, [assets]);

  const otherSliceIndices = [1, 2, 3, 4, 5];

  const renderCrustSlice = (sliceIdx: number) => (
    <group key={`crust-${sliceIdx}`}>
      <mesh
        geometry={assets.geometries.baseSliceGeo}
        material={assets.materials.crustBaseMat}
        position={[0, PIZZA_BASE_Y, 0]}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={assets.geometries.rimGeos[sliceIdx]}
        material={assets.materials.cornicioneMat}
        castShadow
        receiveShadow
      />
      {SLICE_BLISTERS[sliceIdx].map((b, bi) => {
        const r = RIM_CENTER_RADIUS + b.radialOffset;
        return (
          <mesh
            key={bi}
            geometry={assets.geometries.blisterGeo}
            material={assets.materials.charBlisterMat}
            position={[Math.cos(b.phi) * r, PIZZA_BASE_Y + b.yOffset, Math.sin(b.phi) * r]}
            rotation={[0, -b.phi, 0]}
            scale={b.scale}
            castShadow
            receiveShadow
          />
        );
      })}
    </group>
  );

  const renderSauceSlice = (sliceIdx: number) => (
    <group key={`sauce-${sliceIdx}`}>
      <mesh
        geometry={assets.geometries.sauceSliceGeo}
        material={assets.materials.sauceMat}
        position={[0, PIZZA_BASE_Y + 0.064, 0]}
        receiveShadow
      />
      <mesh
        geometry={assets.geometries.blisterGeo}
        material={assets.materials.sauceChunkMat}
        position={[0.62, PIZZA_BASE_Y + 0.088, 0.1 * (sliceIdx % 2 === 0 ? 1 : -1)]}
        scale={[0.065, 0.014, 0.048]}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={assets.geometries.blisterGeo}
        material={assets.materials.sauceChunkMat}
        position={[0.98, PIZZA_BASE_Y + 0.088, -0.14 * (sliceIdx % 2 === 0 ? 1 : -1)]}
        scale={[0.052, 0.012, 0.044]}
        castShadow
        receiveShadow
      />
    </group>
  );

  const renderCheeseForSlice = (sliceIdx: number) =>
    CHEESE_PLACEMENTS.filter((c) => c.sliceIndex === sliceIdx).map((c, idx) => {
      const x = Math.cos(c.phi) * c.r;
      const z = Math.sin(c.phi) * c.r;
      return (
        <group key={`cheese-${sliceIdx}-${idx}`} position={[x, PIZZA_BASE_Y + 0.084, z]}>
          <mesh
            geometry={assets.geometries.cheeseGeos[c.blobIndex]}
            material={assets.materials.cheeseMat}
            rotation={[0, c.rotY, 0]}
            castShadow
            receiveShadow
          />
          {c.hasBubble && (
            <mesh
              geometry={assets.geometries.bubbleGeo}
              material={assets.materials.cheeseBubbleMat}
              position={[0.04, 0.032, -0.02]}
              scale={[1.25, 0.48, 0.98]}
              castShadow
              receiveShadow
            />
          )}
        </group>
      );
    });

  const renderPepperoniForSlice = (sliceIdx: number) =>
    PEPPERONI_PLACEMENTS.filter((p) => p.sliceIndex === sliceIdx).map((p, idx) => {
      const x = Math.cos(p.phi) * p.r;
      const z = Math.sin(p.phi) * p.r;
      const s = p.scale ?? 1;
      return (
        <group
          key={`pep-${sliceIdx}-${idx}`}
          position={[x, PIZZA_BASE_Y + 0.118, z]}
          rotation={[0.03 * (idx % 2 === 0 ? 1 : -1), p.rotY ?? 0, 0.03]}
          scale={s}
        >
          <mesh
            geometry={assets.geometries.pepCupGeo}
            material={assets.materials.pepMat}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={assets.geometries.pepCharRimGeo}
            material={assets.materials.pepCharMat}
            position={[0, 0.042, 0]}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={assets.geometries.pepGreaseGeo}
            material={assets.materials.pepGreaseMat}
            position={[0, 0.017, 0]}
            receiveShadow
          />
        </group>
      );
    });

  const renderBasilForSlice = (sliceIdx: number) =>
    BASIL_PLACEMENTS.filter((b) => b.sliceIndex === sliceIdx).map((b, idx) => {
      const x = Math.cos(b.phi) * b.r;
      const z = Math.sin(b.phi) * b.r;
      const s = b.scale ?? 1;
      return (
        <group
          key={`basil-${sliceIdx}-${idx}`}
          position={[x, PIZZA_BASE_Y + 0.162, z]}
          rotation={[0.08, b.rotY ?? 0, -0.06]}
          scale={s}
        >
          <mesh
            geometry={assets.geometries.basilLeafGeo}
            material={assets.materials.basilMat}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={assets.geometries.basilStemGeo}
            material={assets.materials.basilVeinMat}
            position={[-0.04, 0.025, 0]}
            rotation={[0, 0, Math.PI / 2 - 0.05]}
            castShadow
          />
        </group>
      );
    });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. BLISTERED NEAPOLITAN CRUST (+ warm wood board underneath) */}
      <FoodLayer
        partId="crust"
        label="Blistered Neapolitan Crust"
        explodeY={-0.2}
        pinPosition={[-1.55, 0.2, 0.3]}
        exploded={exploded}
        highlighted={highlightedPart === 'crust'}
        onSelect={onSelectPart}
      >
        <mesh
          geometry={assets.geometries.boardGeo}
          material={assets.materials.boardMat}
          position={[0, -0.43, 0]}
          castShadow
          receiveShadow
        />

        {otherSliceIndices.map((idx) => (
          <group key={idx} rotation={[0, -(HERO_CENTER_ANGLE + idx * SLICE_ARC), 0]}>
            {renderCrustSlice(idx)}
          </group>
        ))}

        <HeroSliceMover
          hovered={hoveredSlice}
          layerKey="crust"
          onHeroEnter={handleHeroEnter}
          onHeroLeave={handleHeroLeave}
        >
          {renderCrustSlice(0)}
        </HeroSliceMover>
      </FoodLayer>

      {/* 2. SAN MARZANO TOMATO SAUCE */}
      <FoodLayer
        partId="sauce"
        label="San Marzano Tomato Sauce"
        explodeY={0.25}
        pinPosition={[1.4, 0.25, -0.3]}
        exploded={exploded}
        highlighted={highlightedPart === 'sauce'}
        onSelect={onSelectPart}
      >
        {otherSliceIndices.map((idx) => (
          <group key={idx} rotation={[0, -(HERO_CENTER_ANGLE + idx * SLICE_ARC), 0]}>
            {renderSauceSlice(idx)}
          </group>
        ))}

        <HeroSliceMover
          hovered={hoveredSlice}
          layerKey="sauce"
          onHeroEnter={handleHeroEnter}
          onHeroLeave={handleHeroLeave}
        >
          {renderSauceSlice(0)}
        </HeroSliceMover>
      </FoodLayer>

      {/* 3. FIOR DI LATTE MOZZARELLA */}
      <FoodLayer
        partId="cheese"
        label="Fior di Latte Mozzarella"
        explodeY={0.65}
        pinPosition={[-1.35, 0.45, -0.35]}
        exploded={exploded}
        highlighted={highlightedPart === 'cheese'}
        onSelect={onSelectPart}
      >
        {otherSliceIndices.map((idx) => (
          <group key={idx} rotation={[0, -(HERO_CENTER_ANGLE + idx * SLICE_ARC), 0]}>
            {renderCheeseForSlice(idx)}
          </group>
        ))}

        <HeroSliceMover
          hovered={hoveredSlice}
          layerKey="cheese"
          onHeroEnter={handleHeroEnter}
          onHeroLeave={handleHeroLeave}
        >
          {renderCheeseForSlice(0)}
        </HeroSliceMover>
      </FoodLayer>

      {/* 4. CURLED PEPPERONI CUPS */}
      <FoodLayer
        partId="pepperoni"
        label="Curled Pepperoni Cups"
        explodeY={1.05}
        pinPosition={[1.35, 0.65, 0.35]}
        exploded={exploded}
        highlighted={highlightedPart === 'pepperoni'}
        onSelect={onSelectPart}
      >
        {otherSliceIndices.map((idx) => (
          <group key={idx} rotation={[0, -(HERO_CENTER_ANGLE + idx * SLICE_ARC), 0]}>
            {renderPepperoniForSlice(idx)}
          </group>
        ))}

        <HeroSliceMover
          hovered={hoveredSlice}
          layerKey="pepperoni"
          onHeroEnter={handleHeroEnter}
          onHeroLeave={handleHeroLeave}
        >
          {renderPepperoniForSlice(0)}
        </HeroSliceMover>
      </FoodLayer>

      {/* 5. FRESH SWEET BASIL */}
      <FoodLayer
        partId="basil"
        label="Fresh Sweet Basil"
        explodeY={1.45}
        pinPosition={[0.0, 0.85, 0.5]}
        exploded={exploded}
        highlighted={highlightedPart === 'basil'}
        onSelect={onSelectPart}
      >
        {otherSliceIndices.map((idx) => (
          <group key={idx} rotation={[0, -(HERO_CENTER_ANGLE + idx * SLICE_ARC), 0]}>
            {renderBasilForSlice(idx)}
          </group>
        ))}

        <HeroSliceMover
          hovered={hoveredSlice}
          layerKey="basil"
          onHeroEnter={handleHeroEnter}
          onHeroLeave={handleHeroLeave}
        >
          {renderBasilForSlice(0)}
        </HeroSliceMover>
      </FoodLayer>
    </group>
  );
}

export default PizzaModel;

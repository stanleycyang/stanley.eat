'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FoodModelProps } from '@/types/dish';
import {
  applyFoodSSS,
  createPbrBrothMaterial,
  displaceGeometryOrganic,
  getOrganicNormalMap,
  getSlateTextures,
  updateBrothMaterial,
} from '@/lib/proceduralTextures';
import { FoodLayer } from './FoodLayer';

interface BubbleSpec {
  x: number;
  z: number;
  baseR: number;
  speed: number;
  phase: number;
}

interface FloatingItem {
  pos: [number, number, number];
  rot: [number, number, number];
  scale?: number;
  phase: number;
}

const NORMAL_SCALE_STEEL = new THREE.Vector2(0.45, 0.45);
const NORMAL_SCALE_GRIP = new THREE.Vector2(0.7, 0.7);
const NORMAL_SCALE_CHILI = new THREE.Vector2(0.75, 0.75);
const NORMAL_SCALE_SPICE = new THREE.Vector2(0.8, 0.8);

// Bubbles placed strictly inside the left S-curve Mala half (u = x, v = -z)
const MALA_BUBBLES: BubbleSpec[] = [
  { x: -0.68, z: -0.34, baseR: 0.048, speed: 2.6, phase: 0.0 },
  { x: -0.36, z: -0.68, baseR: 0.042, speed: 3.1, phase: 1.1 },
  { x: 0.14, z: -0.62, baseR: 0.052, speed: 2.3, phase: 2.2 },
  { x: -0.86, z: 0.04, baseR: 0.04, speed: 2.9, phase: 0.6 },
  { x: -0.44, z: -0.18, baseR: 0.055, speed: 2.1, phase: 3.4 },
  { x: -0.78, z: 0.36, baseR: 0.036, speed: 3.3, phase: 1.8 },
  { x: -0.12, z: -0.84, baseR: 0.044, speed: 2.7, phase: 4.1 },
  { x: 0.28, z: -0.46, baseR: 0.038, speed: 3.0, phase: 2.9 },
  { x: -0.96, z: -0.24, baseR: 0.036, speed: 2.5, phase: 5.0 },
  { x: -0.22, z: -0.38, baseR: 0.046, speed: 2.8, phase: 0.9 },
  { x: -0.62, z: -0.72, baseR: 0.04, speed: 2.4, phase: 3.7 },
  { x: -0.74, z: 0.16, baseR: 0.042, speed: 3.2, phase: 4.8 },
];

// Gentle bubbles placed strictly inside the right S-curve Bone Broth half
const BONE_BUBBLES: BubbleSpec[] = [
  { x: 0.64, z: 0.34, baseR: 0.044, speed: 1.9, phase: 0.4 },
  { x: 0.32, z: 0.72, baseR: 0.038, speed: 2.2, phase: 1.6 },
  { x: -0.16, z: 0.62, baseR: 0.046, speed: 1.7, phase: 2.7 },
  { x: 0.88, z: -0.06, baseR: 0.036, speed: 2.1, phase: 3.9 },
  { x: 0.44, z: 0.16, baseR: 0.042, speed: 2.0, phase: 0.9 },
  { x: 0.84, z: -0.36, baseR: 0.034, speed: 2.4, phase: 5.1 },
  { x: 0.06, z: 0.88, baseR: 0.04, speed: 1.8, phase: 2.1 },
  { x: 0.72, z: 0.6, baseR: 0.036, speed: 2.3, phase: 4.4 },
];

// Curled dried Sichuan chilies on the Mala side
const CHILI_PODS: FloatingItem[] = [
  { pos: [-0.66, 0.13, -0.28], rot: [0.08, 0.5, 0.05], scale: 1.05, phase: 0.2 },
  { pos: [-0.26, 0.135, -0.68], rot: [-0.06, 2.1, 0.08], scale: 0.98, phase: 1.3 },
  { pos: [0.16, 0.13, -0.56], rot: [0.05, -0.9, -0.06], scale: 0.94, phase: 2.4 },
  { pos: [-0.84, 0.128, 0.18], rot: [0.1, 1.4, -0.04], scale: 0.92, phase: 3.5 },
  { pos: [-0.46, 0.132, -0.04], rot: [-0.05, 2.8, 0.06], scale: 0.88, phase: 4.2 },
  { pos: [-0.56, 0.13, -0.64], rot: [0.07, 0.1, -0.08], scale: 0.9, phase: 5.1 },
  { pos: [-0.74, 0.126, 0.44], rot: [-0.08, -1.6, 0.05], scale: 0.84, phase: 1.9 },
];

// Clusters of tiny dark Sichuan peppercorns on the Mala side
const PEPPERCORNS: [number, number, number][] = [
  [-0.54, 0.125, -0.44], [-0.49, 0.125, -0.48], [-0.57, 0.125, -0.49],
  [-0.28, 0.125, -0.34], [-0.23, 0.125, -0.31], [-0.31, 0.125, -0.29],
  [0.04, 0.125, -0.78], [0.09, 0.125, -0.74], [-0.01, 0.125, -0.73],
  [-0.86, 0.125, -0.14], [-0.91, 0.125, -0.18], [-0.82, 0.125, -0.21],
  [-0.68, 0.125, 0.12], [-0.63, 0.125, 0.16], [-0.72, 0.125, 0.08],
  [0.24, 0.125, -0.42], [0.28, 0.125, -0.47], [0.2, 0.125, -0.48],
  [-0.38, 0.125, -0.82], [-0.43, 0.125, -0.79],
  [-0.88, 0.125, 0.34], [-0.83, 0.125, 0.38],
];

// Scallion baton segments floating on the Mala side
const SCALLION_BATONS: FloatingItem[] = [
  { pos: [-0.34, 0.125, -0.48], rot: [0.1, 0.8, Math.PI / 2], phase: 0.8 },
  { pos: [-0.78, 0.124, -0.06], rot: [-0.08, 2.2, Math.PI / 2], phase: 2.5 },
  { pos: [0.06, 0.126, -0.42], rot: [0.06, -0.5, Math.PI / 2], phase: 4.0 },
];

// Helper to sample the authentic Yin-Yang S-curve from (0, +R) down to (0, -R)
function sampleSCurvePoints(
  radius: number,
  halfSegments: number
): { x: number; y: number; nx: number; ny: number }[] {
  const r = radius / 2;
  const result: { x: number; y: number; nx: number; ny: number }[] = [];

  for (let i = 0; i <= halfSegments; i++) {
    const t = (i / halfSegments) * Math.PI;
    const x = r * Math.sin(t);
    const y = r + r * Math.cos(t);
    const nx = -Math.sin(t);
    const ny = -Math.cos(t);
    result.push({ x, y, nx, ny });
  }

  for (let i = 1; i <= halfSegments; i++) {
    const t = (i / halfSegments) * Math.PI;
    const x = -r * Math.sin(t);
    const y = -r + r * Math.cos(t);
    const nx = -Math.sin(t);
    const ny = Math.cos(t);
    result.push({ x, y, nx, ny });
  }

  return result;
}

export function HotPotModel({
  exploded,
  highlightedPart,
  onSelectPart,
}: FoodModelProps) {
  const malaBubbleRefs = useRef<(THREE.Mesh | null)[]>([]);
  const boneBubbleRefs = useRef<(THREE.Mesh | null)[]>([]);
  const chiliRefs = useRef<(THREE.Group | null)[]>([]);
  const spiceClusterRef = useRef<THREE.Group>(null);
  const toppingRefs = useRef<(THREE.Group | null)[]>([]);

  const handleSelect = (partId: string) => {
    onSelectPart(highlightedPart === partId ? null : partId);
  };

  // Shared cached 512x512 Sobel RGB procedural textures (NEVER dispose cached singletons)
  const brushedSteelNormal = useMemo(() => getOrganicNormalMap(503, 18, 0.9), []);
  const gripSlateTex = useMemo(() => getSlateTextures(), []);
  const organicNormal = useMemo(() => getOrganicNormalMap(547, 12, 1.7), []);

  // Per-instance opaque real PBR studio-reflecting broths + Food SSS materials (disposed on unmount)
  const malaBrothMat = useMemo(
    () =>
      createPbrBrothMaterial({
        baseColor: '#9E130B',
        oilColor: '#E83414',
        sheenColor: '#FFB070',
        isSpicy: true,
        opacity: 1.0,
      }),
    []
  );

  const boneBrothMat = useMemo(
    () =>
      createPbrBrothMaterial({
        baseColor: '#EADBC2',
        oilColor: '#FFF3D6',
        sheenColor: '#FFFDF6',
        isSpicy: false,
        opacity: 1.0,
      }),
    []
  );

  const lotusMat = useMemo(
    () =>
      applyFoodSSS(
        new THREE.MeshPhysicalMaterial({
          color: '#EFE0C6',
          normalMap: organicNormal,
          normalScale: new THREE.Vector2(0.45, 0.45),
          roughness: 0.28,
          clearcoat: 0.48,
          clearcoatRoughness: 0.18,
          emissive: new THREE.Color('#6E542C'),
          emissiveIntensity: 0,
        }),
        { color: '#F8E6C8', intensity: 0.5, power: 2.4, scale: 1.15 }
      ),
    [organicNormal]
  );

  const bokStemMat = useMemo(
    () =>
      applyFoodSSS(
        new THREE.MeshPhysicalMaterial({
          color: '#CBE6A8',
          normalMap: organicNormal,
          normalScale: new THREE.Vector2(0.38, 0.38),
          roughness: 0.22,
          clearcoat: 0.58,
          clearcoatRoughness: 0.16,
          emissive: new THREE.Color('#3A5E1E'),
          emissiveIntensity: 0,
        }),
        { color: '#A8E078', intensity: 0.48, power: 2.3, scale: 1.15 }
      ),
    [organicNormal]
  );

  const bokLeafMat = useMemo(
    () =>
      applyFoodSSS(
        new THREE.MeshPhysicalMaterial({
          color: '#347836',
          normalMap: organicNormal,
          normalScale: new THREE.Vector2(0.62, 0.62),
          roughness: 0.3,
          clearcoat: 0.48,
          clearcoatRoughness: 0.2,
          emissive: new THREE.Color('#184A16'),
          emissiveIntensity: 0,
        }),
        { color: '#58B842', intensity: 0.44, power: 2.3, scale: 1.12 }
      ),
    [organicNormal]
  );

  const beefRollMeatMat = useMemo(
    () =>
      applyFoodSSS(
        new THREE.MeshPhysicalMaterial({
          color: '#A43838',
          normalMap: organicNormal,
          normalScale: new THREE.Vector2(0.68, 0.68),
          roughness: 0.26,
          clearcoat: 0.58,
          clearcoatRoughness: 0.16,
          emissive: new THREE.Color('#7A1C1C'),
          emissiveIntensity: 0,
        }),
        { color: '#D8645A', intensity: 0.46, power: 2.4, scale: 1.15 }
      ),
    [organicNormal]
  );

  // Brushed stainless-steel pot + handles + S-curve divider wall
  const { potGeo, dividerGeo, handleGeo } = useMemo(() => {
    const potPts = [
      new THREE.Vector2(0.0, -0.48),
      new THREE.Vector2(0.92, -0.48),
      new THREE.Vector2(1.04, -0.42),
      new THREE.Vector2(1.18, -0.26),
      new THREE.Vector2(1.26, -0.02),
      new THREE.Vector2(1.29, 0.2),
      new THREE.Vector2(1.38, 0.24),
      new THREE.Vector2(1.4, 0.265),
      new THREE.Vector2(1.35, 0.275),
      new THREE.Vector2(1.25, 0.23),
      new THREE.Vector2(1.21, -0.02),
      new THREE.Vector2(1.12, -0.26),
      new THREE.Vector2(0.94, -0.39),
      new THREE.Vector2(0.0, -0.4),
    ];
    const pot = new THREE.LatheGeometry(potPts, 64);
    pot.computeVertexNormals();

    const R = 1.24;
    const samples = sampleSCurvePoints(R, 28);
    const halfT = 0.026;
    const divShape = new THREE.Shape();
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const px = s.x + s.nx * halfT;
      const py = s.y + s.ny * halfT;
      if (i === 0) divShape.moveTo(px, py);
      else divShape.lineTo(px, py);
    }
    for (let i = samples.length - 1; i >= 0; i--) {
      const s = samples[i];
      const px = s.x - s.nx * halfT;
      const py = s.y - s.ny * halfT;
      divShape.lineTo(px, py);
    }
    divShape.closePath();

    const divider = new THREE.ExtrudeGeometry(divShape, {
      depth: 0.62,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.006,
      bevelSegments: 2,
    });
    divider.rotateX(-Math.PI / 2);
    divider.translate(0, -0.39, 0);
    // Taper divider lower corners inward to match the curved stainless pot inner belly cleanly
    const divPos = divider.attributes.position;
    for (let i = 0; i < divPos.count; i++) {
      const y = divPos.getY(i);
      if (y < -0.02) {
        const t = THREE.MathUtils.clamp((-0.02 - y) / 0.37, 0, 1);
        const shrink = 1 - t * t * 0.24;
        divPos.setX(i, divPos.getX(i) * shrink);
        divPos.setZ(i, divPos.getZ(i) * shrink);
      }
    }
    divPos.needsUpdate = true;
    divider.computeVertexNormals();

    const hCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.0, 0.04, -0.26),
      new THREE.Vector3(0.24, 0.1, -0.2),
      new THREE.Vector3(0.32, 0.12, 0.0),
      new THREE.Vector3(0.24, 0.1, 0.2),
      new THREE.Vector3(0.0, 0.04, 0.26),
    ]);
    const handle = new THREE.TubeGeometry(hCurve, 28, 0.036, 12, false);

    return { potGeo: pot, dividerGeo: divider, handleGeo: handle };
  }, []);

  // Matching Left (Mala) & Right (Bone) S-curve broth volumes cleanly inset inside pot wall & divider
  const { malaBrothGeo, boneBrothGeo, malaMeniscusGeo, boneMeniscusGeo } = useMemo(() => {
    const R = 1.165;
    const gap = 0.042;
    const arcSteps = 32;
    const sSamples = sampleSCurvePoints(R, 26);

    // Taper lower extruded vertices slightly inward so the bottom never pokes through the curved pot belly
    const taperLowerPotFit = (geo: THREE.BufferGeometry) => {
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        if (y < -0.02) {
          const t = THREE.MathUtils.clamp((-0.02 - y) / 0.16, 0, 1);
          const shrink = 1 - t * 0.06;
          pos.setX(i, pos.getX(i) * shrink);
          pos.setZ(i, pos.getZ(i) * shrink);
        }
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    };

    const malaShape = new THREE.Shape();
    for (let i = 0; i <= arcSteps; i++) {
      const a = Math.PI / 2 + (i / arcSteps) * Math.PI;
      const px = Math.cos(a) * R;
      const py = Math.sin(a) * R;
      if (i === 0) malaShape.moveTo(px, py);
      else malaShape.lineTo(px, py);
    }
    for (let i = sSamples.length - 1; i >= 0; i--) {
      const s = sSamples[i];
      const edgeTaper = Math.sin((i / (sSamples.length - 1)) * Math.PI);
      malaShape.lineTo(s.x + s.nx * gap * edgeTaper, s.y + s.ny * gap * edgeTaper);
    }
    malaShape.closePath();

    const malaGeo = new THREE.ExtrudeGeometry(malaShape, {
      depth: 0.24,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.01,
      bevelSegments: 3,
    });
    malaGeo.rotateX(-Math.PI / 2);
    malaGeo.translate(0, -0.15, 0);
    taperLowerPotFit(malaGeo);

    const boneShape = new THREE.Shape();
    for (let i = 0; i <= arcSteps; i++) {
      const a = -Math.PI / 2 + (i / arcSteps) * Math.PI;
      const px = Math.cos(a) * R;
      const py = Math.sin(a) * R;
      if (i === 0) boneShape.moveTo(px, py);
      else boneShape.lineTo(px, py);
    }
    for (let i = 0; i < sSamples.length; i++) {
      const s = sSamples[i];
      const edgeTaper = Math.sin((i / (sSamples.length - 1)) * Math.PI);
      boneShape.lineTo(s.x - s.nx * gap * edgeTaper, s.y - s.ny * gap * edgeTaper);
    }
    boneShape.closePath();

    const boneGeo = new THREE.ExtrudeGeometry(boneShape, {
      depth: 0.24,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.01,
      bevelSegments: 3,
    });
    boneGeo.rotateX(-Math.PI / 2);
    boneGeo.translate(0, -0.15, 0);
    taperLowerPotFit(boneGeo);

    // Closed capillary meniscus tubes cleanly above broth surface (y = 0.104 -> meniscus y = 0.114)
    const meniscusY = 0.114;
    const malaLoopPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI / 2 + (i / 24) * Math.PI;
      malaLoopPts.push(new THREE.Vector3(Math.cos(a) * 1.185, meniscusY, -Math.sin(a) * 1.185));
    }
    for (let i = sSamples.length - 2; i >= 1; i--) {
      const s = sSamples[i];
      const edgeTaper = Math.sin((i / (sSamples.length - 1)) * Math.PI);
      malaLoopPts.push(
        new THREE.Vector3(s.x + s.nx * 0.044 * edgeTaper, meniscusY, -(s.y + s.ny * 0.044 * edgeTaper))
      );
    }
    const malaMeniscus = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(malaLoopPts, true),
      84,
      0.013,
      8,
      true
    );

    const boneLoopPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = -Math.PI / 2 + (i / 24) * Math.PI;
      boneLoopPts.push(new THREE.Vector3(Math.cos(a) * 1.185, meniscusY, -Math.sin(a) * 1.185));
    }
    for (let i = 1; i < sSamples.length - 1; i++) {
      const s = sSamples[i];
      const edgeTaper = Math.sin((i / (sSamples.length - 1)) * Math.PI);
      boneLoopPts.push(
        new THREE.Vector3(s.x - s.nx * 0.044 * edgeTaper, meniscusY, -(s.y - s.ny * 0.044 * edgeTaper))
      );
    }
    const boneMeniscus = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(boneLoopPts, true),
      84,
      0.013,
      8,
      true
    );

    return {
      malaBrothGeo: malaGeo,
      boneBrothGeo: boneGeo,
      malaMeniscusGeo: malaMeniscus,
      boneMeniscusGeo: boneMeniscus,
    };
  }, []);

  // Organically crinkled dried Sichuan chili pod geometry
  const chiliPodGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.18, 0.0, -0.05),
      new THREE.Vector3(-0.07, 0.03, 0.06),
      new THREE.Vector3(0.06, 0.02, 0.07),
      new THREE.Vector3(0.17, -0.01, -0.02),
      new THREE.Vector3(0.22, -0.02, -0.09),
    ]);
    const geo = new THREE.TubeGeometry(curve, 26, 0.032, 10, false);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const t = THREE.MathUtils.clamp((x + 0.18) / 0.4, 0, 1);
      const taper = 1 - t * 0.62;
      const centerPt = curve.getPoint(t);
      pos.setY(i, centerPt.y + (pos.getY(i) - centerPt.y) * taper);
      pos.setZ(i, centerPt.z + (pos.getZ(i) - centerPt.z) * taper);
    }
    displaceGeometryOrganic(geo, {
      amplitude: 0.0085,
      frequency: 16.5,
      seed: 521,
      preserveSeam: true,
    });
    return geo;
  }, []);

  // Sculptural lotus root slice WITH real perforated holes + subtle organic irregularity
  const lotusGeo = useMemo(() => {
    const outerR = 0.25;
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);

    const centerHole = new THREE.Path();
    centerHole.absarc(0, 0, 0.028, 0, Math.PI * 2, true);
    shape.holes.push(centerHole);

    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2;
      const hx = Math.cos(ang) * 0.132;
      const hy = Math.sin(ang) * 0.132;
      const hole = new THREE.Path();
      hole.absarc(hx, hy, 0.042, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.055,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.008,
      bevelSegments: 2,
      curveSegments: 28,
    });
    geo.rotateX(-Math.PI / 2);
    geo.center();
    displaceGeometryOrganic(geo, {
      amplitude: 0.0055,
      frequency: 11.0,
      seed: 591,
      preserveSeam: true,
    });
    return geo;
  }, []);

  // Organically ruffled baby bok choy leaf blade geometry
  const bokChoyLeafGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(0.08, 0.08, 0.18, 0.16, 0.15, 0.3);
    s.bezierCurveTo(0.11, 0.4, -0.11, 0.4, -0.15, 0.3);
    s.bezierCurveTo(-0.18, 0.16, -0.08, 0.08, 0, 0);
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 0.016,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
      bevelSegments: 2,
    });
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      pos.setY(i, y + Math.sin(x * 16) * 0.014 + Math.abs(x) * 0.16 + -z * 0.18);
    }
    displaceGeometryOrganic(geo, {
      amplitude: 0.01,
      frequency: 14.0,
      seed: 563,
      preserveSeam: true,
    });
    return geo;
  }, []);

  // Organically sculpted spiraled marbled beef roll geometry (clean Z end-cap clearance)
  const { beefSpiralMeatGeo, beefSpiralFatGeo } = useMemo(() => {
    const makeSpiral = (thickness: number, offsetR: number, depth: number, seed: number) => {
      const pts: THREE.Vector2[] = [];
      const steps = 42;
      const maxTheta = Math.PI * 3.6;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const theta = t * maxTheta;
        const r = 0.025 + t * 0.095 + offsetR;
        pts.push(new THREE.Vector2(Math.cos(theta) * r, Math.sin(theta) * r));
      }

      const shape = new THREE.Shape();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const prev = pts[Math.max(0, i - 1)];
        const next = pts[Math.min(pts.length - 1, i + 1)];
        const tx = next.x - prev.x;
        const ty = next.y - prev.y;
        const len = Math.hypot(tx, ty) || 1;
        const nx = -ty / len;
        const ny = tx / len;
        const ox = p.x + nx * (thickness / 2);
        const oy = p.y + ny * (thickness / 2);
        if (i === 0) shape.moveTo(ox, oy);
        else shape.lineTo(ox, oy);
      }
      for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];
        const prev = pts[Math.max(0, i - 1)];
        const next = pts[Math.min(pts.length - 1, i + 1)];
        const tx = next.x - prev.x;
        const ty = next.y - prev.y;
        const len = Math.hypot(tx, ty) || 1;
        const nx = -ty / len;
        const ny = tx / len;
        shape.lineTo(p.x - nx * (thickness / 2), p.y - ny * (thickness / 2));
      }
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.006,
        bevelSegments: 2,
      });
      geo.center();
      displaceGeometryOrganic(geo, {
        amplitude: 0.007,
        frequency: 15.0,
        seed,
        preserveSeam: true,
      });
      return geo;
    };

    return {
      beefSpiralMeatGeo: makeSpiral(0.022, 0, 0.28, 577),
      beefSpiralFatGeo: makeSpiral(0.011, 0.017, 0.288, 577),
    };
  }, []);

  useEffect(() => {
    return () => {
      potGeo.dispose();
      dividerGeo.dispose();
      handleGeo.dispose();
      malaBrothGeo.dispose();
      boneBrothGeo.dispose();
      malaMeniscusGeo.dispose();
      boneMeniscusGeo.dispose();
      chiliPodGeo.dispose();
      lotusGeo.dispose();
      bokChoyLeafGeo.dispose();
      beefSpiralMeatGeo.dispose();
      beefSpiralFatGeo.dispose();
      malaBrothMat.dispose();
      boneBrothMat.dispose();
      lotusMat.dispose();
      bokStemMat.dispose();
      bokLeafMat.dispose();
      beefRollMeatMat.dispose();
    };
  }, [
    potGeo,
    dividerGeo,
    handleGeo,
    malaBrothGeo,
    boneBrothGeo,
    malaMeniscusGeo,
    boneMeniscusGeo,
    chiliPodGeo,
    lotusGeo,
    bokChoyLeafGeo,
    beefSpiralMeatGeo,
    beefSpiralFatGeo,
    malaBrothMat,
    boneBrothMat,
    lotusMat,
    bokStemMat,
    bokLeafMat,
    beefRollMeatMat,
  ]);

  const isPotHi = highlightedPart === 'pot';
  const isMalaHi = highlightedPart === 'mala-broth';
  const isBoneHi = highlightedPart === 'bone-broth';
  const isSpicesHi = highlightedPart === 'spices';
  const isToppingsHi = highlightedPart === 'toppings';

  useEffect(() => {
    lotusMat.emissiveIntensity = isToppingsHi ? 0.26 : 0;
    bokStemMat.emissiveIntensity = isToppingsHi ? 0.28 : 0;
    bokLeafMat.emissiveIntensity = isToppingsHi ? 0.32 : 0;
    beefRollMeatMat.emissiveIntensity = isToppingsHi ? 0.3 : 0;
  }, [isToppingsHi, lotusMat, bokStemMat, bokLeafMat, beefRollMeatMat]);

  // Real PBR broth flow + simmering bubbles + staggered bobbing spices and toppings
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    updateBrothMaterial(malaBrothMat, t, isMalaHi);
    updateBrothMaterial(boneBrothMat, t, isBoneHi);

    MALA_BUBBLES.forEach((b, i) => {
      const mesh = malaBubbleRefs.current[i];
      if (!mesh) return;
      const cycle = (t * b.speed * 0.45 + b.phase) % 1;
      const scale = Math.sin(cycle * Math.PI) * 1.15 + 0.12;
      mesh.scale.set(scale, scale * 0.55, scale);
      mesh.position.y = 0.114 + Math.sin(cycle * Math.PI) * 0.016;
    });

    BONE_BUBBLES.forEach((b, i) => {
      const mesh = boneBubbleRefs.current[i];
      if (!mesh) return;
      const cycle = (t * b.speed * 0.42 + b.phase) % 1;
      const scale = Math.sin(cycle * Math.PI) * 1.05 + 0.15;
      mesh.scale.set(scale, scale * 0.5, scale);
      mesh.position.y = 0.114 + Math.sin(cycle * Math.PI) * 0.013;
    });

    CHILI_PODS.forEach((c, i) => {
      const grp = chiliRefs.current[i];
      if (!grp) return;
      grp.position.y = c.pos[1] + Math.sin(t * 2.2 + c.phase) * 0.014;
      grp.rotation.z = c.rot[2] + Math.sin(t * 1.8 + c.phase) * 0.06;
    });

    if (spiceClusterRef.current) {
      spiceClusterRef.current.position.y = Math.sin(t * 2.0 + 1.0) * 0.008;
    }

    toppingRefs.current.forEach((grp, idx) => {
      if (!grp) return;
      const phase = idx * 1.15;
      grp.position.y = Math.sin(t * 1.85 + phase) * 0.018;
      grp.rotation.z = Math.sin(t * 1.45 + phase) * 0.035;
      grp.rotation.x = Math.cos(t * 1.3 + phase) * 0.028;
    });
  });

  return (
    <group>
      {/* Layer 1: Brushed Stainless-Steel Divided Yin-Yang Pot */}
      <FoodLayer
        partId="pot"
        label="Divided Yin-Yang Pot"
        explodeY={-0.3}
        exploded={exploded}
        highlighted={isPotHi}
        onSelect={handleSelect}
      >
        <group>
          <mesh geometry={potGeo} castShadow receiveShadow>
            <meshPhysicalMaterial
              color="#CBD1D9"
              normalMap={brushedSteelNormal}
              normalScale={NORMAL_SCALE_STEEL}
              metalness={0.88}
              roughness={0.24}
              clearcoat={0.24}
              clearcoatRoughness={0.32}
              emissive="#4A3528"
              emissiveIntensity={isPotHi ? 0.3 : 0}
            />
          </mesh>

          <mesh position={[0, -0.45, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
            <torusGeometry args={[0.96, 0.035, 12, 56]} />
            <meshStandardMaterial
              color="#525862"
              normalMap={brushedSteelNormal}
              normalScale={NORMAL_SCALE_STEEL}
              metalness={0.82}
              roughness={0.36}
              emissive="#4A3528"
              emissiveIntensity={isPotHi ? 0.26 : 0}
            />
          </mesh>

          <mesh geometry={dividerGeo} castShadow receiveShadow>
            <meshPhysicalMaterial
              color="#D5DBE3"
              normalMap={brushedSteelNormal}
              normalScale={NORMAL_SCALE_STEEL}
              metalness={0.9}
              roughness={0.22}
              clearcoat={0.26}
              clearcoatRoughness={0.28}
              emissive="#5A3A28"
              emissiveIntensity={isPotHi ? 0.32 : 0}
            />
          </mesh>

          {[-1, 1].map((side) => (
            <group
              key={`handle-${side}`}
              position={[side * 1.24, 0.08, 0]}
              scale={[side, 1, 1]}
            >
              <mesh geometry={handleGeo} castShadow receiveShadow>
                <meshStandardMaterial
                  color="#BFC6D0"
                  normalMap={brushedSteelNormal}
                  normalScale={NORMAL_SCALE_STEEL}
                  metalness={0.88}
                  roughness={0.24}
                  emissive="#4A3528"
                  emissiveIntensity={isPotHi ? 0.3 : 0}
                />
              </mesh>
              <mesh position={[0.31, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
                <capsuleGeometry args={[0.046, 0.18, 8, 12]} />
                <meshStandardMaterial
                  color="#2A2827"
                  normalMap={gripSlateTex.normalMap}
                  normalScale={NORMAL_SCALE_GRIP}
                  roughnessMap={gripSlateTex.roughnessMap}
                  roughness={0.85}
                  emissive="#4A2418"
                  emissiveIntensity={isPotHi ? 0.3 : 0}
                />
              </mesh>
              <mesh position={[0.02, 0.04, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.055, 0.055, 0.04, 16]} />
                <meshStandardMaterial color="#AEB6C0" metalness={0.88} roughness={0.26} />
              </mesh>
              {[-0.22, 0.22].map((rz, rIdx) => (
                <mesh key={`rivet-${rIdx}`} position={[0.03, 0.04, rz]}>
                  <sphereGeometry args={[0.022, 10, 10]} />
                  <meshStandardMaterial color="#E6EBF2" metalness={0.94} roughness={0.14} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      </FoodLayer>

      {/* Layer 2: Real PBR Studio-Reflecting Sichuan Mala Chili Broth + Capillary Meniscus */}
      <FoodLayer
        partId="mala-broth"
        label="Sichuan Mala Chili Broth"
        explodeY={0.3}
        pinPosition={[-1.35, 0.35, 0.2]}
        exploded={exploded}
        highlighted={isMalaHi}
        onSelect={handleSelect}
      >
        <group>
          <mesh geometry={malaBrothGeo} material={malaBrothMat} receiveShadow />

          {/* Glistening crimson chili-oil meniscus hugging the steel wall & S-curve divider */}
          <mesh geometry={malaMeniscusGeo} renderOrder={2}>
            <meshPhysicalMaterial
              color="#D42812"
              transparent
              opacity={0.86}
              depthWrite={false}
              roughness={0.04}
              clearcoat={1}
              clearcoatRoughness={0.03}
              emissive="#8A1408"
              emissiveIntensity={isMalaHi ? 0.34 : 0.08}
            />
          </mesh>

          {MALA_BUBBLES.map((b, idx) => (
            <mesh
              key={`mb-${idx}`}
              ref={(el) => {
                malaBubbleRefs.current[idx] = el;
              }}
              position={[b.x, 0.114, b.z]}
              receiveShadow
              renderOrder={2}
            >
              <sphereGeometry args={[b.baseR, 14, 10]} />
              <meshPhysicalMaterial
                color="#E54322"
                roughness={0.06}
                clearcoat={1}
                clearcoatRoughness={0.03}
                transparent
                opacity={0.88}
                depthWrite={false}
                emissive="#B8250A"
                emissiveIntensity={isMalaHi ? 0.4 : 0.1}
              />
            </mesh>
          ))}
        </group>
      </FoodLayer>

      {/* Layer 3: Real PBR Studio-Reflecting Creamy Pork Bone Broth + Capillary Meniscus */}
      <FoodLayer
        partId="bone-broth"
        label="Creamy Pork Bone Broth"
        explodeY={0.3}
        pinPosition={[1.35, 0.35, -0.2]}
        exploded={exploded}
        highlighted={isBoneHi}
        onSelect={handleSelect}
      >
        <group>
          <mesh geometry={boneBrothGeo} material={boneBrothMat} receiveShadow />

          {/* Delicate ivory-cream meniscus hugging the steel wall & S-curve divider */}
          <mesh geometry={boneMeniscusGeo} renderOrder={2}>
            <meshPhysicalMaterial
              color="#FAF1DE"
              transparent
              opacity={0.82}
              depthWrite={false}
              roughness={0.06}
              clearcoat={1}
              clearcoatRoughness={0.05}
              emissive="#7A5F36"
              emissiveIntensity={isBoneHi ? 0.24 : 0.02}
            />
          </mesh>

          {BONE_BUBBLES.map((b, idx) => (
            <mesh
              key={`bb-${idx}`}
              ref={(el) => {
                boneBubbleRefs.current[idx] = el;
              }}
              position={[b.x, 0.114, b.z]}
              receiveShadow
              renderOrder={2}
            >
              <sphereGeometry args={[b.baseR, 12, 10]} />
              <meshPhysicalMaterial
                color="#FFF9EC"
                roughness={0.1}
                clearcoat={0.9}
                transparent
                opacity={0.86}
                depthWrite={false}
                emissive="#7A5F36"
                emissiveIntensity={isBoneHi ? 0.24 : 0}
              />
            </mesh>
          ))}

          {[
            [0.84, 0.122, -0.18] as [number, number, number],
            [0.14, 0.122, 0.82] as [number, number, number],
            [0.72, 0.122, 0.44] as [number, number, number],
            [-0.22, 0.122, 0.72] as [number, number, number],
          ].map((pos, idx) => (
            <mesh
              key={`goji-${idx}`}
              position={pos}
              rotation={[0.1, idx * 1.1, 0.2]}
              scale={[1.5, 0.75, 0.8]}
              castShadow
            >
              <sphereGeometry args={[0.028, 10, 10]} />
              <meshPhysicalMaterial
                color="#C82F22"
                roughness={0.2}
                clearcoat={0.78}
                emissive="#7A180E"
                emissiveIntensity={isBoneHi ? 0.3 : 0}
              />
            </mesh>
          ))}
        </group>
      </FoodLayer>

      {/* Layer 4: Organically Crinkled Dried Sichuan Chilies, Peppercorns & Star Anise */}
      <FoodLayer
        partId="spices"
        label="Dried Chilies & Peppercorns"
        explodeY={0.9}
        pinPosition={[-1.2, 0.65, -0.35]}
        exploded={exploded}
        highlighted={isSpicesHi}
        onSelect={handleSelect}
      >
        <group>
          {CHILI_PODS.map((chili, idx) => (
            <group
              key={`chili-pod-${idx}`}
              ref={(el) => {
                chiliRefs.current[idx] = el;
              }}
              position={chili.pos}
              rotation={chili.rot}
              scale={chili.scale ?? 1}
            >
              <mesh geometry={chiliPodGeo} castShadow receiveShadow>
                <meshPhysicalMaterial
                  color={idx % 2 === 0 ? '#9E140B' : '#B51A0F'}
                  normalMap={organicNormal}
                  normalScale={NORMAL_SCALE_CHILI}
                  roughness={0.18}
                  clearcoat={0.88}
                  clearcoatRoughness={0.1}
                  emissive="#8A1008"
                  emissiveIntensity={isSpicesHi ? 0.36 : 0}
                />
              </mesh>
              <mesh position={[-0.2, 0.005, -0.06]} rotation={[0.2, 0.3, 1.2]}>
                <cylinderGeometry args={[0.008, 0.014, 0.06, 6]} />
                <meshStandardMaterial color="#5E462C" roughness={0.82} />
              </mesh>
            </group>
          ))}

          <group ref={spiceClusterRef}>
            {PEPPERCORNS.map((pos, idx) => (
              <mesh key={`pcorn-${idx}`} position={pos} castShadow receiveShadow>
                <dodecahedronGeometry args={[0.023, 1]} />
                <meshPhysicalMaterial
                  color={idx % 3 === 0 ? '#4D2618' : '#3D1E14'}
                  normalMap={organicNormal}
                  normalScale={NORMAL_SCALE_SPICE}
                  roughness={0.42}
                  clearcoat={0.48}
                  emissive="#5A2210"
                  emissiveIntensity={isSpicesHi ? 0.4 : 0}
                />
              </mesh>
            ))}

            {[
              { pos: [-0.48, 0.14, -0.3] as [number, number, number], rotY: 0.3 },
              { pos: [-0.14, 0.14, -0.82] as [number, number, number], rotY: 1.2 },
            ].map((anise, aIdx) => (
              <group key={`anise-${aIdx}`} position={anise.pos} rotation={[0, anise.rotY, 0]} scale={0.78}>
                <mesh castShadow>
                  <sphereGeometry args={[0.042, 10, 10]} />
                  <meshStandardMaterial
                    color="#4E2A14"
                    normalMap={organicNormal}
                    normalScale={NORMAL_SCALE_SPICE}
                    roughness={0.58}
                    emissive="#5A280C"
                    emissiveIntensity={isSpicesHi ? 0.36 : 0}
                  />
                </mesh>
                {Array.from({ length: 8 }).map((_, pIdx) => (
                  <mesh
                    key={pIdx}
                    position={[
                      Math.cos((pIdx / 8) * Math.PI * 2) * 0.085,
                      0,
                      Math.sin((pIdx / 8) * Math.PI * 2) * 0.085,
                    ]}
                    rotation={[0, -(pIdx / 8) * Math.PI * 2, -Math.PI / 2]}
                    scale={[0.8, 1, 0.65]}
                    castShadow
                    receiveShadow
                  >
                    <coneGeometry args={[0.038, 0.13, 6]} />
                    <meshStandardMaterial
                      color="#4E2A14"
                      normalMap={organicNormal}
                      normalScale={NORMAL_SCALE_SPICE}
                      roughness={0.58}
                      emissive="#5A280C"
                      emissiveIntensity={isSpicesHi ? 0.36 : 0}
                    />
                  </mesh>
                ))}
              </group>
            ))}

            {SCALLION_BATONS.map((baton, idx) => (
              <group key={`baton-${idx}`} position={baton.pos} rotation={baton.rot}>
                <mesh position={[0, -0.045, 0]} castShadow receiveShadow>
                  <cylinderGeometry args={[0.032, 0.032, 0.11, 12]} />
                  <meshPhysicalMaterial
                    color="#EDF2E1"
                    roughness={0.28}
                    clearcoat={0.52}
                    emissive="#4A5A32"
                    emissiveIntensity={isSpicesHi ? 0.28 : 0}
                  />
                </mesh>
                <mesh position={[0, 0.055, 0]} castShadow receiveShadow>
                  <cylinderGeometry args={[0.03, 0.032, 0.11, 12]} />
                  <meshPhysicalMaterial
                    color="#5B9B3A"
                    roughness={0.32}
                    clearcoat={0.44}
                    emissive="#245212"
                    emissiveIntensity={isSpicesHi ? 0.32 : 0}
                  />
                </mesh>
              </group>
            ))}
          </group>
        </group>
      </FoodLayer>

      {/* Layer 5: Backlit SSS Lotus Root, Ruffled Bok Choy, Enoki & Spiraled Beef Rolls */}
      <FoodLayer
        partId="toppings"
        label="Lotus Root, Bok Choy & Beef Rolls"
        explodeY={1.35}
        pinPosition={[1.25, 0.75, 0.3]}
        exploded={exploded}
        highlighted={isToppingsHi}
        onSelect={handleSelect}
      >
        <group>
          {/* 2 Translucent SSS Lotus Root Slices with Real Perforated Holes */}
          {[
            { pos: [0.68, 0.155, -0.26] as [number, number, number], rot: [0.16, 0.4, -0.18] as [number, number, number], s: 1.0 },
            { pos: [0.48, 0.145, -0.02] as [number, number, number], rot: [-0.14, 1.3, 0.15] as [number, number, number], s: 0.92 },
          ].map((lotus, idx) => (
            <group
              key={`lotus-${idx}`}
              ref={(el) => {
                toppingRefs.current[idx] = el;
              }}
            >
              <group position={lotus.pos} rotation={lotus.rot} scale={lotus.s}>
                <mesh
                  geometry={lotusGeo}
                  material={lotusMat}
                  castShadow
                  receiveShadow
                />
                <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <torusGeometry args={[0.252, 0.018, 10, 32]} />
                  <meshStandardMaterial
                    color="#D4B588"
                    normalMap={organicNormal}
                    normalScale={NORMAL_SCALE_CHILI}
                    roughness={0.48}
                    emissive="#6E4E24"
                    emissiveIntensity={isToppingsHi ? 0.26 : 0}
                  />
                </mesh>
              </group>
            </group>
          ))}

          {/* 2 Backlit SSS Baby Bok Choy Clusters */}
          {[
            { pos: [0.56, 0.14, 0.42] as [number, number, number], rot: [0.18, -0.65, -0.1] as [number, number, number], s: 1.0 },
            { pos: [0.84, 0.135, 0.14] as [number, number, number], rot: [0.12, -1.35, -0.14] as [number, number, number], s: 0.9 },
          ].map((bok, idx) => (
            <group
              key={`bok-${idx}`}
              ref={(el) => {
                toppingRefs.current[2 + idx] = el;
              }}
            >
              <group position={bok.pos} rotation={bok.rot} scale={bok.s}>
                <mesh
                  position={[0, 0.02, 0.12]}
                  rotation={[Math.PI / 2 - 0.15, 0, 0]}
                  scale={[1.1, 1.3, 0.7]}
                  material={bokStemMat}
                  castShadow
                  receiveShadow
                >
                  <capsuleGeometry args={[0.055, 0.12, 8, 12]} />
                </mesh>
                {[-0.45, 0, 0.45].map((ang, lIdx) => (
                  <mesh
                    key={`b-leaf-${lIdx}`}
                    geometry={bokChoyLeafGeo}
                    material={bokLeafMat}
                    position={[ang * 0.06, 0.02 + lIdx * 0.012, 0.04]}
                    rotation={[0.08, ang, 0]}
                    scale={lIdx === 1 ? 1.0 : 0.86}
                    castShadow
                    receiveShadow
                  />
                ))}
              </group>
            </group>
          ))}

          {/* Enoki Mushroom Bundle */}
          <group
            ref={(el) => {
              toppingRefs.current[4] = el;
            }}
          >
            <group position={[0.14, 0.14, 0.68]} rotation={[0.15, 0.7, 0.12]}>
              <mesh position={[0, 0, 0.14]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.068, 0.058, 0.08, 12]} />
                <meshStandardMaterial
                  color="#EFE6D2"
                  roughness={0.52}
                  emissive="#635434"
                  emissiveIntensity={isToppingsHi ? 0.24 : 0}
                />
              </mesh>
              {Array.from({ length: 12 }).map((_, mIdx) => {
                const spreadX = ((mIdx % 4) - 1.5) * 0.036;
                const spreadY = (Math.floor(mIdx / 4) - 1) * 0.028;
                const len = 0.22 + (mIdx % 3) * 0.04;
                return (
                  <group key={`enoki-${mIdx}`} position={[spreadX, spreadY + 0.02, 0.08]}>
                    <mesh
                      position={[spreadX * 0.5, spreadY * 0.3, -len / 2]}
                      rotation={[Math.PI / 2 - spreadY * 1.2, 0, -spreadX * 1.4]}
                      castShadow
                      receiveShadow
                    >
                      <cylinderGeometry args={[0.011, 0.013, len, 8]} />
                      <meshPhysicalMaterial
                        color="#FAF5EA"
                        roughness={0.3}
                        clearcoat={0.38}
                        emissive="#635434"
                        emissiveIntensity={isToppingsHi ? 0.24 : 0}
                      />
                    </mesh>
                    <mesh
                      position={[spreadX * 1.05, spreadY * 0.65 + 0.01, -len]}
                      scale={[1.0, 0.75, 1.0]}
                      castShadow
                      receiveShadow
                    >
                      <sphereGeometry args={[0.028, 10, 10]} />
                      <meshPhysicalMaterial
                        color="#FFFDF6"
                        roughness={0.2}
                        clearcoat={0.52}
                        emissive="#635434"
                        emissiveIntensity={isToppingsHi ? 0.26 : 0}
                      />
                    </mesh>
                  </group>
                );
              })}
            </group>
          </group>

          {/* 3 Organic Sculpted Backlit SSS Spiraled Marbled Beef Rolls */}
          {[
            { pos: [-0.14, 0.175, 0.54] as [number, number, number], rot: [0.35, 0.45, 0.22] as [number, number, number], s: 1.02 },
            { pos: [0.18, 0.18, 0.28] as [number, number, number], rot: [0.28, -0.55, -0.18] as [number, number, number], s: 0.96 },
            { pos: [-0.26, 0.16, 0.8] as [number, number, number], rot: [0.42, 1.1, 0.14] as [number, number, number], s: 0.9 },
          ].map((roll, idx) => (
            <group
              key={`beef-roll-${idx}`}
              ref={(el) => {
                toppingRefs.current[5 + idx] = el;
              }}
            >
              <group position={roll.pos} rotation={roll.rot} scale={roll.s}>
                <mesh
                  geometry={beefSpiralMeatGeo}
                  material={beefRollMeatMat}
                  castShadow
                  receiveShadow
                />
                <mesh geometry={beefSpiralFatGeo} castShadow receiveShadow>
                  <meshPhysicalMaterial
                    color="#F5E2DA"
                    roughness={0.26}
                    clearcoat={0.48}
                    emissive="#6E4A3E"
                    emissiveIntensity={isToppingsHi ? 0.24 : 0}
                  />
                </mesh>
              </group>
            </group>
          ))}
        </group>
      </FoodLayer>
    </group>
  );
}

export default HotPotModel;

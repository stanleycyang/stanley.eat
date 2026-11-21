'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FoodModelProps } from '@/types/dish';
import {
  createBrothShaderMaterial,
  getOrganicNoiseBump,
  getSlateTextures,
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

const MALA_BASE_COLOR = new THREE.Color('#9E140B');
const MALA_HI_COLOR = new THREE.Color('#CC2818');
const BONE_BASE_COLOR = new THREE.Color('#DFCFAF');
const BONE_HI_COLOR = new THREE.Color('#F5E8CC');

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

  // Shared cached procedural PBR textures (do NOT dispose cached singletons)
  const brushedSteelBump = useMemo(() => getOrganicNoiseBump(503, 18), []);
  const gripSlateTex = useMemo(() => getSlateTextures(), []);
  const organicBump = useMemo(() => getOrganicNoiseBump(547, 12), []);

  // Per-instance animated GLSL broth shaders (disposed cleanly on unmount)
  const malaBrothMat = useMemo(
    () =>
      createBrothShaderMaterial({
        baseColor: '#9E140B',
        oilColor: '#E53517',
        sheenColor: '#FFB070',
        isSpicy: true,
        opacity: 0.96,
      }),
    []
  );

  const boneBrothMat = useMemo(
    () =>
      createBrothShaderMaterial({
        baseColor: '#DFCFAF',
        oilColor: '#F6E8B8',
        sheenColor: '#FFFDF4',
        isSpicy: false,
        opacity: 0.95,
      }),
    []
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

  // Matching Left (Mala) & Right (Bone) S-curve broth volumes
  const { malaBrothGeo, boneBrothGeo } = useMemo(() => {
    const R = 1.19;
    const gap = 0.032;
    const arcSteps = 32;
    const sSamples = sampleSCurvePoints(R, 26);

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
      depth: 0.44,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.012,
      bevelSegments: 3,
    });
    malaGeo.rotateX(-Math.PI / 2);
    malaGeo.translate(0, -0.34, 0);
    malaGeo.computeVertexNormals();

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
      depth: 0.44,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.012,
      bevelSegments: 3,
    });
    boneGeo.rotateX(-Math.PI / 2);
    boneGeo.translate(0, -0.34, 0);
    boneGeo.computeVertexNormals();

    return { malaBrothGeo: malaGeo, boneBrothGeo: boneGeo };
  }, []);

  // Curled dried Sichuan chili pod geometry
  const chiliPodGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.18, 0.0, -0.05),
      new THREE.Vector3(-0.07, 0.03, 0.06),
      new THREE.Vector3(0.06, 0.02, 0.07),
      new THREE.Vector3(0.17, -0.01, -0.02),
      new THREE.Vector3(0.22, -0.02, -0.09),
    ]);
    const geo = new THREE.TubeGeometry(curve, 24, 0.032, 10, false);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const t = THREE.MathUtils.clamp((x + 0.18) / 0.4, 0, 1);
      const taper = 1 - t * 0.62;
      const centerPt = curve.getPoint(t);
      pos.setY(i, centerPt.y + (pos.getY(i) - centerPt.y) * taper);
      pos.setZ(i, centerPt.z + (pos.getZ(i) - centerPt.z) * taper);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Sculptural lotus root slice WITH real perforated holes via shape.holes!
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
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Baby bok choy ruffled leaf blade geometry
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
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Spiraled marbled beef roll geometry
  const { beefSpiralMeatGeo, beefSpiralFatGeo } = useMemo(() => {
    const makeSpiral = (thickness: number, offsetR: number) => {
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
        depth: 0.28,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.006,
        bevelSegments: 2,
      });
      geo.center();
      geo.computeVertexNormals();
      return geo;
    };

    return {
      beefSpiralMeatGeo: makeSpiral(0.022, 0),
      beefSpiralFatGeo: makeSpiral(0.011, 0.014),
    };
  }, []);

  useEffect(() => {
    return () => {
      potGeo.dispose();
      dividerGeo.dispose();
      handleGeo.dispose();
      malaBrothGeo.dispose();
      boneBrothGeo.dispose();
      chiliPodGeo.dispose();
      lotusGeo.dispose();
      bokChoyLeafGeo.dispose();
      beefSpiralMeatGeo.dispose();
      beefSpiralFatGeo.dispose();
      malaBrothMat.dispose();
      boneBrothMat.dispose();
    };
  }, [
    potGeo,
    dividerGeo,
    handleGeo,
    malaBrothGeo,
    boneBrothGeo,
    chiliPodGeo,
    lotusGeo,
    bokChoyLeafGeo,
    beefSpiralMeatGeo,
    beefSpiralFatGeo,
    malaBrothMat,
    boneBrothMat,
  ]);

  const isPotHi = highlightedPart === 'pot';
  const isMalaHi = highlightedPart === 'mala-broth';
  const isBoneHi = highlightedPart === 'bone-broth';
  const isSpicesHi = highlightedPart === 'spices';
  const isToppingsHi = highlightedPart === 'toppings';

  useEffect(() => {
    malaBrothMat.uniforms.uBaseColor.value.copy(isMalaHi ? MALA_HI_COLOR : MALA_BASE_COLOR);
  }, [isMalaHi, malaBrothMat]);

  useEffect(() => {
    boneBrothMat.uniforms.uBaseColor.value.copy(isBoneHi ? BONE_HI_COLOR : BONE_BASE_COLOR);
  }, [isBoneHi, boneBrothMat]);

  // Smooth GLSL broth flow + simmering bubbles + staggered bobbing spices and toppings
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    malaBrothMat.uniforms.uTime.value = t;
    boneBrothMat.uniforms.uTime.value = t;

    // Animated simmering Mala oil bubbles
    MALA_BUBBLES.forEach((b, i) => {
      const mesh = malaBubbleRefs.current[i];
      if (!mesh) return;
      const cycle = (t * b.speed * 0.45 + b.phase) % 1;
      const scale = Math.sin(cycle * Math.PI) * 1.15 + 0.12;
      mesh.scale.set(scale, scale * 0.55, scale);
      mesh.position.y = 0.115 + Math.sin(cycle * Math.PI) * 0.016;
    });

    // Animated simmering Bone broth bubbles
    BONE_BUBBLES.forEach((b, i) => {
      const mesh = boneBubbleRefs.current[i];
      if (!mesh) return;
      const cycle = (t * b.speed * 0.42 + b.phase) % 1;
      const scale = Math.sin(cycle * Math.PI) * 1.05 + 0.15;
      mesh.scale.set(scale, scale * 0.5, scale);
      mesh.position.y = 0.115 + Math.sin(cycle * Math.PI) * 0.013;
    });

    // Gently bobbing curled chilies on Mala side
    CHILI_PODS.forEach((c, i) => {
      const grp = chiliRefs.current[i];
      if (!grp) return;
      grp.position.y = c.pos[1] + Math.sin(t * 2.2 + c.phase) * 0.014;
      grp.rotation.z = c.rot[2] + Math.sin(t * 1.8 + c.phase) * 0.06;
    });

    if (spiceClusterRef.current) {
      spiceClusterRef.current.position.y = Math.sin(t * 2.0 + 1.0) * 0.008;
    }

    // Staggered simmering bob on Lotus Root, Bok Choy, Enoki, and Beef Rolls
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
          {/* Main round metallic pot body with brushed stainless sheen contrast */}
          <mesh geometry={potGeo} castShadow receiveShadow>
            <meshPhysicalMaterial
              color="#CBD1D9"
              bumpMap={brushedSteelBump}
              bumpScale={0.008}
              roughnessMap={brushedSteelBump}
              metalness={0.88}
              roughness={0.28}
              clearcoat={0.22}
              clearcoatRoughness={0.35}
              emissive="#4A3528"
              emissiveIntensity={isPotHi ? 0.32 : 0}
            />
          </mesh>

          {/* Subtle dark steel induction base band */}
          <mesh position={[0, -0.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.96, 0.035, 12, 56]} />
            <meshStandardMaterial
              color="#525862"
              bumpMap={brushedSteelBump}
              bumpScale={0.006}
              metalness={0.82}
              roughness={0.36}
              emissive="#4A3528"
              emissiveIntensity={isPotHi ? 0.28 : 0}
            />
          </mesh>

          {/* Authentic S-Curve Metallic Divider Wall */}
          <mesh geometry={dividerGeo} castShadow receiveShadow>
            <meshPhysicalMaterial
              color="#D5DBE3"
              bumpMap={brushedSteelBump}
              bumpScale={0.006}
              roughnessMap={brushedSteelBump}
              metalness={0.9}
              roughness={0.24}
              clearcoat={0.24}
              clearcoatRoughness={0.3}
              emissive="#5A3A28"
              emissiveIntensity={isPotHi ? 0.34 : 0}
            />
          </mesh>

          {/* Left & Right Riveted Side Loop Handles */}
          {[-1, 1].map((side) => (
            <group
              key={`handle-${side}`}
              position={[side * 1.24, 0.08, 0]}
              scale={[side, 1, 1]}
            >
              <mesh geometry={handleGeo} castShadow>
                <meshStandardMaterial
                  color="#BFC6D0"
                  bumpMap={brushedSteelBump}
                  bumpScale={0.006}
                  metalness={0.88}
                  roughness={0.24}
                  emissive="#4A3528"
                  emissiveIntensity={isPotHi ? 0.32 : 0}
                />
              </mesh>
              {/* Textured matte heat-resistant silicone grip sleeve */}
              <mesh position={[0.31, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <capsuleGeometry args={[0.046, 0.18, 8, 12]} />
                <meshStandardMaterial
                  color="#2A2827"
                  bumpMap={gripSlateTex.bumpMap}
                  bumpScale={0.015}
                  roughnessMap={gripSlateTex.roughnessMap}
                  roughness={0.85}
                  emissive="#4A2418"
                  emissiveIntensity={isPotHi ? 0.32 : 0}
                />
              </mesh>
              {/* Riveted mounting bracket + 2 polished steel rivets */}
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

      {/* Layer 2: Animated GLSL Sichuan Mala Chili Broth (Left S-Curve Half) */}
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

          {/* Animated simmering chili-oil bubbles */}
          {MALA_BUBBLES.map((b, idx) => (
            <mesh
              key={`mb-${idx}`}
              ref={(el) => {
                malaBubbleRefs.current[idx] = el;
              }}
              position={[b.x, 0.115, b.z]}
            >
              <sphereGeometry args={[b.baseR, 14, 10]} />
              <meshPhysicalMaterial
                color="#E54322"
                roughness={0.07}
                clearcoat={1}
                clearcoatRoughness={0.04}
                transparent
                opacity={0.88}
                emissive="#B8250A"
                emissiveIntensity={isMalaHi ? 0.42 : 0.1}
              />
            </mesh>
          ))}
        </group>
      </FoodLayer>

      {/* Layer 3: Animated GLSL Creamy Pork Bone Broth (Right S-Curve Half) */}
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

          {/* Gentle creamy simmering bubbles */}
          {BONE_BUBBLES.map((b, idx) => (
            <mesh
              key={`bb-${idx}`}
              ref={(el) => {
                boneBubbleRefs.current[idx] = el;
              }}
              position={[b.x, 0.115, b.z]}
            >
              <sphereGeometry args={[b.baseR, 12, 10]} />
              <meshPhysicalMaterial
                color="#FFF9EC"
                roughness={0.12}
                clearcoat={0.88}
                transparent
                opacity={0.86}
                emissive="#7A5F36"
                emissiveIntensity={isBoneHi ? 0.26 : 0}
              />
            </mesh>
          ))}

          {/* Red goji berries infusing in the creamy bone broth */}
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
            >
              <sphereGeometry args={[0.028, 10, 10]} />
              <meshPhysicalMaterial
                color="#C82F22"
                roughness={0.22}
                clearcoat={0.72}
                emissive="#7A180E"
                emissiveIntensity={isBoneHi ? 0.32 : 0}
              />
            </mesh>
          ))}
        </group>
      </FoodLayer>

      {/* Layer 4: Dried Sichuan Chilies, Peppercorns, Star Anise & Scallion Batons */}
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
          {/* Floating curled dried red Sichuan chilies */}
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
              <mesh geometry={chiliPodGeo} castShadow>
                <meshPhysicalMaterial
                  color={idx % 2 === 0 ? '#9E140B' : '#B51A0F'}
                  bumpMap={organicBump}
                  bumpScale={0.018}
                  roughness={0.2}
                  clearcoat={0.85}
                  clearcoatRoughness={0.12}
                  emissive="#8A1008"
                  emissiveIntensity={isSpicesHi ? 0.38 : 0}
                />
              </mesh>
              <mesh position={[-0.2, 0.005, -0.06]} rotation={[0.2, 0.3, 1.2]}>
                <cylinderGeometry args={[0.008, 0.014, 0.06, 6]} />
                <meshStandardMaterial color="#5E462C" roughness={0.82} />
              </mesh>
            </group>
          ))}

          {/* Sichuan peppercorns, star anise & scallion batons */}
          <group ref={spiceClusterRef}>
            {PEPPERCORNS.map((pos, idx) => (
              <mesh key={`pcorn-${idx}`} position={pos} castShadow>
                <dodecahedronGeometry args={[0.023, 1]} />
                <meshPhysicalMaterial
                  color={idx % 3 === 0 ? '#4D2618' : '#3D1E14'}
                  bumpMap={organicBump}
                  bumpScale={0.016}
                  roughness={0.44}
                  clearcoat={0.45}
                  emissive="#5A2210"
                  emissiveIntensity={isSpicesHi ? 0.42 : 0}
                />
              </mesh>
            ))}

            {/* 2 Floating Star Anise pods on the Mala side */}
            {[
              { pos: [-0.48, 0.14, -0.3] as [number, number, number], rotY: 0.3 },
              { pos: [-0.14, 0.14, -0.82] as [number, number, number], rotY: 1.2 },
            ].map((anise, aIdx) => (
              <group key={`anise-${aIdx}`} position={anise.pos} rotation={[0, anise.rotY, 0]} scale={0.78}>
                <mesh>
                  <sphereGeometry args={[0.042, 10, 10]} />
                  <meshStandardMaterial
                    color="#4E2A14"
                    bumpMap={organicBump}
                    bumpScale={0.02}
                    roughness={0.58}
                    emissive="#5A280C"
                    emissiveIntensity={isSpicesHi ? 0.38 : 0}
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
                  >
                    <coneGeometry args={[0.038, 0.13, 6]} />
                    <meshStandardMaterial
                      color="#4E2A14"
                      bumpMap={organicBump}
                      bumpScale={0.02}
                      roughness={0.58}
                      emissive="#5A280C"
                      emissiveIntensity={isSpicesHi ? 0.38 : 0}
                    />
                  </mesh>
                ))}
              </group>
            ))}

            {/* White-green scallion baton segments */}
            {SCALLION_BATONS.map((baton, idx) => (
              <group key={`baton-${idx}`} position={baton.pos} rotation={baton.rot}>
                <mesh position={[0, -0.045, 0]} castShadow>
                  <cylinderGeometry args={[0.032, 0.032, 0.11, 12]} />
                  <meshPhysicalMaterial
                    color="#EDF2E1"
                    roughness={0.3}
                    clearcoat={0.48}
                    emissive="#4A5A32"
                    emissiveIntensity={isSpicesHi ? 0.28 : 0}
                  />
                </mesh>
                <mesh position={[0, 0.055, 0]} castShadow>
                  <cylinderGeometry args={[0.03, 0.032, 0.11, 12]} />
                  <meshPhysicalMaterial
                    color="#5B9B3A"
                    roughness={0.34}
                    clearcoat={0.4}
                    emissive="#245212"
                    emissiveIntensity={isSpicesHi ? 0.32 : 0}
                  />
                </mesh>
              </group>
            ))}
          </group>
        </group>
      </FoodLayer>

      {/* Layer 5: Sculptural Lotus Root, Baby Bok Choy, Enoki & Spiraled Beef Rolls */}
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
          {/* 2 Sculptural Lotus Root Slices with Real Perforated Holes */}
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
                <mesh geometry={lotusGeo} castShadow receiveShadow>
                  <meshPhysicalMaterial
                    color="#EFE0C6"
                    bumpMap={organicBump}
                    bumpScale={0.012}
                    roughness={0.3}
                    clearcoat={0.44}
                    clearcoatRoughness={0.2}
                    emissive="#6E542C"
                    emissiveIntensity={isToppingsHi ? 0.28 : 0}
                  />
                </mesh>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.252, 0.018, 10, 32]} />
                  <meshStandardMaterial
                    color="#D4B588"
                    bumpMap={organicBump}
                    bumpScale={0.016}
                    roughness={0.48}
                    emissive="#6E4E24"
                    emissiveIntensity={isToppingsHi ? 0.28 : 0}
                  />
                </mesh>
              </group>
            </group>
          ))}

          {/* 2 Baby Bok Choy Clusters (jade stems + dark emerald ruffled leaves) */}
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
                <mesh position={[0, 0.02, 0.12]} rotation={[Math.PI / 2 - 0.15, 0, 0]} scale={[1.1, 1.3, 0.7]} castShadow>
                  <capsuleGeometry args={[0.055, 0.12, 8, 12]} />
                  <meshPhysicalMaterial
                    color="#CBE6A8"
                    roughness={0.24}
                    clearcoat={0.55}
                    emissive="#3A5E1E"
                    emissiveIntensity={isToppingsHi ? 0.3 : 0}
                  />
                </mesh>
                {[-0.45, 0, 0.45].map((ang, lIdx) => (
                  <mesh
                    key={`b-leaf-${lIdx}`}
                    geometry={bokChoyLeafGeo}
                    position={[ang * 0.06, 0.02 + lIdx * 0.012, 0.04]}
                    rotation={[0.08, ang, 0]}
                    scale={lIdx === 1 ? 1.0 : 0.86}
                    castShadow
                  >
                    <meshPhysicalMaterial
                      color={lIdx === 1 ? '#2F6E31' : '#3F873D'}
                      bumpMap={organicBump}
                      bumpScale={0.016}
                      roughness={0.32}
                      clearcoat={0.44}
                      emissive="#184A16"
                      emissiveIntensity={isToppingsHi ? 0.34 : 0}
                    />
                  </mesh>
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
              <mesh position={[0, 0, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.068, 0.058, 0.08, 12]} />
                <meshStandardMaterial
                  color="#EFE6D2"
                  roughness={0.52}
                  emissive="#635434"
                  emissiveIntensity={isToppingsHi ? 0.25 : 0}
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
                    >
                      <cylinderGeometry args={[0.011, 0.013, len, 8]} />
                      <meshPhysicalMaterial
                        color="#FAF5EA"
                        roughness={0.32}
                        clearcoat={0.35}
                        emissive="#635434"
                        emissiveIntensity={isToppingsHi ? 0.24 : 0}
                      />
                    </mesh>
                    <mesh
                      position={[spreadX * 1.05, spreadY * 0.65 + 0.01, -len]}
                      scale={[1.0, 0.75, 1.0]}
                      castShadow
                    >
                      <sphereGeometry args={[0.028, 10, 10]} />
                      <meshPhysicalMaterial
                        color="#FFFDF6"
                        roughness={0.22}
                        clearcoat={0.48}
                        emissive="#635434"
                        emissiveIntensity={isToppingsHi ? 0.26 : 0}
                      />
                    </mesh>
                  </group>
                );
              })}
            </group>
          </group>

          {/* 3 Spiraled Thin-Rolled Marbled Beef Slices */}
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
                <mesh geometry={beefSpiralMeatGeo} castShadow receiveShadow>
                  <meshPhysicalMaterial
                    color="#A43838"
                    bumpMap={organicBump}
                    bumpScale={0.022}
                    roughness={0.28}
                    clearcoat={0.52}
                    clearcoatRoughness={0.18}
                    emissive="#7A1C1C"
                    emissiveIntensity={isToppingsHi ? 0.32 : 0}
                  />
                </mesh>
                <mesh geometry={beefSpiralFatGeo} castShadow>
                  <meshPhysicalMaterial
                    color="#F5E2DA"
                    roughness={0.28}
                    clearcoat={0.44}
                    emissive="#6E4A3E"
                    emissiveIntensity={isToppingsHi ? 0.25 : 0}
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

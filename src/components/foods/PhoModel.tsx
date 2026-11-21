'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FoodModelProps } from '@/types/dish';
import {
  applyFoodSSS,
  applyWetnessVertexColors,
  createPbrBrothMaterial,
  displaceGeometryOrganic,
  getOrganicNormalMap,
  getStonewareTextures,
  updateBrothMaterial,
} from '@/lib/proceduralTextures';
import { FoodLayer } from './FoodLayer';

interface ScallionRing {
  pos: [number, number, number];
  rot: [number, number, number];
  radius: number;
  light: boolean;
}

interface ChiliRing {
  pos: [number, number, number];
  rot: [number, number, number];
  scale: number;
}

interface BeefSliceSpec {
  pos: [number, number, number];
  rot: [number, number, number];
  scale: [number, number, number];
}

interface HerbLeafSpec {
  pos: [number, number, number];
  rot: [number, number, number];
  scale: number;
}

const NORMAL_SCALE_OUTER_BOWL = new THREE.Vector2(0.78, 0.78);
const NORMAL_SCALE_INNER_BOWL = new THREE.Vector2(0.28, 0.28);
const NORMAL_SCALE_RIM = new THREE.Vector2(0.68, 0.68);
const NORMAL_SCALE_GARNISH = new THREE.Vector2(0.55, 0.55);
const NORMAL_SCALE_ANISE = new THREE.Vector2(0.8, 0.8);

const SCALLION_RINGS: ScallionRing[] = [
  { pos: [0.18, 0.145, 0.44], rot: [Math.PI / 2 + 0.08, 0.1, 0.3], radius: 0.056, light: false },
  { pos: [-0.08, 0.148, 0.56], rot: [Math.PI / 2 - 0.05, 0.05, 1.1], radius: 0.048, light: true },
  { pos: [0.46, 0.146, 0.24], rot: [Math.PI / 2 + 0.06, -0.1, 0.8], radius: 0.052, light: false },
  { pos: [0.58, 0.144, -0.08], rot: [Math.PI / 2 - 0.08, 0.08, 2.0], radius: 0.05, light: true },
  { pos: [0.24, 0.15, -0.44], rot: [Math.PI / 2 + 0.05, 0.04, 1.5], radius: 0.054, light: false },
  { pos: [-0.26, 0.148, 0.42], rot: [Math.PI / 2 - 0.06, -0.06, 0.4], radius: 0.046, light: false },
  { pos: [0.02, 0.152, 0.12], rot: [Math.PI / 2 + 0.09, 0.06, 2.4], radius: 0.052, light: true },
  { pos: [0.34, 0.146, -0.18], rot: [Math.PI / 2 - 0.04, 0.1, 0.6], radius: 0.048, light: false },
  { pos: [-0.48, 0.144, 0.28], rot: [Math.PI / 2 + 0.06, -0.08, 1.9], radius: 0.05, light: true },
  { pos: [-0.14, 0.15, -0.56], rot: [Math.PI / 2 - 0.05, 0.05, 2.8], radius: 0.054, light: false },
  { pos: [0.68, 0.142, 0.14], rot: [Math.PI / 2 + 0.07, -0.04, 1.2], radius: 0.044, light: false },
  { pos: [0.12, 0.15, -0.22], rot: [Math.PI / 2 - 0.06, 0.07, 0.2], radius: 0.046, light: true },
  { pos: [-0.36, 0.146, -0.34], rot: [Math.PI / 2 + 0.04, -0.05, 2.1], radius: 0.05, light: false },
  { pos: [0.42, 0.145, 0.5], rot: [Math.PI / 2 - 0.07, 0.04, 0.9], radius: 0.046, light: true },
];

const CHILI_RINGS: ChiliRing[] = [
  { pos: [0.14, 0.152, 0.26], rot: [Math.PI / 2 + 0.06, 0.05, 0.4], scale: 1.0 },
  { pos: [0.36, 0.15, 0.08], rot: [Math.PI / 2 - 0.05, 0.08, 1.5], scale: 0.92 },
  { pos: [-0.04, 0.153, -0.08], rot: [Math.PI / 2 + 0.08, -0.06, 2.3], scale: 0.95 },
  { pos: [0.22, 0.149, -0.34], rot: [Math.PI / 2 - 0.06, 0.04, 0.9], scale: 0.88 },
  { pos: [-0.24, 0.15, 0.22], rot: [Math.PI / 2 + 0.04, -0.04, 1.8], scale: 0.9 },
];

const BEEF_SLICES: BeefSliceSpec[] = [
  { pos: [-0.52, 0.16, -0.18], rot: [0.12, 0.45, -0.14], scale: [1.0, 1.0, 1.0] },
  { pos: [-0.38, 0.185, -0.36], rot: [0.16, 0.88, -0.1], scale: [0.96, 1.0, 0.94] },
  { pos: [-0.56, 0.175, 0.08], rot: [-0.08, 0.12, -0.16], scale: [0.98, 1.0, 0.96] },
  { pos: [-0.22, 0.2, -0.14], rot: [0.06, 0.62, -0.08], scale: [1.04, 1.0, 1.0] },
  { pos: [-0.38, 0.17, 0.28], rot: [-0.14, -0.25, -0.12], scale: [0.92, 1.0, 0.9] },
];

const HERB_LEAVES: HerbLeafSpec[] = [
  { pos: [0.56, 0.19, -0.34], rot: [0.28, 0.6, -0.25], scale: 1.05 },
  { pos: [0.72, 0.18, -0.18], rot: [0.22, 1.3, -0.32], scale: 0.94 },
  { pos: [0.46, 0.2, -0.52], rot: [0.34, 0.15, -0.2], scale: 0.9 },
  { pos: [0.64, 0.175, 0.34], rot: [-0.26, 2.2, -0.28], scale: 0.88 },
  { pos: [0.32, 0.19, 0.56], rot: [-0.3, 2.8, -0.18], scale: 0.86 },
];

const OIL_DROPLETS: [number, number, number, number][] = [
  [0.78, 0.132, 0.28, 0.052],
  [-0.74, 0.132, 0.42, 0.044],
  [0.44, 0.132, -0.68, 0.048],
  [-0.12, 0.132, 0.78, 0.042],
  [0.86, 0.132, -0.14, 0.038],
  [-0.68, 0.132, -0.52, 0.046],
  [0.08, 0.132, -0.78, 0.04],
  [-0.86, 0.132, 0.04, 0.044],
];

function createSeededRand(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function PhoModel({
  exploded,
  highlightedPart,
  onSelectPart,
}: FoodModelProps) {
  const floatGarnishRef = useRef<THREE.Group>(null);
  const starAniseRef = useRef<THREE.Group>(null);

  const handleSelect = (partId: string) => {
    onSelectPart(highlightedPart === partId ? null : partId);
  };

  // Shared cached 512x512 Sobel RGB procedural textures (NEVER dispose cached singletons)
  const stonewareTex = useMemo(() => getStonewareTextures(), []);
  const beefNormal = useMemo(() => getOrganicNormalMap(409, 12, 1.8), []);
  const noodleNormal = useMemo(() => getOrganicNormalMap(307, 14, 0.9), []);
  const garnishNormal = useMemo(() => getOrganicNormalMap(433, 12, 1.5), []);

  // Per-instance real PBR studio-reflecting broth + SSS materials (disposed on unmount)
  const brothMat = useMemo(
    () =>
      createPbrBrothMaterial({
        baseColor: '#7B3E10',
        oilColor: '#D99A2E',
        sheenColor: '#FFF0C4',
        isSpicy: false,
        opacity: 0.88,
      }),
    []
  );

  const noodleMat = useMemo(
    () =>
      applyFoodSSS(
        new THREE.MeshPhysicalMaterial({
          color: '#FFFFFF',
          vertexColors: true,
          normalMap: noodleNormal,
          normalScale: new THREE.Vector2(0.32, 0.32),
          roughness: 0.18,
          clearcoat: 0.72,
          clearcoatRoughness: 0.12,
          emissive: new THREE.Color('#6B5636'),
          emissiveIntensity: 0,
        }),
        { color: '#FFF0D2', intensity: 0.34, power: 2.6, scale: 1.1 }
      ),
    [noodleNormal]
  );

  const beefOuterMat = useMemo(
    () =>
      applyFoodSSS(
        new THREE.MeshPhysicalMaterial({
          color: '#FFFFFF',
          vertexColors: true,
          normalMap: beefNormal,
          normalScale: new THREE.Vector2(0.85, 0.85),
          roughness: 0.32,
          clearcoat: 0.54,
          clearcoatRoughness: 0.18,
          emissive: new THREE.Color('#6E1E1A'),
          emissiveIntensity: 0,
        }),
        { color: '#D85A4A', intensity: 0.48, power: 2.3, scale: 1.15 }
      ),
    [beefNormal]
  );

  const beefCenterMat = useMemo(
    () =>
      applyFoodSSS(
        new THREE.MeshPhysicalMaterial({
          color: '#B8564E',
          normalMap: beefNormal,
          normalScale: new THREE.Vector2(0.65, 0.65),
          roughness: 0.24,
          clearcoat: 0.68,
          clearcoatRoughness: 0.14,
          sheen: 0.26,
          sheenColor: new THREE.Color('#E8A096'),
          emissive: new THREE.Color('#7A241E'),
          emissiveIntensity: 0,
        }),
        { color: '#E0685A', intensity: 0.5, power: 2.2, scale: 1.15 }
      ),
    [beefNormal]
  );

  const basilMat = useMemo(
    () =>
      applyFoodSSS(
        new THREE.MeshPhysicalMaterial({
          color: '#43842E',
          normalMap: garnishNormal,
          normalScale: new THREE.Vector2(0.58, 0.58),
          roughness: 0.34,
          clearcoat: 0.38,
          clearcoatRoughness: 0.26,
          emissive: new THREE.Color('#1C4612'),
          emissiveIntensity: 0,
        }),
        { color: '#78C848', intensity: 0.55, power: 2.2, scale: 1.15 }
      ),
    [garnishNormal]
  );

  const limeFleshMat = useMemo(
    () =>
      applyFoodSSS(
        new THREE.MeshPhysicalMaterial({
          color: '#C6E462',
          normalMap: garnishNormal,
          normalScale: new THREE.Vector2(0.45, 0.45),
          roughness: 0.1,
          clearcoat: 0.94,
          clearcoatRoughness: 0.06,
          emissive: new THREE.Color('#4C6410'),
          emissiveIntensity: 0,
        }),
        { color: '#C8F060', intensity: 0.62, power: 2.2, scale: 1.2 }
      ),
    [garnishNormal]
  );

  // Classic deep Vietnamese ceramic bowl (outer indigo stoneware + inner celadon/ivory glaze)
  const { outerBowlGeo, innerBowlGeo } = useMemo(() => {
    const outerPts = [
      new THREE.Vector2(0.0, -0.49),
      new THREE.Vector2(0.48, -0.49),
      new THREE.Vector2(0.52, -0.54),
      new THREE.Vector2(0.6, -0.54),
      new THREE.Vector2(0.64, -0.46),
      new THREE.Vector2(0.84, -0.35),
      new THREE.Vector2(1.06, -0.18),
      new THREE.Vector2(1.22, 0.04),
      new THREE.Vector2(1.33, 0.24),
      new THREE.Vector2(1.35, 0.27),
      new THREE.Vector2(1.29, 0.27),
    ];

    const innerPts = [
      new THREE.Vector2(1.29, 0.27),
      new THREE.Vector2(1.24, 0.22),
      new THREE.Vector2(1.13, 0.02),
      new THREE.Vector2(0.96, -0.18),
      new THREE.Vector2(0.74, -0.34),
      new THREE.Vector2(0.46, -0.42),
      new THREE.Vector2(0.0, -0.43),
    ];

    const outer = new THREE.LatheGeometry(outerPts, 64);
    outer.computeVertexNormals();
    const inner = new THREE.LatheGeometry(innerPts, 64);
    inner.computeVertexNormals();
    return { outerBowlGeo: outer, innerBowlGeo: inner };
  }, []);

  // Rich amber beef broth body cleanly inset >=0.035 inside innerBowlGeo (zero ceramic wall z-fighting)
  const brothGeo = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.0, -0.39),
      new THREE.Vector2(0.43, -0.38),
      new THREE.Vector2(0.7, -0.3),
      new THREE.Vector2(0.91, -0.16),
      new THREE.Vector2(1.07, 0.02),
      new THREE.Vector2(1.145, 0.118),
      new THREE.Vector2(0.0, 0.118),
    ];
    const geo = new THREE.LatheGeometry(pts, 60);
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Dense tangled nest of 24 varied flat rice noodles with wetness darkening at broth line
  const noodleGeos = useMemo(() => {
    const rand = createSeededRand(7741);
    const strands: THREE.BufferGeometry[] = [];
    const strandCount = 24;

    for (let s = 0; s < strandCount; s++) {
      const startAngle = (s / strandCount) * Math.PI * 2 + (rand() - 0.5) * 0.45;
      const sweep = (1.1 + rand() * 1.35) * (s % 2 === 0 ? 1 : -1);
      const baseRadius = 0.22 + (s % 5) * 0.15 + rand() * 0.1;
      const pts: THREE.Vector3[] = [];
      const controlCount = 6;

      for (let k = 0; k < controlCount; k++) {
        const u = k / (controlCount - 1);
        const angle = startAngle + sweep * u + Math.sin(u * Math.PI * 2 + s) * 0.34;
        const radialWave = Math.sin(u * Math.PI * 1.5 + s * 1.3) * 0.22;
        const r = THREE.MathUtils.clamp(baseRadius + radialWave + (rand() - 0.5) * 0.12, 0.08, 0.92);
        // Crest above broth in middle of loop, dive gently below broth at ends
        const arch = Math.sin(u * Math.PI);
        const heightBias = s < 14 ? 0.18 : 0.145;
        const y = 0.03 + arch * (heightBias + rand() * 0.035) + (rand() - 0.5) * 0.02;
        pts.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r));
      }

      const curve = new THREE.CatmullRomCurve3(pts);
      const radius = 0.026 + (s % 3) * 0.007;
      const geo = new THREE.TubeGeometry(curve, 34, radius, 8, false);
      // Flatten along Y while preserving actual world Y height around center so ribbons look flat
      const posAttr = geo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vy = posAttr.getY(i);
        const vz = posAttr.getZ(i);
        // Compress thickness slightly around broth level to keep flat bánh phở ribbon feel
        posAttr.setXYZ(i, vx, 0.11 + (vy - 0.11) * 0.65, vz);
      }
      posAttr.needsUpdate = true;
      geo.computeVertexNormals();

      applyWetnessVertexColors(geo, {
        wetY: 0.118,
        bandHeight: 0.065,
        dryColor: '#FCF8EE',
        wetColor: '#C2935C',
      });
      strands.push(geo);
    }

    return strands;
  }, []);

  // Organically sculpted wavy thin-sliced rare beef with wetness vertex gradient
  const { beefOuterGeo, beefCenterGeo } = useMemo(() => {
    const outerShape = new THREE.Shape();
    outerShape.moveTo(-0.32, -0.02);
    outerShape.bezierCurveTo(-0.28, 0.18, 0.04, 0.24, 0.28, 0.12);
    outerShape.bezierCurveTo(0.38, 0.04, 0.32, -0.14, 0.12, -0.17);
    outerShape.bezierCurveTo(-0.12, -0.2, -0.35, -0.14, -0.32, -0.02);

    const innerShape = new THREE.Shape();
    innerShape.moveTo(-0.24, -0.01);
    innerShape.bezierCurveTo(-0.2, 0.13, 0.04, 0.18, 0.22, 0.08);
    innerShape.bezierCurveTo(0.28, 0.02, 0.24, -0.1, 0.08, -0.12);
    innerShape.bezierCurveTo(-0.1, -0.14, -0.26, -0.1, -0.24, -0.01);

    const outer = new THREE.ExtrudeGeometry(outerShape, {
      depth: 0.024,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.012,
      bevelSegments: 3,
      curveSegments: 20,
    });
    outer.rotateX(-Math.PI / 2);
    const oPos = outer.attributes.position;
    for (let i = 0; i < oPos.count; i++) {
      const x = oPos.getX(i);
      const y = oPos.getY(i);
      const z = oPos.getZ(i);
      oPos.setY(i, y + Math.sin(x * 7.5 + z * 3.0) * 0.032);
    }
    displaceGeometryOrganic(outer, {
      amplitude: 0.012,
      frequency: 9.0,
      seed: 409,
      preserveSeam: true,
    });
    applyWetnessVertexColors(outer, {
      wetY: -0.012,
      bandHeight: 0.048,
      dryColor: '#913A34',
      wetColor: '#581D17',
    });

    const inner = new THREE.ExtrudeGeometry(innerShape, {
      depth: 0.03,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.008,
      bevelSegments: 2,
      curveSegments: 16,
    });
    inner.rotateX(-Math.PI / 2);
    const iPos = inner.attributes.position;
    for (let i = 0; i < iPos.count; i++) {
      const x = iPos.getX(i);
      const y = iPos.getY(i);
      const z = iPos.getZ(i);
      iPos.setY(i, y + Math.sin(x * 7.5 + z * 3.0) * 0.032 + 0.009);
    }
    displaceGeometryOrganic(inner, {
      amplitude: 0.008,
      frequency: 9.0,
      seed: 409,
      preserveSeam: true,
    });

    return { beefOuterGeo: outer, beefCenterGeo: inner };
  }, []);

  // Organically cupped Thai basil / cilantro leaf geometry
  const leafGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(0.11, 0.07, 0.12, 0.24, 0, 0.34);
    s.bezierCurveTo(-0.12, 0.24, -0.11, 0.07, 0, 0);
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 0.012,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.004,
      bevelSegments: 2,
    });
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      pos.setY(i, y + Math.sin(-z * 8.5) * 0.025 + Math.abs(x) * 0.14);
    }
    displaceGeometryOrganic(geo, {
      amplitude: 0.008,
      frequency: 14.0,
      seed: 441,
      preserveSeam: true,
    });
    return geo;
  }, []);

  // Vibrant lime wedge geometry (rind + pith + backlit SSS juicy flesh)
  const { limeRindGeo, limePithGeo, limeFleshGeo } = useMemo(() => {
    const rindShape = new THREE.Shape();
    rindShape.absarc(0, 0, 0.27, 0, Math.PI, false);
    rindShape.lineTo(0.27, 0);
    const rind = new THREE.ExtrudeGeometry(rindShape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.012,
      bevelSegments: 3,
      curveSegments: 24,
    });
    rind.center();

    const pithShape = new THREE.Shape();
    pithShape.absarc(0, 0, 0.235, 0.04, Math.PI - 0.04, false);
    pithShape.lineTo(0.235 * Math.cos(0.04), 0.235 * Math.sin(0.04));
    const pith = new THREE.ExtrudeGeometry(pithShape, {
      depth: 0.184,
      bevelEnabled: false,
      curveSegments: 22,
    });
    pith.center();

    const fleshShape = new THREE.Shape();
    fleshShape.absarc(0, 0, 0.21, 0.08, Math.PI - 0.08, false);
    fleshShape.lineTo(0.21 * Math.cos(0.08), 0.21 * Math.sin(0.08));
    const flesh = new THREE.ExtrudeGeometry(fleshShape, {
      depth: 0.194,
      bevelEnabled: false,
      curveSegments: 20,
    });
    flesh.center();

    return { limeRindGeo: rind, limePithGeo: pith, limeFleshGeo: flesh };
  }, []);

  useEffect(() => {
    return () => {
      outerBowlGeo.dispose();
      innerBowlGeo.dispose();
      brothGeo.dispose();
      noodleGeos.forEach((g) => g.dispose());
      beefOuterGeo.dispose();
      beefCenterGeo.dispose();
      leafGeo.dispose();
      limeRindGeo.dispose();
      limePithGeo.dispose();
      limeFleshGeo.dispose();
      brothMat.dispose();
      noodleMat.dispose();
      beefOuterMat.dispose();
      beefCenterMat.dispose();
      basilMat.dispose();
      limeFleshMat.dispose();
    };
  }, [
    outerBowlGeo,
    innerBowlGeo,
    brothGeo,
    noodleGeos,
    beefOuterGeo,
    beefCenterGeo,
    leafGeo,
    limeRindGeo,
    limePithGeo,
    limeFleshGeo,
    brothMat,
    noodleMat,
    beefOuterMat,
    beefCenterMat,
    basilMat,
    limeFleshMat,
  ]);

  const isBowlHi = highlightedPart === 'bowl';
  const isBrothHi = highlightedPart === 'broth';
  const isNoodlesHi = highlightedPart === 'noodles';
  const isBeefHi = highlightedPart === 'beef';
  const isGarnishHi = highlightedPart === 'garnish';

  useEffect(() => {
    noodleMat.emissiveIntensity = isNoodlesHi ? 0.22 : 0;
  }, [isNoodlesHi, noodleMat]);

  useEffect(() => {
    beefOuterMat.emissiveIntensity = isBeefHi ? 0.3 : 0;
    beefCenterMat.emissiveIntensity = isBeefHi ? 0.3 : 0;
  }, [isBeefHi, beefOuterMat, beefCenterMat]);

  useEffect(() => {
    basilMat.emissiveIntensity = isGarnishHi ? 0.32 : 0;
    limeFleshMat.emissiveIntensity = isGarnishHi ? 0.3 : 0;
  }, [isGarnishHi, basilMat, limeFleshMat]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    updateBrothMaterial(brothMat, t, isBrothHi);

    if (floatGarnishRef.current) {
      floatGarnishRef.current.position.y = Math.sin(t * 1.6 + 0.5) * 0.008;
    }
    if (starAniseRef.current) {
      starAniseRef.current.rotation.y = 0.4 + Math.sin(t * 0.6) * 0.08;
      starAniseRef.current.position.y = 0.165 + Math.sin(t * 1.8) * 0.007;
    }
  });

  return (
    <group>
      {/* Layer 1: Deep Artisanal Stoneware Vietnamese Bowl */}
      <FoodLayer
        partId="bowl"
        label="Deep Ceramic Bowl"
        explodeY={-0.3}
        exploded={exploded}
        highlighted={isBowlHi}
        onSelect={handleSelect}
      >
        <group>
          <mesh geometry={outerBowlGeo} castShadow receiveShadow>
            <meshPhysicalMaterial
              color="#2B303A"
              normalMap={stonewareTex.normalMap}
              normalScale={NORMAL_SCALE_OUTER_BOWL}
              roughnessMap={stonewareTex.roughnessMap}
              roughness={0.82}
              metalness={0.04}
              clearcoat={0.22}
              clearcoatRoughness={0.48}
              emissive="#3A4259"
              emissiveIntensity={isBowlHi ? 0.3 : 0}
            />
          </mesh>

          <mesh geometry={innerBowlGeo} receiveShadow>
            <meshPhysicalMaterial
              color="#F2EFE7"
              map={stonewareTex.map}
              normalMap={stonewareTex.normalMap}
              normalScale={NORMAL_SCALE_INNER_BOWL}
              roughness={0.18}
              clearcoat={0.74}
              clearcoatRoughness={0.14}
              emissive="#5A452C"
              emissiveIntensity={isBowlHi ? 0.2 : 0}
            />
          </mesh>

          <mesh position={[0, 0.268, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <torusGeometry args={[1.318, 0.032, 16, 72]} />
            <meshStandardMaterial
              color="#B55A38"
              normalMap={stonewareTex.normalMap}
              normalScale={NORMAL_SCALE_RIM}
              roughnessMap={stonewareTex.roughnessMap}
              roughness={0.72}
              emissive="#7A2D12"
              emissiveIntensity={isBowlHi ? 0.3 : 0}
            />
          </mesh>

          <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.255, 0.012, 10, 64]} />
            <meshStandardMaterial
              color="#39404D"
              normalMap={stonewareTex.normalMap}
              normalScale={NORMAL_SCALE_RIM}
              roughness={0.72}
              emissive="#3A4259"
              emissiveIntensity={isBowlHi ? 0.26 : 0}
            />
          </mesh>
        </group>
      </FoodLayer>

      {/* Layer 2: Real PBR Studio-Reflecting Charred-Spice Amber Beef Broth + Capillary Meniscus */}
      <FoodLayer
        partId="broth"
        label="Charred-Spice Beef Broth"
        explodeY={0.25}
        pinPosition={[-1.25, 0.35, 0.2]}
        exploded={exploded}
        highlighted={isBrothHi}
        onSelect={handleSelect}
      >
        <group>
          <mesh geometry={brothGeo} material={brothMat} receiveShadow renderOrder={1} />

          {/* Delicate glistening capillary meniscus ring bridging broth edge (1.145) to inner bowl wall (1.187) */}
          <mesh
            position={[0, 0.124, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[1, 1, 1.35]}
            renderOrder={2}
          >
            <torusGeometry args={[1.158, 0.014, 12, 72]} />
            <meshPhysicalMaterial
              color="#B46820"
              transparent
              opacity={0.76}
              depthWrite={false}
              roughness={0.04}
              clearcoat={1}
              clearcoatRoughness={0.03}
              ior={1.36}
              emissive="#8A4608"
              emissiveIntensity={isBrothHi ? 0.32 : 0.06}
            />
          </mesh>

          {/* Physical golden marrow oil pearls cleanly above broth surface (zero transparent z-fighting) */}
          {OIL_DROPLETS.map(([x, y, z, r], idx) => (
            <mesh
              key={`oil-${idx}`}
              position={[x, y, z]}
              scale={[1, 0.14, 1]}
              receiveShadow
              renderOrder={2}
            >
              <sphereGeometry args={[r, 12, 10]} />
              <meshPhysicalMaterial
                color="#D99A2E"
                transparent
                opacity={0.72}
                depthWrite={false}
                roughness={0.04}
                clearcoat={1}
                clearcoatRoughness={0.03}
                emissive="#8A5208"
                emissiveIntensity={isBrothHi ? 0.28 : 0}
              />
            </mesh>
          ))}
        </group>
      </FoodLayer>

      {/* Layer 3: Dense Tangled Nest of 24 Wetness-Shaded Flat Rice Noodles */}
      <FoodLayer
        partId="noodles"
        label="Flat Rice Noodles"
        explodeY={0.65}
        pinPosition={[1.2, 0.4, 0.3]}
        exploded={exploded}
        highlighted={isNoodlesHi}
        onSelect={handleSelect}
      >
        <group>
          {noodleGeos.map((geo, idx) => (
            <mesh
              key={`noodle-${idx}`}
              geometry={geo}
              material={noodleMat}
              castShadow
              receiveShadow
            />
          ))}
        </group>
      </FoodLayer>

      {/* Layer 4: Organic Displaced Backlit SSS Rare Thin-Sliced Beef */}
      <FoodLayer
        partId="beef"
        label="Rare Thin-Sliced Beef"
        explodeY={1.1}
        pinPosition={[-1.1, 0.6, -0.3]}
        exploded={exploded}
        highlighted={isBeefHi}
        onSelect={handleSelect}
      >
        <group>
          {BEEF_SLICES.map((slice, idx) => (
            <group
              key={`beef-${idx}`}
              position={slice.pos}
              rotation={slice.rot}
              scale={slice.scale}
            >
              <mesh
                geometry={beefOuterGeo}
                material={beefOuterMat}
                castShadow
                receiveShadow
              />
              <mesh
                geometry={beefCenterGeo}
                material={beefCenterMat}
                castShadow
                receiveShadow
              />
            </group>
          ))}

          {/* Thin sweet white onion rings nestled beside the beef */}
          {[
            { pos: [-0.22, 0.16, 0.34] as [number, number, number], rot: [Math.PI / 2 - 0.12, 0.1, 0.2] as [number, number, number], r: 0.14 },
            { pos: [-0.62, 0.155, -0.36] as [number, number, number], rot: [Math.PI / 2 + 0.1, -0.1, 0.5] as [number, number, number], r: 0.12 },
          ].map((onion, idx) => (
            <mesh key={`onion-${idx}`} position={onion.pos} rotation={onion.rot} castShadow>
              <torusGeometry args={[onion.r, 0.014, 10, 32]} />
              <meshPhysicalMaterial
                color="#F4EDE2"
                transparent
                opacity={0.86}
                roughness={0.16}
                clearcoat={0.72}
                emissive="#5A4A36"
                emissiveIntensity={isBeefHi ? 0.22 : 0}
              />
            </mesh>
          ))}
        </group>
      </FoodLayer>

      {/* Layer 5: Scallions, 8-Pointed Star Anise, Chilies, SSS Basil & SSS Lime Wedge */}
      <FoodLayer
        partId="garnish"
        label="Scallions, Star Anise & Lime"
        explodeY={1.55}
        pinPosition={[1.1, 0.75, -0.2]}
        exploded={exploded}
        highlighted={isGarnishHi}
        onSelect={handleSelect}
      >
        <group>
          <group ref={floatGarnishRef}>
            {SCALLION_RINGS.map((ring, idx) => (
              <mesh
                key={`scallion-${idx}`}
                position={ring.pos}
                rotation={ring.rot}
                castShadow
                receiveShadow
              >
                <torusGeometry args={[ring.radius, 0.015, 10, 20]} />
                <meshPhysicalMaterial
                  color={ring.light ? '#84BA5A' : '#4D8B31'}
                  normalMap={garnishNormal}
                  normalScale={NORMAL_SCALE_GARNISH}
                  roughness={0.3}
                  clearcoat={0.48}
                  emissive="#204A10"
                  emissiveIntensity={isGarnishHi ? 0.34 : 0}
                />
              </mesh>
            ))}

            {CHILI_RINGS.map((chili, idx) => (
              <group
                key={`chili-${idx}`}
                position={chili.pos}
                rotation={chili.rot}
                scale={chili.scale}
              >
                <mesh castShadow receiveShadow>
                  <torusGeometry args={[0.042, 0.014, 10, 18]} />
                  <meshPhysicalMaterial
                    color="#D4261C"
                    roughness={0.16}
                    clearcoat={0.85}
                    emissive="#7A0E08"
                    emissiveIntensity={isGarnishHi ? 0.36 : 0}
                  />
                </mesh>
                <mesh position={[0.01, 0.008, 0]}>
                  <sphereGeometry args={[0.011, 8, 8]} />
                  <meshStandardMaterial color="#F5E29C" roughness={0.4} />
                </mesh>
                <mesh position={[-0.012, -0.006, 0]}>
                  <sphereGeometry args={[0.01, 8, 8]} />
                  <meshStandardMaterial color="#F5E29C" roughness={0.4} />
                </mesh>
              </group>
            ))}

            {/* Backlit SSS Thai basil leaves */}
            {HERB_LEAVES.map((leaf, idx) => (
              <mesh
                key={`leaf-${idx}`}
                geometry={leafGeo}
                material={basilMat}
                position={leaf.pos}
                rotation={leaf.rot}
                scale={leaf.scale}
                castShadow
                receiveShadow
              />
            ))}
          </group>

          {/* Sculptural 8-pointed dark brown star anise pod */}
          <group ref={starAniseRef} position={[0.16, 0.165, -0.02]}>
            <mesh castShadow receiveShadow>
              <sphereGeometry args={[0.048, 14, 12]} />
              <meshStandardMaterial
                color="#4E2A14"
                normalMap={garnishNormal}
                normalScale={NORMAL_SCALE_ANISE}
                roughness={0.62}
                emissive="#4A1F0A"
                emissiveIntensity={isGarnishHi ? 0.38 : 0}
              />
            </mesh>
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              return (
                <group key={`pod-${i}`} rotation={[0, angle, 0]}>
                  <mesh
                    position={[0.095, 0.005, 0]}
                    rotation={[0, 0, -Math.PI / 2 + 0.12]}
                    scale={[0.85, 1.0, 0.65]}
                    castShadow
                    receiveShadow
                  >
                    <coneGeometry args={[0.042, 0.15, 8]} />
                    <meshStandardMaterial
                      color="#4E2A14"
                      normalMap={garnishNormal}
                      normalScale={NORMAL_SCALE_ANISE}
                      roughness={0.6}
                      emissive="#4A1F0A"
                      emissiveIntensity={isGarnishHi ? 0.38 : 0}
                    />
                  </mesh>
                  <mesh position={[0.075, 0.022, 0]} scale={[1.2, 0.7, 0.8]}>
                    <sphereGeometry args={[0.015, 8, 8]} />
                    <meshPhysicalMaterial
                      color="#753E1E"
                      roughness={0.16}
                      clearcoat={0.88}
                      emissive="#5A280A"
                      emissiveIntensity={isGarnishHi ? 0.36 : 0}
                    />
                  </mesh>
                </group>
              );
            })}
          </group>

          {/* Vibrant green lime wedge with backlit SSS juicy flesh */}
          <group position={[1.18, 0.34, -0.22]} rotation={[0.35, -0.35, -0.65]}>
            <mesh geometry={limeRindGeo} castShadow receiveShadow>
              <meshPhysicalMaterial
                color="#67A42B"
                normalMap={garnishNormal}
                normalScale={NORMAL_SCALE_GARNISH}
                roughness={0.44}
                clearcoat={0.44}
                clearcoatRoughness={0.28}
                emissive="#2B520A"
                emissiveIntensity={isGarnishHi ? 0.32 : 0}
              />
            </mesh>
            <mesh geometry={limePithGeo}>
              <meshStandardMaterial
                color="#F2F6E6"
                roughness={0.68}
                emissive="#4A5236"
                emissiveIntensity={isGarnishHi ? 0.22 : 0}
              />
            </mesh>
            <mesh geometry={limeFleshGeo} material={limeFleshMat} castShadow receiveShadow />
            {[-0.9, -0.45, 0, 0.45, 0.9].map((ang, sIdx) => (
              <mesh
                key={`seg-${sIdx}`}
                position={[Math.sin(ang) * 0.09, Math.cos(ang) * 0.09 - 0.03, 0]}
                rotation={[0, 0, -ang]}
              >
                <boxGeometry args={[0.01, 0.17, 0.198]} />
                <meshStandardMaterial color="#EFF5DC" roughness={0.5} />
              </mesh>
            ))}
          </group>
        </group>
      </FoodLayer>
    </group>
  );
}

export default PhoModel;

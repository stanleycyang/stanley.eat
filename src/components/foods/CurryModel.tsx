'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FoodModelProps } from '@/types/dish';
import {
  applyFoodSSS,
  displaceGeometryOrganic,
  getOrganicNormalMap,
  getPankoCrustTextures,
  getRiceGrainTextures,
  getStonewareTextures,
} from '@/lib/proceduralTextures';
import { FoodLayer } from './FoodLayer';

interface SesameSeed {
  pos: [number, number, number];
  rot: [number, number, number];
}

interface VegPiece {
  pos: [number, number, number];
  rot: [number, number, number];
  scale: [number, number, number];
}

interface KatsuSlice {
  pos: [number, number, number];
  rot: [number, number, number];
  scale: [number, number, number];
}

const NORMAL_SCALE_PLATE = new THREE.Vector2(0.62, 0.62);
const NORMAL_SCALE_RIM = new THREE.Vector2(0.55, 0.55);
const NORMAL_SCALE_SAUCE = new THREE.Vector2(0.32, 0.32);
const NORMAL_SCALE_PANKO = new THREE.Vector2(1.05, 1.05);
const NORMAL_SCALE_PORK = new THREE.Vector2(0.5, 0.5);
const NORMAL_SCALE_PICKLE = new THREE.Vector2(0.45, 0.45);

const RICE_GRAIN_COUNT = 420;

const SESAME_SEEDS: SesameSeed[] = [
  { pos: [-0.66, 0.382, 0.01], rot: [0.1, 0.4, 0.05] },
  { pos: [-0.61, 0.372, 0.08], rot: [-0.12, 1.2, 0.1] },
  { pos: [-0.71, 0.368, -0.06], rot: [0.18, 2.1, -0.08] },
  { pos: [-0.57, 0.358, -0.05], rot: [0.08, 0.8, -0.14] },
  { pos: [-0.74, 0.352, 0.09], rot: [-0.15, 1.7, 0.12] },
  { pos: [-0.63, 0.366, -0.12], rot: [0.22, 2.6, 0.05] },
  { pos: [-0.54, 0.342, 0.14], rot: [-0.18, 0.3, -0.16] },
  { pos: [-0.79, 0.336, -0.02], rot: [0.05, 1.4, 0.22] },
  { pos: [-0.69, 0.362, 0.14], rot: [-0.2, 2.4, 0.08] },
  { pos: [-0.6, 0.376, -0.01], rot: [0.04, 1.9, -0.05] },
  { pos: [-0.75, 0.342, -0.14], rot: [0.24, 0.6, 0.15] },
  { pos: [-0.52, 0.332, 0.04], rot: [-0.08, 2.8, -0.2] },
  { pos: [-0.67, 0.348, 0.21], rot: [-0.25, 1.1, 0.06] },
  { pos: [-0.82, 0.312, 0.08], rot: [-0.14, 0.5, 0.26] },
];

const CARROT_CHUNKS: VegPiece[] = [
  { pos: [0.68, -0.04, -0.34], rot: [0.25, 0.6, -0.18], scale: [1.05, 0.9, 1.0] },
  { pos: [0.96, -0.05, 0.14], rot: [-0.18, 2.1, 0.22], scale: [0.92, 0.85, 0.95] },
  { pos: [0.46, -0.04, 0.48], rot: [0.14, 1.1, 0.25], scale: [0.98, 0.88, 0.92] },
  { pos: [0.28, -0.05, -0.58], rot: [-0.22, 2.8, -0.15], scale: [0.88, 0.82, 0.9] },
  { pos: [1.06, -0.06, -0.22], rot: [0.18, 0.2, 0.12], scale: [0.82, 0.78, 0.85] },
];

const POTATO_CHUNKS: VegPiece[] = [
  { pos: [0.78, -0.03, 0.34], rot: [0.3, 0.9, 0.2], scale: [0.19, 0.13, 0.16] },
  { pos: [0.54, -0.02, -0.06], rot: [-0.2, 1.6, -0.15], scale: [0.2, 0.13, 0.17] },
  { pos: [0.98, -0.04, -0.04], rot: [0.15, 2.4, 0.25], scale: [0.17, 0.12, 0.15] },
  { pos: [0.64, -0.03, -0.52], rot: [-0.25, 0.4, 0.18], scale: [0.16, 0.11, 0.14] },
  { pos: [0.22, -0.04, 0.6], rot: [0.22, 1.9, -0.2], scale: [0.16, 0.11, 0.15] },
];

const PEAS_POSITIONS: [number, number, number][] = [
  [0.86, 0.005, 0.04],
  [0.58, 0.008, 0.26],
  [0.72, 0.006, -0.18],
  [1.08, 0.002, 0.26],
  [0.36, 0.006, -0.36],
  [0.92, 0.004, -0.38],
  [0.62, 0.005, 0.56],
];

const FUKUJINZUKE_PIECES: VegPiece[] = [
  { pos: [-1.18, -0.05, -0.58], rot: [0.35, 0.5, 0.4], scale: [1.0, 0.8, 1.0] },
  { pos: [-1.1, -0.04, -0.65], rot: [-0.25, 1.4, -0.3], scale: [0.92, 0.75, 0.95] },
  { pos: [-1.24, -0.03, -0.5], rot: [0.2, 2.3, 0.5], scale: [0.88, 0.72, 0.9] },
  { pos: [-1.14, -0.01, -0.55], rot: [-0.35, 0.9, -0.2], scale: [0.95, 0.7, 0.9] },
  { pos: [-1.04, -0.05, -0.56], rot: [0.15, 2.8, 0.3], scale: [0.85, 0.7, 0.85] },
];

const KATSU_SLICES: KatsuSlice[] = [
  { pos: [-0.24, 0.17, -0.44], rot: [-0.08, 0.34, -0.24], scale: [0.88, 0.92, 0.85] },
  { pos: [-0.14, 0.2, -0.26], rot: [-0.05, 0.32, -0.22], scale: [0.98, 1.0, 0.96] },
  { pos: [-0.04, 0.22, -0.07], rot: [-0.02, 0.3, -0.2], scale: [1.04, 1.04, 1.0] },
  { pos: [0.06, 0.21, 0.12], rot: [0.02, 0.28, -0.19], scale: [1.02, 1.02, 0.98] },
  { pos: [0.15, 0.18, 0.31], rot: [0.05, 0.26, -0.2], scale: [0.96, 0.96, 0.94] },
  { pos: [0.24, 0.14, 0.49], rot: [0.08, 0.24, -0.23], scale: [0.84, 0.88, 0.84] },
];

const KATSU_CRUMBS: [number, number, number][] = [
  [-0.22, 0.12, -0.05],
  [-0.08, 0.13, 0.04],
  [0.08, 0.12, -0.03],
  [0.2, 0.1, 0.05],
  [-0.14, 0.12, 0.06],
  [0.02, 0.13, -0.05],
  [0.14, 0.11, 0.02],
  [-0.26, 0.1, 0.02],
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

export function CurryModel({
  exploded,
  highlightedPart,
  onSelectPart,
}: FoodModelProps) {
  const sauceRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const riceInstRef = useRef<THREE.InstancedMesh>(null);

  const handleSelect = (partId: string) => {
    onSelectPart(highlightedPart === partId ? null : partId);
  };

  // Shared cached 512x512 Sobel RGB procedural PBR textures (NEVER dispose cached singletons)
  const stonewareTex = useMemo(() => getStonewareTextures(), []);
  const riceTex = useMemo(() => getRiceGrainTextures(), []);
  const pankoTex = useMemo(() => getPankoCrustTextures(), []);
  const sauceNormal = useMemo(() => getOrganicNormalMap(73, 10, 1.3), []);
  const vegNormal = useMemo(() => getOrganicNormalMap(109, 12, 1.5), []);
  const porkNormal = useMemo(() => getOrganicNormalMap(211, 14, 1.4), []);

  // Per-instance Food SSS materials (disposed cleanly on unmount)
  const riceMat = useMemo(
    () =>
      applyFoodSSS(
        new THREE.MeshPhysicalMaterial({
          color: '#FCF7EC',
          normalMap: riceTex.normalMap,
          normalScale: new THREE.Vector2(0.75, 0.75),
          roughnessMap: riceTex.roughnessMap,
          roughness: 0.78,
          metalness: 0,
          clearcoat: 0.42,
          clearcoatRoughness: 0.24,
          sheen: 0.32,
          sheenRoughness: 0.5,
          sheenColor: new THREE.Color('#FFFDF5'),
          emissive: new THREE.Color('#5C4428'),
          emissiveIntensity: 0,
        }),
        { color: '#FFF4DC', intensity: 0.35, power: 2.6, scale: 1.1 }
      ),
    [riceTex]
  );

  const riceGrainMat = useMemo(
    () =>
      applyFoodSSS(
        new THREE.MeshPhysicalMaterial({
          color: '#FFFDF7',
          roughness: 0.26,
          metalness: 0,
          clearcoat: 0.55,
          clearcoatRoughness: 0.18,
          emissive: new THREE.Color('#5C4428'),
          emissiveIntensity: 0,
        }),
        { color: '#FFF4DC', intensity: 0.36, power: 2.5, scale: 1.15 }
      ),
    []
  );

  const carrotMat = useMemo(
    () =>
      applyFoodSSS(
        new THREE.MeshPhysicalMaterial({
          color: '#E55E16',
          normalMap: vegNormal,
          normalScale: new THREE.Vector2(0.55, 0.55),
          roughness: 0.24,
          clearcoat: 0.68,
          clearcoatRoughness: 0.14,
          emissive: new THREE.Color('#7D2900'),
          emissiveIntensity: 0,
        }),
        { color: '#FF8A33', intensity: 0.48, power: 2.4, scale: 1.15 }
      ),
    [vegNormal]
  );

  const potatoMat = useMemo(
    () =>
      applyFoodSSS(
        new THREE.MeshPhysicalMaterial({
          color: '#ECCC80',
          normalMap: vegNormal,
          normalScale: new THREE.Vector2(0.6, 0.6),
          roughness: 0.36,
          clearcoat: 0.38,
          clearcoatRoughness: 0.22,
          emissive: new THREE.Color('#6A4A10'),
          emissiveIntensity: 0,
        }),
        { color: '#FFE6A8', intensity: 0.42, power: 2.5, scale: 1.1 }
      ),
    [vegNormal]
  );

  // Sculpted oval ceramic plate LatheGeometry
  const plateGeo = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.0, -0.45),
      new THREE.Vector2(0.58, -0.45),
      new THREE.Vector2(0.66, -0.49),
      new THREE.Vector2(0.75, -0.49),
      new THREE.Vector2(0.84, -0.42),
      new THREE.Vector2(1.06, -0.31),
      new THREE.Vector2(1.22, -0.15),
      new THREE.Vector2(1.26, -0.05),
      new THREE.Vector2(1.23, -0.02),
      new THREE.Vector2(1.18, -0.05),
      new THREE.Vector2(1.06, -0.19),
      new THREE.Vector2(0.84, -0.32),
      new THREE.Vector2(0.0, -0.34),
    ];
    const geo = new THREE.LatheGeometry(pts, 64);
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Organically sculpted rice dome mound + individual rice grain geometry
  const { riceMoundGeo, riceGrainGeo } = useMemo(() => {
    const mound = new THREE.SphereGeometry(0.92, 42, 30);
    mound.scale(0.74, 0.42, 0.86);
    mound.translate(-0.68, -0.04, 0.0);
    displaceGeometryOrganic(mound, {
      amplitude: 0.042,
      frequency: 3.6,
      seed: 19,
      flattenBottomY: -0.31,
      preserveSeam: true,
    });

    const grain = new THREE.SphereGeometry(1, 8, 6);
    grain.scale(0.041, 0.022, 0.024);
    grain.computeVertexNormals();

    return { riceMoundGeo: mound, riceGrainGeo: grain };
  }, []);

  // Organic golden curry roux pool cleanly nested inside the oval plate well (zero underside poke-through)
  const curryPoolGeo = useMemo(() => {
    const shape = new THREE.Shape();
    const rx = 1.36;
    const rz = 0.98;
    const steps = 32;

    const startAngle = Math.PI * 0.56;
    const endAngle = -Math.PI * 0.56;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = startAngle + (endAngle - startAngle) * t;
      const px = Math.cos(a) * rx;
      const py = Math.sin(a) * rz;
      if (i === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    }

    shape.bezierCurveTo(-0.34, -0.48, -0.22, 0.0, -0.26, 0.48);
    shape.bezierCurveTo(
      -0.28,
      0.74,
      -0.22,
      0.9,
      Math.cos(startAngle) * rx,
      Math.sin(startAngle) * rz
    );

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.032,
      bevelSize: 0.035,
      bevelSegments: 5,
      curveSegments: 24,
    });
    geo.rotateX(-Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Organically displaced simmered carrot half-moons & chunky potatoes
  const { carrotGeo, potatoGeo, pickleGeo } = useMemo(() => {
    const s = new THREE.Shape();
    s.absarc(0, 0, 0.145, 0, Math.PI, false);
    s.quadraticCurveTo(0, -0.025, 0.145, 0);
    const carrot = new THREE.ExtrudeGeometry(s, {
      depth: 0.075,
      bevelEnabled: true,
      bevelThickness: 0.024,
      bevelSize: 0.02,
      bevelSegments: 4,
    });
    carrot.center();
    displaceGeometryOrganic(carrot, {
      amplitude: 0.013,
      frequency: 9.5,
      seed: 103,
      preserveSeam: true,
    });

    const potato = new THREE.DodecahedronGeometry(1, 3);
    displaceGeometryOrganic(potato, {
      amplitude: 0.14,
      frequency: 2.1,
      seed: 211,
      preserveSeam: true,
    });

    const ps = new THREE.Shape();
    ps.absarc(0, 0, 0.085, 0.2, Math.PI * 1.18, false);
    ps.quadraticCurveTo(-0.02, 0.01, 0.085 * Math.cos(0.2), 0.085 * Math.sin(0.2));
    const pickle = new THREE.ExtrudeGeometry(ps, {
      depth: 0.016,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.005,
      bevelSegments: 2,
    });
    pickle.center();
    pickle.computeVertexNormals();

    return { carrotGeo: carrot, potatoGeo: potato, pickleGeo: pickle };
  }, []);

  // Craggy irregular panko-crusted tonkatsu shell + moist pork cross-section
  const { katsuCrustGeo, katsuPorkGeo, drizzleGeo } = useMemo(() => {
    const s = new THREE.Shape();
    const w = 0.34;
    const h = 0.115;
    s.moveTo(-w, -h * 0.25);
    s.quadraticCurveTo(-w, h, 0, h * 1.15);
    s.quadraticCurveTo(w, h, w, -h * 0.25);
    s.quadraticCurveTo(w * 0.85, -h, 0, -h * 0.95);
    s.quadraticCurveTo(-w * 0.85, -h, -w, -h * 0.25);

    const crust = new THREE.ExtrudeGeometry(s, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.024,
      bevelSize: 0.022,
      bevelSegments: 4,
      curveSegments: 18,
    });
    crust.center();
    displaceGeometryOrganic(crust, {
      amplitude: 0.013,
      frequency: 14.5,
      seed: 307,
      preserveSeam: true,
    });

    const ps = new THREE.Shape();
    const pw = 0.295;
    const ph = 0.088;
    ps.moveTo(-pw, -ph * 0.2);
    ps.quadraticCurveTo(-pw, ph, 0, ph * 1.08);
    ps.quadraticCurveTo(pw, ph, pw, -ph * 0.2);
    ps.quadraticCurveTo(pw * 0.85, -ph, 0, -ph * 0.92);
    ps.quadraticCurveTo(-pw * 0.85, -ph, -pw, -ph * 0.2);

    const pork = new THREE.ExtrudeGeometry(ps, {
      depth: 0.212,
      bevelEnabled: false,
    });
    pork.center();
    pork.computeVertexNormals();

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.22, 0.33, -0.26),
      new THREE.Vector3(0.06, 0.36, -0.18),
      new THREE.Vector3(-0.16, 0.36, -0.03),
      new THREE.Vector3(0.16, 0.36, 0.08),
      new THREE.Vector3(-0.06, 0.34, 0.22),
      new THREE.Vector3(0.24, 0.31, 0.31),
    ]);
    const drizzle = new THREE.TubeGeometry(curve, 44, 0.015, 8, false);

    return { katsuCrustGeo: crust, katsuPorkGeo: pork, drizzleGeo: drizzle };
  }, []);

  // Populate 420 deterministic instanced rice grains hugging the sculpted dome (zero per-frame allocs)
  useLayoutEffect(() => {
    const inst = riceInstRef.current;
    if (!inst) return;

    const rand = createSeededRand(2026);
    const dummy = new THREE.Object3D();
    const normal = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion();
    const localRot = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const grainColor = new THREE.Color();

    const cx = -0.68;
    const cy = -0.04;
    const rx = 0.695;
    const ry = 0.395;
    const rz = 0.805;

    for (let i = 0; i < RICE_GRAIN_COUNT; i++) {
      // Fibonacci hemisphere sampling biased toward visible upper surface
      const u = (i + 0.5) / RICE_GRAIN_COUNT;
      const phi = Math.acos(1 - u * 0.88);
      const theta = i * 2.39996323 + (rand() - 0.5) * 0.28;

      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      const radialJitter = 0.96 + rand() * 0.075;

      const dx = sinPhi * Math.cos(theta);
      const dy = cosPhi;
      const dz = sinPhi * Math.sin(theta);

      const x = cx + dx * rx * radialJitter;
      const y = Math.max(-0.27, cy + dy * ry * radialJitter);
      const z = dz * rz * radialJitter;

      dummy.position.set(x, y, z);

      // Align grain tangentially to dome surface with natural organic tumble
      normal.set(dx / rx, dy / ry, dz / rz).normalize();
      quat.setFromUnitVectors(up, normal);
      euler.set(
        (rand() - 0.5) * 0.55,
        rand() * Math.PI * 2,
        (rand() - 0.5) * 0.55
      );
      localRot.setFromEuler(euler);
      dummy.quaternion.copy(quat).multiply(localRot);

      const s = 0.85 + rand() * 0.42;
      dummy.scale.set(s * (0.95 + rand() * 0.2), s, s * (0.9 + rand() * 0.2));
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);

      // Subtle grain-to-grain warm ivory tonal variation
      const shade = 0.95 + rand() * 0.06;
      grainColor.setRGB(shade, shade * 0.985, shade * 0.945);
      inst.setColorAt(i, grainColor);
    }

    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  }, []);

  useEffect(() => {
    return () => {
      plateGeo.dispose();
      riceMoundGeo.dispose();
      riceGrainGeo.dispose();
      curryPoolGeo.dispose();
      carrotGeo.dispose();
      potatoGeo.dispose();
      pickleGeo.dispose();
      katsuCrustGeo.dispose();
      katsuPorkGeo.dispose();
      drizzleGeo.dispose();
      riceMat.dispose();
      riceGrainMat.dispose();
      carrotMat.dispose();
      potatoMat.dispose();
    };
  }, [
    plateGeo,
    riceMoundGeo,
    riceGrainGeo,
    curryPoolGeo,
    carrotGeo,
    potatoGeo,
    pickleGeo,
    katsuCrustGeo,
    katsuPorkGeo,
    drizzleGeo,
    riceMat,
    riceGrainMat,
    carrotMat,
    potatoMat,
  ]);

  const isPlateHi = highlightedPart === 'plate';
  const isRiceHi = highlightedPart === 'rice';
  const isSauceHi = highlightedPart === 'sauce';
  const isVegHi = highlightedPart === 'veg';
  const isKatsuHi = highlightedPart === 'katsu';

  useEffect(() => {
    riceMat.emissiveIntensity = isRiceHi ? 0.2 : 0;
    riceGrainMat.emissiveIntensity = isRiceHi ? 0.18 : 0;
  }, [isRiceHi, riceMat, riceGrainMat]);

  useEffect(() => {
    carrotMat.emissiveIntensity = isVegHi ? 0.3 : 0;
    potatoMat.emissiveIntensity = isVegHi ? 0.28 : 0;
  }, [isVegHi, carrotMat, potatoMat]);

  useFrame((state) => {
    if (sauceRef.current) {
      const t = state.clock.elapsedTime;
      sauceRef.current.clearcoatRoughness = 0.065 + Math.sin(t * 1.4) * 0.016;
    }
  });

  return (
    <group>
      {/* Layer 1: Sculpted Matte Speckled Stoneware Oval Plate */}
      <FoodLayer
        partId="plate"
        label="Oval Ceramic Plate"
        explodeY={-0.25}
        exploded={exploded}
        highlighted={isPlateHi}
        onSelect={handleSelect}
      >
        <group scale={[1.35, 1, 1.0]}>
          <mesh geometry={plateGeo} castShadow receiveShadow>
            <meshPhysicalMaterial
              color="#F8F1E6"
              map={stonewareTex.map}
              normalMap={stonewareTex.normalMap}
              normalScale={NORMAL_SCALE_PLATE}
              roughnessMap={stonewareTex.roughnessMap}
              roughness={0.86}
              metalness={0.02}
              clearcoat={0.28}
              clearcoatRoughness={0.42}
              emissive="#4A2E1A"
              emissiveIntensity={isPlateHi ? 0.2 : 0}
            />
          </mesh>
          <mesh position={[0, -0.032, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <torusGeometry args={[1.225, 0.022, 14, 72]} />
            <meshStandardMaterial
              color="#D4BEA4"
              normalMap={stonewareTex.normalMap}
              normalScale={NORMAL_SCALE_RIM}
              roughnessMap={stonewareTex.roughnessMap}
              roughness={0.78}
              emissive="#5A331C"
              emissiveIntensity={isPlateHi ? 0.22 : 0}
            />
          </mesh>
        </group>
      </FoodLayer>

      {/* Layer 2: Organic Rice Mound + 420 Instanced Individual Koshihikari Rice Grains */}
      <FoodLayer
        partId="rice"
        label="Koshihikari Rice"
        explodeY={0.25}
        pinPosition={[-1.2, 0.45, 0.3]}
        exploded={exploded}
        highlighted={isRiceHi}
        onSelect={handleSelect}
      >
        <group>
          <mesh geometry={riceMoundGeo} material={riceMat} castShadow receiveShadow />

          <instancedMesh
            ref={riceInstRef}
            args={[riceGrainGeo, riceGrainMat, RICE_GRAIN_COUNT]}
            castShadow
            receiveShadow
          />

          {/* Pinch of glossy black sesame seeds crowning the rice */}
          {SESAME_SEEDS.map((seed, idx) => (
            <mesh
              key={`sesame-${idx}`}
              position={seed.pos}
              rotation={seed.rot}
              scale={[0.022, 0.011, 0.013]}
              castShadow
            >
              <sphereGeometry args={[1, 8, 8]} />
              <meshPhysicalMaterial
                color="#1E1B18"
                roughness={0.26}
                clearcoat={0.55}
                metalness={0.04}
              />
            </mesh>
          ))}
        </group>
      </FoodLayer>

      {/* Layer 3: Mirror-Glossy Deep Mahogany Golden Curry Roux */}
      <FoodLayer
        partId="sauce"
        label="Golden Curry Roux"
        explodeY={0.55}
        pinPosition={[1.2, 0.35, 0.2]}
        exploded={exploded}
        highlighted={isSauceHi}
        onSelect={handleSelect}
      >
        <group>
          <mesh
            geometry={curryPoolGeo}
            position={[0, -0.19, 0]}
            castShadow
            receiveShadow
          >
            <meshPhysicalMaterial
              ref={sauceRef}
              color="#5F2A0A"
              normalMap={sauceNormal}
              normalScale={NORMAL_SCALE_SAUCE}
              roughness={0.12}
              metalness={0.02}
              clearcoat={1}
              clearcoatRoughness={0.065}
              ior={1.42}
              emissive="#7A2B08"
              emissiveIntensity={isSauceHi ? 0.34 : 0.03}
            />
          </mesh>
          {/* Subtle richer amber roux swells catching studio softboxes */}
          <mesh position={[0.74, -0.026, 0.06]} scale={[0.54, 0.042, 0.46]} receiveShadow>
            <sphereGeometry args={[1, 28, 16]} />
            <meshPhysicalMaterial
              color="#743810"
              normalMap={sauceNormal}
              normalScale={NORMAL_SCALE_SAUCE}
              roughness={0.1}
              clearcoat={1}
              clearcoatRoughness={0.055}
              emissive="#7A2B08"
              emissiveIntensity={isSauceHi ? 0.34 : 0.03}
            />
          </mesh>
          <mesh position={[0.38, -0.028, -0.32]} scale={[0.36, 0.032, 0.32]} receiveShadow>
            <sphereGeometry args={[1, 20, 14]} />
            <meshPhysicalMaterial
              color="#522107"
              normalMap={sauceNormal}
              normalScale={NORMAL_SCALE_SAUCE}
              roughness={0.11}
              clearcoat={1}
              clearcoatRoughness={0.06}
              emissive="#7A2B08"
              emissiveIntensity={isSauceHi ? 0.34 : 0.03}
            />
          </mesh>
        </group>
      </FoodLayer>

      {/* Layer 4: Organic Sculpted SSS Carrots, Potatoes, Peas & Fukujinzuke Pickles */}
      <FoodLayer
        partId="veg"
        label="Carrots & Potatoes"
        explodeY={0.95}
        pinPosition={[1.15, 0.65, -0.35]}
        exploded={exploded}
        highlighted={isVegHi}
        onSelect={handleSelect}
      >
        <group>
          {CARROT_CHUNKS.map((carrot, idx) => (
            <mesh
              key={`carrot-${idx}`}
              geometry={carrotGeo}
              material={carrotMat}
              position={carrot.pos}
              rotation={carrot.rot}
              scale={carrot.scale}
              castShadow
              receiveShadow
            />
          ))}

          {POTATO_CHUNKS.map((potato, idx) => (
            <mesh
              key={`potato-${idx}`}
              geometry={potatoGeo}
              material={potatoMat}
              position={potato.pos}
              rotation={potato.rot}
              scale={potato.scale}
              castShadow
              receiveShadow
            />
          ))}

          {PEAS_POSITIONS.map((pos, idx) => (
            <mesh key={`pea-${idx}`} position={pos} castShadow receiveShadow>
              <sphereGeometry args={[0.044, 14, 14]} />
              <meshPhysicalMaterial
                color="#5AA432"
                roughness={0.2}
                clearcoat={0.72}
                emissive="#245210"
                emissiveIntensity={isVegHi ? 0.34 : 0}
              />
            </mesh>
          ))}

          {FUKUJINZUKE_PIECES.map((pickle, idx) => (
            <mesh
              key={`pickle-${idx}`}
              geometry={pickleGeo}
              position={pickle.pos}
              rotation={pickle.rot}
              scale={pickle.scale}
              castShadow
              receiveShadow
            >
              <meshPhysicalMaterial
                color={idx % 2 === 0 ? '#BD241E' : '#D4362B'}
                normalMap={vegNormal}
                normalScale={NORMAL_SCALE_PICKLE}
                roughness={0.16}
                clearcoat={0.88}
                clearcoatRoughness={0.1}
                emissive="#6A100A"
                emissiveIntensity={isVegHi ? 0.34 : 0}
              />
            </mesh>
          ))}
        </group>
      </FoodLayer>

      {/* Layer 5: Craggy Crispy Panko-Crusted Pork Tonkatsu */}
      <FoodLayer
        partId="katsu"
        label="Crispy Pork Tonkatsu"
        explodeY={1.4}
        pinPosition={[0.0, 0.95, 0.55]}
        exploded={exploded}
        highlighted={isKatsuHi}
        onSelect={handleSelect}
      >
        <group>
          {KATSU_SLICES.map((slice, idx) => (
            <group
              key={`katsu-${idx}`}
              position={slice.pos}
              rotation={slice.rot}
              scale={slice.scale}
            >
              <mesh geometry={katsuCrustGeo} castShadow receiveShadow>
                <meshStandardMaterial
                  color="#E8B97A"
                  map={pankoTex.map}
                  normalMap={pankoTex.normalMap}
                  normalScale={NORMAL_SCALE_PANKO}
                  roughnessMap={pankoTex.roughnessMap}
                  roughness={0.96}
                  metalness={0.02}
                  emissive="#6B3408"
                  emissiveIntensity={isKatsuHi ? 0.28 : 0}
                />
              </mesh>

              <mesh geometry={katsuPorkGeo} castShadow receiveShadow>
                <meshPhysicalMaterial
                  color="#F3E1CE"
                  normalMap={porkNormal}
                  normalScale={NORMAL_SCALE_PORK}
                  roughness={0.34}
                  clearcoat={0.32}
                  clearcoatRoughness={0.26}
                  emissive="#634028"
                  emissiveIntensity={isKatsuHi ? 0.22 : 0}
                />
              </mesh>

              <mesh position={[0, 0.068, 0]} scale={[0.24, 0.018, 0.22]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshPhysicalMaterial
                  color="#FBF3E8"
                  roughness={0.26}
                  clearcoat={0.44}
                  emissive="#5C4428"
                  emissiveIntensity={isKatsuHi ? 0.2 : 0}
                />
              </mesh>

              {KATSU_CRUMBS.map((crumb, cIdx) => (
                <mesh
                  key={`crumb-${idx}-${cIdx}`}
                  position={[
                    crumb[0] * (cIdx % 2 === 0 ? 1 : -0.9),
                    crumb[1],
                    crumb[2],
                  ]}
                  scale={[0.032, 0.02, 0.026]}
                  castShadow
                >
                  <dodecahedronGeometry args={[1, 0]} />
                  <meshStandardMaterial
                    color={cIdx % 2 === 0 ? '#DF953A' : '#B5631B'}
                    normalMap={pankoTex.normalMap}
                    normalScale={NORMAL_SCALE_PANKO}
                    roughness={0.92}
                    emissive="#6B3408"
                    emissiveIntensity={isKatsuHi ? 0.26 : 0}
                  />
                </mesh>
              ))}
            </group>
          ))}

          <mesh geometry={drizzleGeo} castShadow receiveShadow>
            <meshPhysicalMaterial
              color="#301005"
              roughness={0.06}
              clearcoat={1}
              clearcoatRoughness={0.04}
              emissive="#541806"
              emissiveIntensity={isKatsuHi ? 0.34 : 0}
            />
          </mesh>
        </group>
      </FoodLayer>
    </group>
  );
}

export default CurryModel;

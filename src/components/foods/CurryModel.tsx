'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FoodModelProps } from '@/types/dish';
import {
  getOrganicNoiseBump,
  getPankoCrustTextures,
  getRiceGrainTextures,
  getStonewareTextures,
} from '@/lib/proceduralTextures';
import { FoodLayer } from './FoodLayer';

interface RiceCluster {
  pos: [number, number, number];
  scale: [number, number, number];
  rot: [number, number, number];
}

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

const RICE_CLUSTERS: RiceCluster[] = [
  { pos: [-0.62, 0.25, 0.0], scale: [0.34, 0.16, 0.38], rot: [0.05, 0.2, -0.08] },
  { pos: [-0.88, 0.14, -0.22], scale: [0.28, 0.16, 0.28], rot: [0.1, -0.3, 0.15] },
  { pos: [-0.92, 0.12, 0.24], scale: [0.26, 0.15, 0.28], rot: [-0.1, 0.4, 0.12] },
  { pos: [-0.48, 0.18, -0.34], scale: [0.26, 0.14, 0.25], rot: [0.15, 0.5, -0.1] },
  { pos: [-0.44, 0.16, 0.36], scale: [0.25, 0.14, 0.24], rot: [-0.12, -0.4, -0.08] },
  { pos: [-0.72, 0.12, -0.48], scale: [0.22, 0.13, 0.22], rot: [0.2, 0.1, 0.05] },
  { pos: [-0.68, 0.1, 0.5], scale: [0.22, 0.13, 0.22], rot: [-0.18, -0.2, 0.06] },
  { pos: [-1.08, 0.02, -0.02], scale: [0.22, 0.13, 0.32], rot: [0.0, 0.05, 0.22] },
  { pos: [-0.34, 0.14, 0.02], scale: [0.24, 0.14, 0.3], rot: [0.04, -0.15, -0.2] },
  // Fine bumpy surface rice-grain tufts for organic fluffy silhouette
  { pos: [-0.76, 0.27, -0.12], scale: [0.15, 0.09, 0.16], rot: [0.2, 0.6, 0.1] },
  { pos: [-0.56, 0.28, 0.14], scale: [0.16, 0.09, 0.15], rot: [-0.15, 0.3, -0.1] },
  { pos: [-0.66, 0.3, 0.02], scale: [0.14, 0.08, 0.14], rot: [0.1, -0.5, 0.08] },
  { pos: [-0.84, 0.21, 0.12], scale: [0.13, 0.08, 0.14], rot: [-0.2, 0.8, 0.2] },
  { pos: [-0.52, 0.22, -0.2], scale: [0.14, 0.08, 0.13], rot: [0.25, -0.3, -0.15] },
  { pos: [-0.95, 0.11, -0.36], scale: [0.14, 0.09, 0.14], rot: [0.12, 0.4, 0.25] },
  { pos: [-0.96, 0.1, 0.36], scale: [0.14, 0.08, 0.14], rot: [-0.14, -0.5, 0.24] },
  { pos: [-0.4, 0.14, -0.45], scale: [0.13, 0.08, 0.13], rot: [0.18, 0.2, -0.12] },
  { pos: [-0.38, 0.12, 0.46], scale: [0.13, 0.08, 0.13], rot: [-0.18, -0.3, -0.14] },
  { pos: [-0.64, 0.18, -0.38], scale: [0.13, 0.08, 0.12], rot: [0.22, 0.7, 0.05] },
  { pos: [-0.6, 0.18, 0.38], scale: [0.13, 0.08, 0.12], rot: [-0.2, -0.7, 0.04] },
  { pos: [-0.82, 0.22, -0.28], scale: [0.12, 0.07, 0.12], rot: [0.15, 0.25, 0.18] },
  { pos: [-0.75, 0.24, 0.24], scale: [0.12, 0.07, 0.12], rot: [-0.16, 0.55, 0.14] },
];

const SESAME_SEEDS: SesameSeed[] = [
  { pos: [-0.66, 0.365, 0.01], rot: [0.1, 0.4, 0.05] },
  { pos: [-0.61, 0.355, 0.08], rot: [-0.12, 1.2, 0.1] },
  { pos: [-0.71, 0.35, -0.06], rot: [0.18, 2.1, -0.08] },
  { pos: [-0.57, 0.34, -0.05], rot: [0.08, 0.8, -0.14] },
  { pos: [-0.74, 0.335, 0.09], rot: [-0.15, 1.7, 0.12] },
  { pos: [-0.63, 0.35, -0.12], rot: [0.22, 2.6, 0.05] },
  { pos: [-0.54, 0.325, 0.14], rot: [-0.18, 0.3, -0.16] },
  { pos: [-0.79, 0.32, -0.02], rot: [0.05, 1.4, 0.22] },
  { pos: [-0.69, 0.345, 0.14], rot: [-0.2, 2.4, 0.08] },
  { pos: [-0.6, 0.36, -0.01], rot: [0.04, 1.9, -0.05] },
  { pos: [-0.75, 0.325, -0.14], rot: [0.24, 0.6, 0.15] },
  { pos: [-0.52, 0.315, 0.04], rot: [-0.08, 2.8, -0.2] },
  { pos: [-0.67, 0.33, 0.21], rot: [-0.25, 1.1, 0.06] },
  { pos: [-0.82, 0.295, 0.08], rot: [-0.14, 0.5, 0.26] },
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

export function CurryModel({
  exploded,
  highlightedPart,
  onSelectPart,
}: FoodModelProps) {
  const sauceRef = useRef<THREE.MeshPhysicalMaterial>(null);

  const handleSelect = (partId: string) => {
    onSelectPart(highlightedPart === partId ? null : partId);
  };

  // Shared cached procedural PBR textures (do NOT dispose cached singletons)
  const stonewareTex = useMemo(() => getStonewareTextures(), []);
  const riceTex = useMemo(() => getRiceGrainTextures(), []);
  const pankoTex = useMemo(() => getPankoCrustTextures(), []);
  const sauceBump = useMemo(() => getOrganicNoiseBump(73, 10), []);
  const vegBump = useMemo(() => getOrganicNoiseBump(109, 12), []);
  const porkBump = useMemo(() => getOrganicNoiseBump(211, 14), []);

  // Sculpted oval ceramic plate LatheGeometry (scaled along X for an organic oval)
  const plateGeo = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.0, -0.45),
      new THREE.Vector2(0.58, -0.45),
      new THREE.Vector2(0.66, -0.49), // underside ceramic foot
      new THREE.Vector2(0.75, -0.49),
      new THREE.Vector2(0.84, -0.42),
      new THREE.Vector2(1.06, -0.31),
      new THREE.Vector2(1.22, -0.15),
      new THREE.Vector2(1.26, -0.05), // soft raised outer rim
      new THREE.Vector2(1.23, -0.02),
      new THREE.Vector2(1.18, -0.05),
      new THREE.Vector2(1.06, -0.19),
      new THREE.Vector2(0.84, -0.32),
      new THREE.Vector2(0.0, -0.34), // smooth inner well
    ];
    const geo = new THREE.LatheGeometry(pts, 64);
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Organic golden curry roux pool filling the right half & curving around the rice mound
  const curryPoolGeo = useMemo(() => {
    const shape = new THREE.Shape();
    const rx = 1.44;
    const rz = 1.04;
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

    shape.bezierCurveTo(-0.36, -0.52, -0.22, 0.0, -0.28, 0.52);
    shape.bezierCurveTo(
      -0.3,
      0.78,
      -0.24,
      0.94,
      Math.cos(startAngle) * rx,
      Math.sin(startAngle) * rz
    );

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.24,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.04,
      bevelSegments: 5,
      curveSegments: 24,
    });
    geo.rotateX(-Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Half-moon simmered carrot chunk geometry
  const carrotGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.absarc(0, 0, 0.145, 0, Math.PI, false);
    s.quadraticCurveTo(0, -0.025, 0.145, 0);
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 0.075,
      bevelEnabled: true,
      bevelThickness: 0.024,
      bevelSize: 0.02,
      bevelSegments: 4,
    });
    geo.center();
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Fukujinzuke curled pickle slice
  const pickleGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.absarc(0, 0, 0.085, 0.2, Math.PI * 1.18, false);
    s.quadraticCurveTo(-0.02, 0.01, 0.085 * Math.cos(0.2), 0.085 * Math.sin(0.2));
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 0.016,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.005,
      bevelSegments: 2,
    });
    geo.center();
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Crispy tonkatsu outer panko shell (pillowy rounded cross-section)
  const katsuCrustGeo = useMemo(() => {
    const s = new THREE.Shape();
    const w = 0.34;
    const h = 0.115;
    s.moveTo(-w, -h * 0.25);
    s.quadraticCurveTo(-w, h, 0, h * 1.15);
    s.quadraticCurveTo(w, h, w, -h * 0.25);
    s.quadraticCurveTo(w * 0.85, -h, 0, -h * 0.95);
    s.quadraticCurveTo(-w * 0.85, -h, -w, -h * 0.25);

    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.024,
      bevelSize: 0.022,
      bevelSegments: 4,
    });
    geo.center();
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Tender pork cross-section visible on both cut faces of each tonkatsu strip
  const katsuPorkGeo = useMemo(() => {
    const s = new THREE.Shape();
    const w = 0.295;
    const h = 0.088;
    s.moveTo(-w, -h * 0.2);
    s.quadraticCurveTo(-w, h, 0, h * 1.08);
    s.quadraticCurveTo(w, h, w, -h * 0.2);
    s.quadraticCurveTo(w * 0.85, -h, 0, -h * 0.92);
    s.quadraticCurveTo(-w * 0.85, -h, -w, -h * 0.2);

    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 0.194,
      bevelEnabled: false,
    });
    geo.center();
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Subtle tonkatsu bulldog-sauce drizzle ribbon over the top slices
  const drizzleGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.22, 0.33, -0.26),
      new THREE.Vector3(0.06, 0.36, -0.18),
      new THREE.Vector3(-0.16, 0.36, -0.03),
      new THREE.Vector3(0.16, 0.36, 0.08),
      new THREE.Vector3(-0.06, 0.34, 0.22),
      new THREE.Vector3(0.24, 0.31, 0.31),
    ]);
    return new THREE.TubeGeometry(curve, 44, 0.015, 8, false);
  }, []);

  useEffect(() => {
    return () => {
      plateGeo.dispose();
      curryPoolGeo.dispose();
      carrotGeo.dispose();
      pickleGeo.dispose();
      katsuCrustGeo.dispose();
      katsuPorkGeo.dispose();
      drizzleGeo.dispose();
    };
  }, [
    plateGeo,
    curryPoolGeo,
    carrotGeo,
    pickleGeo,
    katsuCrustGeo,
    katsuPorkGeo,
    drizzleGeo,
  ]);

  useFrame((state) => {
    if (sauceRef.current) {
      const t = state.clock.elapsedTime;
      sauceRef.current.clearcoatRoughness = 0.075 + Math.sin(t * 1.4) * 0.018;
    }
  });

  const isPlateHi = highlightedPart === 'plate';
  const isRiceHi = highlightedPart === 'rice';
  const isSauceHi = highlightedPart === 'sauce';
  const isVegHi = highlightedPart === 'veg';
  const isKatsuHi = highlightedPart === 'katsu';

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
              bumpMap={stonewareTex.bumpMap}
              bumpScale={0.016}
              roughnessMap={stonewareTex.roughnessMap}
              roughness={0.86}
              metalness={0.02}
              clearcoat={0.26}
              clearcoatRoughness={0.44}
              emissive="#4A2E1A"
              emissiveIntensity={isPlateHi ? 0.2 : 0}
            />
          </mesh>
          {/* Subtle hand-glazed toasted stoneware rim accent */}
          <mesh position={[0, -0.032, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
            <torusGeometry args={[1.225, 0.022, 14, 72]} />
            <meshStandardMaterial
              color="#D4BEA4"
              bumpMap={stonewareTex.bumpMap}
              bumpScale={0.018}
              roughnessMap={stonewareTex.roughnessMap}
              roughness={0.78}
              emissive="#5A331C"
              emissiveIntensity={isPlateHi ? 0.22 : 0}
            />
          </mesh>
        </group>
      </FoodLayer>

      {/* Layer 2: Pearlescent Textured Koshihikari Rice Mound */}
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
          {/* Main sculpted crescent-dome rice body with individual grain stipple bump + starch crown specular */}
          <mesh
            position={[-0.68, -0.04, 0.0]}
            scale={[0.76, 0.42, 0.88]}
            castShadow
            receiveShadow
          >
            <sphereGeometry args={[0.92, 36, 28]} />
            <meshPhysicalMaterial
              color="#FCF8F0"
              bumpMap={riceTex.bumpMap}
              bumpScale={0.048}
              roughnessMap={riceTex.roughnessMap}
              roughness={0.88}
              metalness={0.0}
              clearcoat={0.34}
              clearcoatRoughness={0.3}
              sheen={0.38}
              sheenRoughness={0.55}
              sheenColor="#FFFDF5"
              emissive="#5C4428"
              emissiveIntensity={isRiceHi ? 0.2 : 0}
            />
          </mesh>

          {/* Overlapping soft rice tufts with matching pearlescent grain PBR */}
          {RICE_CLUSTERS.map((c, idx) => (
            <mesh
              key={idx}
              position={c.pos}
              rotation={c.rot}
              scale={c.scale}
              castShadow
              receiveShadow
            >
              <icosahedronGeometry args={[1, 2]} />
              <meshPhysicalMaterial
                color={idx % 3 === 0 ? '#FFFDF8' : '#F9F3E8'}
                bumpMap={riceTex.bumpMap}
                bumpScale={0.042}
                roughnessMap={riceTex.roughnessMap}
                roughness={0.86}
                clearcoat={0.32}
                clearcoatRoughness={0.32}
                sheen={0.35}
                sheenColor="#FFFDF5"
                emissive="#5C4428"
                emissiveIntensity={isRiceHi ? 0.2 : 0}
              />
            </mesh>
          ))}

          {/* Pinch of glossy black sesame seeds on top */}
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
                roughness={0.28}
                clearcoat={0.5}
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
            position={[0, -0.31, 0]}
            castShadow
            receiveShadow
          >
            <meshPhysicalMaterial
              ref={sauceRef}
              color="#632D0C"
              bumpMap={sauceBump}
              bumpScale={0.012}
              roughness={0.14}
              metalness={0.02}
              clearcoat={1}
              clearcoatRoughness={0.08}
              ior={1.42}
              emissive="#7A2B08"
              emissiveIntensity={isSauceHi ? 0.35 : 0.04}
            />
          </mesh>
          {/* Subtle richer amber roux swell & depth variation */}
          <mesh position={[0.74, -0.026, 0.06]} scale={[0.54, 0.042, 0.46]} receiveShadow>
            <sphereGeometry args={[1, 28, 16]} />
            <meshPhysicalMaterial
              color="#763A12"
              bumpMap={sauceBump}
              bumpScale={0.01}
              roughness={0.12}
              clearcoat={1}
              clearcoatRoughness={0.06}
              emissive="#7A2B08"
              emissiveIntensity={isSauceHi ? 0.35 : 0.04}
            />
          </mesh>
          <mesh position={[0.38, -0.028, -0.32]} scale={[0.36, 0.032, 0.32]} receiveShadow>
            <sphereGeometry args={[1, 20, 14]} />
            <meshPhysicalMaterial
              color="#552408"
              bumpMap={sauceBump}
              bumpScale={0.009}
              roughness={0.13}
              clearcoat={1}
              clearcoatRoughness={0.07}
              emissive="#7A2B08"
              emissiveIntensity={isSauceHi ? 0.35 : 0.04}
            />
          </mesh>
        </group>
      </FoodLayer>

      {/* Layer 4: Simmered Carrots, Potatoes, Peas & Fukujinzuke Pickles */}
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
          {/* Chunky simmered carrot half-moons with subtle organic bump */}
          {CARROT_CHUNKS.map((carrot, idx) => (
            <mesh
              key={`carrot-${idx}`}
              geometry={carrotGeo}
              position={carrot.pos}
              rotation={carrot.rot}
              scale={carrot.scale}
              castShadow
              receiveShadow
            >
              <meshPhysicalMaterial
                color="#E56119"
                bumpMap={vegBump}
                bumpScale={0.016}
                roughness={0.24}
                clearcoat={0.62}
                clearcoatRoughness={0.16}
                emissive="#7D2900"
                emissiveIntensity={isVegHi ? 0.32 : 0}
              />
            </mesh>
          ))}

          {/* Golden-cream potato chunks glistening with curry glaze */}
          {POTATO_CHUNKS.map((potato, idx) => (
            <mesh
              key={`potato-${idx}`}
              position={potato.pos}
              rotation={potato.rot}
              scale={potato.scale}
              castShadow
              receiveShadow
            >
              <dodecahedronGeometry args={[1, 2]} />
              <meshPhysicalMaterial
                color="#ECCE84"
                bumpMap={vegBump}
                bumpScale={0.02}
                roughness={0.38}
                clearcoat={0.36}
                clearcoatRoughness={0.22}
                emissive="#6A4A10"
                emissiveIntensity={isVegHi ? 0.3 : 0}
              />
            </mesh>
          ))}

          {/* Bright sweet green peas */}
          {PEAS_POSITIONS.map((pos, idx) => (
            <mesh key={`pea-${idx}`} position={pos} castShadow>
              <sphereGeometry args={[0.044, 14, 14]} />
              <meshPhysicalMaterial
                color="#5AA432"
                roughness={0.22}
                clearcoat={0.65}
                emissive="#245210"
                emissiveIntensity={isVegHi ? 0.36 : 0}
              />
            </mesh>
          ))}

          {/* Red fukujinzuke pickles tucked neatly on the rim */}
          {FUKUJINZUKE_PIECES.map((pickle, idx) => (
            <mesh
              key={`pickle-${idx}`}
              geometry={pickleGeo}
              position={pickle.pos}
              rotation={pickle.rot}
              scale={pickle.scale}
              castShadow
            >
              <meshPhysicalMaterial
                color={idx % 2 === 0 ? '#BD241E' : '#D4362B'}
                bumpMap={vegBump}
                bumpScale={0.014}
                roughness={0.18}
                clearcoat={0.85}
                clearcoatRoughness={0.12}
                emissive="#6A100A"
                emissiveIntensity={isVegHi ? 0.36 : 0}
              />
            </mesh>
          ))}
        </group>
      </FoodLayer>

      {/* Layer 5: Diagonally Sliced Crispy Panko Pork Tonkatsu */}
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
              {/* Crispy porous golden-fried panko breading with high roughness contrast */}
              <mesh geometry={katsuCrustGeo} castShadow receiveShadow>
                <meshStandardMaterial
                  color="#E8B97A"
                  map={pankoTex.map}
                  bumpMap={pankoTex.bumpMap}
                  bumpScale={0.058}
                  roughnessMap={pankoTex.roughnessMap}
                  roughness={0.95}
                  metalness={0.02}
                  emissive="#6B3408"
                  emissiveIntensity={isKatsuHi ? 0.28 : 0}
                />
              </mesh>

              {/* Moist tender ivory pork cross-section on cut faces */}
              <mesh geometry={katsuPorkGeo} receiveShadow>
                <meshPhysicalMaterial
                  color="#F3E1CE"
                  bumpMap={porkBump}
                  bumpScale={0.015}
                  roughness={0.36}
                  clearcoat={0.28}
                  clearcoatRoughness={0.28}
                  emissive="#634028"
                  emissiveIntensity={isKatsuHi ? 0.22 : 0}
                />
              </mesh>

              {/* Subtle pearly fat cap accent along upper meat edge */}
              <mesh position={[0, 0.068, 0]} scale={[0.24, 0.018, 0.197]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshPhysicalMaterial
                  color="#FBF3E8"
                  roughness={0.28}
                  clearcoat={0.4}
                  emissive="#5C4428"
                  emissiveIntensity={isKatsuHi ? 0.2 : 0}
                />
              </mesh>

              {/* Sculpted crispy panko crumbs crowning each slice */}
              {KATSU_CRUMBS.map((crumb, cIdx) => (
                <mesh
                  key={`crumb-${idx}-${cIdx}`}
                  position={[
                    crumb[0] * (cIdx % 2 === 0 ? 1 : -0.9),
                    crumb[1],
                    crumb[2],
                  ]}
                  scale={[0.032, 0.02, 0.026]}
                >
                  <dodecahedronGeometry args={[1, 0]} />
                  <meshStandardMaterial
                    color={cIdx % 2 === 0 ? '#DF953A' : '#B5631B'}
                    bumpMap={pankoTex.bumpMap}
                    bumpScale={0.04}
                    roughness={0.9}
                    emissive="#6B3408"
                    emissiveIntensity={isKatsuHi ? 0.28 : 0}
                  />
                </mesh>
              ))}
            </group>
          ))}

          {/* Mirror-glossy dark tonkatsu sauce drizzle contrasting against crispy panko */}
          <mesh geometry={drizzleGeo} castShadow>
            <meshPhysicalMaterial
              color="#341206"
              roughness={0.08}
              clearcoat={1}
              clearcoatRoughness={0.05}
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

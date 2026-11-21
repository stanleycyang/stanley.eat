'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FoodModelProps } from '@/types/dish';
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
  // Fine bumpy surface rice-grain tufts for Studio Ghibli silhouette
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

function createPankoTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#C87A28';
  ctx.fillRect(0, 0, 128, 128);

  // Deterministic pseudo-random crispy panko flakes
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const palette = ['#DF9A44', '#B5631B', '#E8AE5B', '#9D4F14', '#D48631'];
  for (let i = 0; i < 420; i++) {
    ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
    const x = rand() * 128;
    const y = rand() * 128;
    const rx = 1.5 + rand() * 3.2;
    const ry = 1.0 + rand() * 2.0;
    const angle = rand() * Math.PI;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCeramicSpeckleTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#F5EDE1';
  ctx.fillRect(0, 0, 128, 128);

  let seed = 91;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = i % 3 === 0 ? 'rgba(155, 134, 112, 0.28)' : 'rgba(205, 190, 170, 0.24)';
    const x = rand() * 128;
    const y = rand() * 128;
    const r = 0.6 + rand() * 1.4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function CurryModel({
  exploded,
  highlightedPart,
  onSelectPart,
}: FoodModelProps) {
  const sauceRef = useRef<THREE.MeshPhysicalMaterial>(null);

  const handleSelect = (partId: string) => {
    onSelectPart(highlightedPart === partId ? null : partId);
  };

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

    // Right perimeter arc from top-left-ish (-0.18, +rz) clockwise through right (+rx, 0) to bottom (-0.18, -rz)
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

    // Organic gentle curve hugging the rice mound's right flank back up to start
    shape.bezierCurveTo(-0.36, -0.52, -0.22, 0.0, -0.28, 0.52);
    shape.bezierCurveTo(-0.3, 0.78, -0.24, 0.94, Math.cos(startAngle) * rx, Math.sin(startAngle) * rz);

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

  const pankoTexture = useMemo(() => createPankoTexture(), []);
  const ceramicTexture = useMemo(() => createCeramicSpeckleTexture(), []);

  useEffect(() => {
    return () => {
      plateGeo.dispose();
      curryPoolGeo.dispose();
      carrotGeo.dispose();
      pickleGeo.dispose();
      katsuCrustGeo.dispose();
      katsuPorkGeo.dispose();
      drizzleGeo.dispose();
      pankoTexture?.dispose();
      ceramicTexture?.dispose();
    };
  }, [
    plateGeo,
    curryPoolGeo,
    carrotGeo,
    pickleGeo,
    katsuCrustGeo,
    katsuPorkGeo,
    drizzleGeo,
    pankoTexture,
    ceramicTexture,
  ]);

  useFrame((state) => {
    if (sauceRef.current) {
      const t = state.clock.elapsedTime;
      sauceRef.current.clearcoatRoughness = 0.09 + Math.sin(t * 1.4) * 0.02;
    }
  });

  const isPlateHi = highlightedPart === 'plate';
  const isRiceHi = highlightedPart === 'rice';
  const isSauceHi = highlightedPart === 'sauce';
  const isVegHi = highlightedPart === 'veg';
  const isKatsuHi = highlightedPart === 'katsu';

  return (
    <group>
      {/* Layer 1: Sculpted Oval Ceramic Plate */}
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
              color="#F5EDE1"
              map={ceramicTexture ?? undefined}
              roughness={0.44}
              metalness={0.02}
              clearcoat={0.32}
              clearcoatRoughness={0.38}
              emissive="#4A2E1A"
              emissiveIntensity={isPlateHi ? 0.22 : 0}
            />
          </mesh>
          {/* Subtle hand-glazed toasted stoneware rim accent */}
          <mesh position={[0, -0.032, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
            <torusGeometry args={[1.225, 0.022, 14, 72]} />
            <meshStandardMaterial
              color="#D9C7B0"
              roughness={0.55}
              emissive="#5A331C"
              emissiveIntensity={isPlateHi ? 0.25 : 0}
            />
          </mesh>
        </group>
      </FoodLayer>

      {/* Layer 2: Fluffy Koshihikari Rice Mound */}
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
          {/* Main sculpted crescent-dome rice body */}
          <mesh
            position={[-0.68, -0.04, 0.0]}
            scale={[0.76, 0.42, 0.88]}
            castShadow
            receiveShadow
          >
            <sphereGeometry args={[0.92, 32, 24]} />
            <meshStandardMaterial
              color="#FAF6EE"
              roughness={0.72}
              metalness={0.0}
              emissive="#5C4428"
              emissiveIntensity={isRiceHi ? 0.22 : 0}
            />
          </mesh>

          {/* Overlapping soft rice tufts for organic fluffy silhouette */}
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
              <meshStandardMaterial
                color={idx % 3 === 0 ? '#FFFDF8' : '#F8F2E7'}
                roughness={0.7}
                emissive="#5C4428"
                emissiveIntensity={isRiceHi ? 0.22 : 0}
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
              <meshStandardMaterial
                color="#1E1B18"
                roughness={0.32}
                metalness={0.05}
              />
            </mesh>
          ))}
        </group>
      </FoodLayer>

      {/* Layer 3: Glossy Golden Curry Roux */}
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
              color="#6B3510"
              roughness={0.15}
              metalness={0.02}
              clearcoat={0.92}
              clearcoatRoughness={0.1}
              emissive="#7A2B08"
              emissiveIntensity={isSauceHi ? 0.38 : 0}
            />
          </mesh>
          {/* Subtle glossy roux sheen waves */}
          <mesh position={[0.76, -0.028, 0.05]} scale={[0.52, 0.04, 0.44]} receiveShadow>
            <sphereGeometry args={[1, 24, 14]} />
            <meshPhysicalMaterial
              color="#753B13"
              roughness={0.13}
              clearcoat={0.95}
              clearcoatRoughness={0.08}
              emissive="#7A2B08"
              emissiveIntensity={isSauceHi ? 0.38 : 0}
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
          {/* Chunky simmered carrot half-moons */}
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
                color="#E8641B"
                roughness={0.26}
                clearcoat={0.48}
                clearcoatRoughness={0.2}
                emissive="#7D2900"
                emissiveIntensity={isVegHi ? 0.35 : 0}
              />
            </mesh>
          ))}

          {/* Golden-cream potato chunks */}
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
                color="#EED28B"
                roughness={0.34}
                clearcoat={0.3}
                clearcoatRoughness={0.25}
                emissive="#6A4A10"
                emissiveIntensity={isVegHi ? 0.32 : 0}
              />
            </mesh>
          ))}

          {/* Bright sweet green peas */}
          {PEAS_POSITIONS.map((pos, idx) => (
            <mesh key={`pea-${idx}`} position={pos} castShadow>
              <sphereGeometry args={[0.044, 14, 14]} />
              <meshPhysicalMaterial
                color="#5CA634"
                roughness={0.25}
                clearcoat={0.5}
                emissive="#245210"
                emissiveIntensity={isVegHi ? 0.4 : 0}
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
                roughness={0.2}
                clearcoat={0.75}
                clearcoatRoughness={0.14}
                emissive="#6A100A"
                emissiveIntensity={isVegHi ? 0.4 : 0}
              />
            </mesh>
          ))}
        </group>
      </FoodLayer>

      {/* Layer 5: Diagonally Sliced Crispy Pork Tonkatsu */}
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
              {/* Crispy golden-brown panko exterior */}
              <mesh geometry={katsuCrustGeo} castShadow receiveShadow>
                <meshStandardMaterial
                  color="#C87A28"
                  map={pankoTexture ?? undefined}
                  roughness={0.78}
                  metalness={0.02}
                  emissive="#6B3408"
                  emissiveIntensity={isKatsuHi ? 0.32 : 0}
                />
              </mesh>

              {/* Tender warm off-white pork cross-section on cut faces */}
              <mesh geometry={katsuPorkGeo} receiveShadow>
                <meshPhysicalMaterial
                  color="#F2DFCC"
                  roughness={0.42}
                  clearcoat={0.18}
                  clearcoatRoughness={0.35}
                  emissive="#634028"
                  emissiveIntensity={isKatsuHi ? 0.25 : 0}
                />
              </mesh>

              {/* Subtle pearly fat cap accent along upper meat edge */}
              <mesh position={[0, 0.068, 0]} scale={[0.24, 0.018, 0.197]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial
                  color="#FBF3E8"
                  roughness={0.35}
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
                    color={cIdx % 2 === 0 ? '#DA8D36' : '#B8671E'}
                    roughness={0.82}
                    emissive="#6B3408"
                    emissiveIntensity={isKatsuHi ? 0.3 : 0}
                  />
                </mesh>
              ))}
            </group>
          ))}

          {/* Glossy dark tonkatsu sauce drizzle ribbon */}
          <mesh geometry={drizzleGeo} castShadow>
            <meshPhysicalMaterial
              color="#3C1608"
              roughness={0.12}
              clearcoat={1}
              clearcoatRoughness={0.08}
              emissive="#541806"
              emissiveIntensity={isKatsuHi ? 0.35 : 0}
            />
          </mesh>
        </group>
      </FoodLayer>
    </group>
  );
}

export default CurryModel;

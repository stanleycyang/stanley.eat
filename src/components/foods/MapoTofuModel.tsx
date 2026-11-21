'use client';

import React, { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FoodModelProps } from '@/types/dish';
import {
  applyFoodSSS,
  applyWetnessVertexColors,
  createPbrBrothMaterial,
  displaceGeometryOrganic,
  getOrganicNormalMap,
  getPankoCrustTextures,
  getSlateTextures,
  updateBrothMaterial,
} from '@/lib/proceduralTextures';
import { FoodLayer } from './FoodLayer';

interface TofuCubeSpec {
  pos: [number, number, number];
  rot: [number, number, number];
  scale: [number, number, number];
}

interface PorkCrumbleSpec {
  pos: [number, number, number];
  rot: [number, number, number];
  scale: [number, number, number];
  dark: boolean;
}

interface ScallionRingSpec {
  pos: [number, number, number];
  rot: [number, number, number];
  radius: number;
  bright: boolean;
}

const NORMAL_SCALE_BOWL = new THREE.Vector2(0.95, 0.95);
const NORMAL_SCALE_LIP = new THREE.Vector2(0.6, 0.6);
const NORMAL_SCALE_PORK = new THREE.Vector2(0.95, 0.95);

// 16 plump, tumbled silken tofu cubes naturally mounded in the crimson chili oil
const TOFU_CUBES: TofuCubeSpec[] = [
  { pos: [-0.62, 0.04, 0.34], rot: [0.18, 0.42, -0.14], scale: [1.0, 0.94, 0.98] },
  { pos: [-0.66, 0.05, -0.24], rot: [-0.12, 1.15, 0.2], scale: [0.96, 0.96, 1.02] },
  { pos: [-0.14, 0.04, 0.66], rot: [0.22, -0.35, 0.12], scale: [1.02, 0.92, 0.96] },
  { pos: [0.46, 0.04, 0.52], rot: [-0.16, 0.78, -0.22], scale: [0.98, 0.95, 1.0] },
  { pos: [0.7, 0.03, -0.04], rot: [0.14, 1.48, 0.16], scale: [0.95, 0.92, 0.96] },
  { pos: [0.48, 0.05, -0.56], rot: [-0.2, 0.28, -0.12], scale: [1.0, 0.94, 0.98] },
  { pos: [-0.14, 0.04, -0.68], rot: [0.16, -0.82, 0.18], scale: [0.98, 0.92, 1.0] },
  { pos: [-0.34, 0.12, 0.22], rot: [-0.22, 0.62, 0.14], scale: [1.04, 0.98, 1.02] },
  { pos: [0.26, 0.11, 0.24], rot: [0.18, -0.52, -0.2], scale: [1.0, 0.96, 1.02] },
  { pos: [0.32, 0.12, -0.24], rot: [-0.14, 1.08, 0.16], scale: [1.02, 0.98, 0.96] },
  { pos: [-0.32, 0.13, -0.28], rot: [0.24, 0.15, -0.18], scale: [0.98, 0.95, 1.0] },
  { pos: [0.02, 0.09, -0.36], rot: [-0.18, 0.92, 0.22], scale: [0.94, 0.94, 0.98] },
  { pos: [0.04, 0.1, 0.36], rot: [0.14, -0.24, -0.15], scale: [0.96, 0.94, 0.96] },
  { pos: [-0.12, 0.21, 0.04], rot: [0.26, 0.48, -0.22], scale: [1.04, 0.98, 1.02] },
  { pos: [0.18, 0.19, -0.02], rot: [-0.24, -0.7, 0.2], scale: [0.98, 0.94, 1.0] },
  { pos: [-0.04, 0.18, -0.22], rot: [0.16, 1.25, 0.18], scale: [0.94, 0.92, 0.96] },
];

// Subtle glistening red sauce glaze pools peeking between top tofu cubes
const SAUCE_GLAZE_SPOTS: [number, number, number, number][] = [
  [0.02, 0.165, 0.14, 0.09],
  [-0.22, 0.155, -0.08, 0.085],
  [0.14, 0.155, -0.16, 0.08],
  [0.38, 0.11, 0.06, 0.09],
  [-0.44, 0.11, 0.06, 0.085],
  [0.08, 0.135, 0.42, 0.075],
];

// Glistening red oil droplets clinging around the inner clay bowl wall
const EDGE_DROPLETS: [number, number, number, number][] = [
  [1.06, 0.11, 0.22, 0.036],
  [0.92, 0.13, 0.56, 0.028],
  [0.54, 0.115, 0.94, 0.034],
  [-0.18, 0.125, 1.06, 0.03],
  [-0.78, 0.11, 0.74, 0.036],
  [-1.06, 0.12, 0.12, 0.032],
  [-0.94, 0.115, -0.52, 0.035],
  [-0.42, 0.13, -0.98, 0.028],
  [0.26, 0.11, -1.04, 0.034],
  [0.82, 0.125, -0.7, 0.03],
  [1.02, 0.145, -0.34, 0.024],
  [-0.64, 0.14, -0.84, 0.026],
  [0.14, 0.14, 1.05, 0.025],
];

// Caramelized crispy minced pork crumbles tumbled over tofu & sauce
const PORK_CRUMBLES: PorkCrumbleSpec[] = [
  { pos: [-0.04, 0.26, 0.12], rot: [0.4, 0.8, 0.2], scale: [0.055, 0.04, 0.048], dark: false },
  { pos: [0.1, 0.25, 0.04], rot: [0.2, 1.5, -0.3], scale: [0.048, 0.036, 0.044], dark: true },
  { pos: [-0.18, 0.24, -0.06], rot: [-0.3, 0.4, 0.5], scale: [0.052, 0.038, 0.046], dark: false },
  { pos: [0.04, 0.22, -0.18], rot: [0.6, 2.1, -0.1], scale: [0.05, 0.038, 0.045], dark: true },
  { pos: [-0.28, 0.19, 0.28], rot: [-0.2, 1.1, 0.4], scale: [0.056, 0.042, 0.048], dark: false },
  { pos: [0.34, 0.18, 0.18], rot: [0.5, -0.6, 0.2], scale: [0.054, 0.04, 0.05], dark: true },
  { pos: [0.22, 0.19, -0.32], rot: [-0.4, 2.4, -0.3], scale: [0.048, 0.035, 0.044], dark: false },
  { pos: [-0.42, 0.17, -0.14], rot: [0.3, 0.9, 0.6], scale: [0.052, 0.04, 0.046], dark: true },
  { pos: [-0.1, 0.15, 0.48], rot: [-0.5, 1.8, -0.2], scale: [0.054, 0.04, 0.048], dark: false },
  { pos: [0.48, 0.14, 0.36], rot: [0.2, -1.2, 0.4], scale: [0.05, 0.038, 0.044], dark: true },
  { pos: [0.54, 0.13, -0.14], rot: [-0.3, 0.5, -0.5], scale: [0.052, 0.036, 0.046], dark: false },
  { pos: [-0.52, 0.14, 0.18], rot: [0.4, 2.6, 0.1], scale: [0.048, 0.038, 0.044], dark: true },
  { pos: [-0.38, 0.16, -0.44], rot: [-0.2, -0.4, 0.3], scale: [0.052, 0.038, 0.048], dark: false },
  { pos: [0.16, 0.14, -0.56], rot: [0.5, 1.3, -0.4], scale: [0.048, 0.035, 0.042], dark: true },
  { pos: [-0.14, 0.28, -0.02], rot: [0.1, 0.7, 0.3], scale: [0.042, 0.032, 0.038], dark: true },
  { pos: [0.24, 0.24, -0.06], rot: [-0.4, 2.0, 0.2], scale: [0.044, 0.034, 0.04], dark: false },
  { pos: [-0.02, 0.2, 0.28], rot: [0.3, -0.9, -0.3], scale: [0.046, 0.036, 0.042], dark: true },
  { pos: [-0.36, 0.2, 0.08], rot: [-0.1, 1.4, 0.5], scale: [0.046, 0.034, 0.042], dark: false },
  { pos: [0.42, 0.16, -0.38], rot: [0.6, 0.2, -0.2], scale: [0.05, 0.038, 0.044], dark: true },
  { pos: [-0.58, 0.12, -0.38], rot: [-0.3, 2.2, 0.4], scale: [0.046, 0.034, 0.042], dark: false },
  { pos: [0.64, 0.11, 0.14], rot: [0.2, -1.5, -0.3], scale: [0.044, 0.034, 0.04], dark: true },
  { pos: [0.28, 0.13, 0.56], rot: [-0.5, 0.8, 0.2], scale: [0.048, 0.035, 0.044], dark: false },
  { pos: [-0.46, 0.12, 0.48], rot: [0.4, 1.9, -0.4], scale: [0.046, 0.034, 0.042], dark: true },
  { pos: [-0.04, 0.13, -0.58], rot: [-0.2, -0.7, 0.5], scale: [0.046, 0.036, 0.04], dark: false },
  { pos: [0.08, 0.27, -0.09], rot: [0.3, 1.1, 0.2], scale: [0.04, 0.03, 0.036], dark: false },
  { pos: [-0.24, 0.22, 0.14], rot: [-0.3, 2.5, -0.2], scale: [0.044, 0.032, 0.04], dark: true },
  { pos: [0.16, 0.21, 0.26], rot: [0.5, 0.3, 0.4], scale: [0.044, 0.032, 0.038], dark: false },
  { pos: [0.38, 0.19, -0.1], rot: [-0.4, -1.1, 0.3], scale: [0.046, 0.034, 0.042], dark: true },
  { pos: [-0.18, 0.16, -0.42], rot: [0.2, 1.6, -0.5], scale: [0.044, 0.034, 0.04], dark: false },
  { pos: [0.02, 0.19, 0.04], rot: [-0.2, 0.6, 0.3], scale: [0.042, 0.032, 0.038], dark: true },
];

// Glossy fermented black beans (douchi) nestled among the pork & tofu
const DOUCHI_BEANS: [number, number, number, number][] = [
  [-0.08, 0.285, 0.08, 0.4],
  [0.2, 0.255, 0.04, 1.3],
  [-0.26, 0.205, -0.18, 2.2],
  [0.14, 0.17, 0.38, 0.8],
  [0.44, 0.155, -0.18, 1.9],
  [-0.48, 0.15, 0.08, 2.8],
  [0.02, 0.22, -0.28, 0.2],
  [0.34, 0.15, 0.34, 1.5],
  [-0.22, 0.145, 0.44, 2.5],
  [-0.36, 0.14, -0.42, 0.9],
  [0.54, 0.12, 0.06, 1.7],
  [0.08, 0.14, -0.54, 2.1],
];

// Bright emerald-green freshly chopped scallion rings crowning the Mapo Tofu
const SCALLION_RINGS: ScallionRingSpec[] = [
  { pos: [-0.08, 0.315, 0.02], rot: [Math.PI / 2 + 0.18, 0.12, 0.4], radius: 0.048, bright: true },
  { pos: [0.08, 0.3, 0.08], rot: [Math.PI / 2 - 0.14, -0.1, 1.1], radius: 0.044, bright: false },
  { pos: [0.18, 0.29, -0.06], rot: [Math.PI / 2 + 0.12, 0.18, 2.0], radius: 0.046, bright: true },
  { pos: [-0.22, 0.28, -0.08], rot: [Math.PI / 2 - 0.16, 0.08, 0.7], radius: 0.045, bright: false },
  { pos: [-0.04, 0.285, -0.18], rot: [Math.PI / 2 + 0.1, -0.15, 1.7], radius: 0.042, bright: true },
  { pos: [-0.32, 0.23, 0.22], rot: [Math.PI / 2 + 0.2, 0.1, 2.5], radius: 0.048, bright: false },
  { pos: [0.28, 0.225, 0.22], rot: [Math.PI / 2 - 0.18, -0.12, 0.3], radius: 0.046, bright: true },
  { pos: [0.34, 0.22, -0.24], rot: [Math.PI / 2 + 0.15, 0.14, 1.4], radius: 0.044, bright: false },
  { pos: [-0.34, 0.225, -0.28], rot: [Math.PI / 2 - 0.12, -0.08, 2.2], radius: 0.046, bright: true },
  { pos: [0.02, 0.22, 0.36], rot: [Math.PI / 2 + 0.16, 0.06, 0.9], radius: 0.044, bright: false },
  { pos: [-0.14, 0.21, 0.44], rot: [Math.PI / 2 - 0.14, 0.14, 1.8], radius: 0.042, bright: true },
  { pos: [0.14, 0.215, -0.36], rot: [Math.PI / 2 + 0.12, -0.16, 2.7], radius: 0.045, bright: false },
  { pos: [-0.52, 0.165, 0.26], rot: [Math.PI / 2 + 0.22, 0.08, 0.5], radius: 0.042, bright: true },
  { pos: [0.48, 0.165, 0.4], rot: [Math.PI / 2 - 0.18, -0.14, 1.3], radius: 0.044, bright: false },
  { pos: [0.56, 0.155, -0.06], rot: [Math.PI / 2 + 0.14, 0.12, 2.1], radius: 0.042, bright: true },
  { pos: [-0.54, 0.16, -0.22], rot: [Math.PI / 2 - 0.16, -0.1, 0.8], radius: 0.044, bright: false },
  { pos: [0.0, 0.325, -0.04], rot: [Math.PI / 2 - 0.08, 0.2, 1.5], radius: 0.04, bright: true },
  { pos: [-0.14, 0.295, 0.14], rot: [Math.PI / 2 + 0.14, -0.12, 2.4], radius: 0.042, bright: false },
  { pos: [0.12, 0.26, 0.24], rot: [Math.PI / 2 - 0.12, 0.16, 0.2], radius: 0.04, bright: true },
  { pos: [0.42, 0.165, -0.44], rot: [Math.PI / 2 + 0.18, -0.08, 1.9], radius: 0.042, bright: false },
];

// Ground Sichuan peppercorn (huajiao) dusting specks across top tofu cubes
const PEPPERCORN_DUST: [number, number, number][] = [
  [-0.14, 0.312, 0.06], [-0.06, 0.318, 0.09], [-0.19, 0.305, -0.01],
  [-0.08, 0.314, -0.05], [-0.12, 0.316, 0.01], [0.15, 0.295, -0.01],
  [0.22, 0.288, -0.06], [0.12, 0.292, 0.04], [0.19, 0.29, 0.02],
  [-0.02, 0.278, -0.2], [-0.09, 0.274, -0.25], [0.03, 0.275, -0.26],
  [-0.3, 0.222, 0.18], [-0.38, 0.218, 0.24], [-0.28, 0.22, 0.27],
  [0.24, 0.212, 0.21], [0.31, 0.21, 0.26], [0.22, 0.214, 0.29],
  [0.3, 0.218, -0.2], [0.36, 0.215, -0.27], [-0.3, 0.226, -0.24],
  [-0.36, 0.222, -0.31], [0.06, 0.205, 0.34], [0.0, 0.202, 0.39],
];

export function MapoTofuModel({
  exploded,
  highlightedPart,
  onSelectPart,
}: FoodModelProps) {
  const handleSelect = (partId: string) => {
    onSelectPart(highlightedPart === partId ? null : partId);
  };

  // Shared cached 512x512 Sobel RGB procedural textures (NEVER dispose cached singletons)
  const slateTex = useMemo(() => getSlateTextures(), []);
  const tofuNormal = useMemo(() => getOrganicNormalMap(613, 16, 0.75), []);
  const pankoTex = useMemo(() => getPankoCrustTextures(), []);
  const scallionNormal = useMemo(() => getOrganicNormalMap(811, 14, 1.2), []);

  // Per-instance real PBR studio-reflecting chili oil + Food SSS materials (disposed on unmount)
  const sauceMat = useMemo(
    () =>
      createPbrBrothMaterial({
        baseColor: '#821208',
        oilColor: '#E63214',
        sheenColor: '#FFB070',
        isSpicy: true,
        opacity: 0.96,
      }),
    []
  );

  // Creamy subsurface-scattered silken tofu with chili-stained lower wetness gradient
  const tofuMat = useMemo(
    () =>
      applyFoodSSS(
        new THREE.MeshPhysicalMaterial({
          color: '#FFFFFF',
          vertexColors: true,
          normalMap: tofuNormal,
          normalScale: new THREE.Vector2(0.28, 0.28),
          roughness: 0.16,
          metalness: 0.0,
          clearcoat: 0.72,
          clearcoatRoughness: 0.1,
          sheen: 0.24,
          sheenColor: new THREE.Color('#FFF5E2'),
          emissive: new THREE.Color('#6A5038'),
          emissiveIntensity: 0,
        }),
        { color: '#FFF0D6', intensity: 0.55, power: 2.5, scale: 1.1 }
      ),
    [tofuNormal]
  );

  const scallionBrightMat = useMemo(
    () =>
      applyFoodSSS(
        new THREE.MeshPhysicalMaterial({
          color: '#74C655',
          normalMap: scallionNormal,
          normalScale: new THREE.Vector2(0.45, 0.45),
          roughness: 0.28,
          clearcoat: 0.48,
          emissive: new THREE.Color('#245C14'),
          emissiveIntensity: 0,
        }),
        { color: '#8AE058', intensity: 0.42, power: 2.3, scale: 1.1 }
      ),
    [scallionNormal]
  );

  const scallionDeepMat = useMemo(
    () =>
      applyFoodSSS(
        new THREE.MeshPhysicalMaterial({
          color: '#4CA638',
          normalMap: scallionNormal,
          normalScale: new THREE.Vector2(0.45, 0.45),
          roughness: 0.3,
          clearcoat: 0.44,
          emissive: new THREE.Color('#245C14'),
          emissiveIntensity: 0,
        }),
        { color: '#6EC848', intensity: 0.38, power: 2.4, scale: 1.1 }
      ),
    [scallionNormal]
  );

  // Hand-thrown dark charcoal/obsidian stoneware clay bowl LatheGeometry
  const bowlGeo = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.0, -0.47),
      new THREE.Vector2(0.56, -0.47),
      new THREE.Vector2(0.61, -0.51),
      new THREE.Vector2(0.7, -0.51),
      new THREE.Vector2(0.74, -0.44),
      new THREE.Vector2(0.95, -0.32),
      new THREE.Vector2(1.13, -0.14),
      new THREE.Vector2(1.24, 0.04),
      new THREE.Vector2(1.3, 0.2),
      new THREE.Vector2(1.31, 0.245),
      new THREE.Vector2(1.24, 0.25),
      new THREE.Vector2(1.19, 0.19),
      new THREE.Vector2(1.08, -0.02),
      new THREE.Vector2(0.92, -0.2),
      new THREE.Vector2(0.68, -0.34),
      new THREE.Vector2(0.0, -0.37),
    ];
    const geo = new THREE.LatheGeometry(pts, 60);
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Thick undulating crimson-mahogany doubanjiang chili oil sauce pool
  const sauceGeo = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.0, -0.34),
      new THREE.Vector2(0.66, -0.31),
      new THREE.Vector2(0.9, -0.18),
      new THREE.Vector2(1.06, -0.02),
      new THREE.Vector2(1.14, 0.075),
      new THREE.Vector2(0.84, 0.095),
      new THREE.Vector2(0.42, 0.115),
      new THREE.Vector2(0.0, 0.125),
    ];
    const geo = new THREE.LatheGeometry(pts, 56);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (y > 0.04) {
        const wave = Math.sin(x * 4.5 + z * 3.2) * 0.014 + Math.cos(x * 3.1 - z * 4.8) * 0.01;
        pos.setY(i, y + wave);
      }
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Plump, organically hand-cut silken tofu cube with chili-oil stained lower wetness gradient
  const tofuCubeGeo = useMemo(() => {
    const s = 0.125;
    const r = 0.032;
    const shape = new THREE.Shape();
    shape.moveTo(-s + r, -s);
    shape.lineTo(s - r, -s);
    shape.quadraticCurveTo(s, -s, s, -s + r);
    shape.lineTo(s, s - r);
    shape.quadraticCurveTo(s, s, s - r, s);
    shape.lineTo(-s + r, s);
    shape.quadraticCurveTo(-s, s, -s, s - r);
    shape.lineTo(-s, -s + r);
    shape.quadraticCurveTo(-s, -s, -s + r, -s);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.034,
      bevelSize: 0.028,
      bevelSegments: 4,
      curveSegments: 10,
    });
    geo.center();
    displaceGeometryOrganic(geo, {
      amplitude: 0.0065,
      frequency: 10.5,
      seed: 617,
      preserveSeam: true,
    });
    applyWetnessVertexColors(geo, {
      wetY: -0.045,
      bandHeight: 0.115,
      dryColor: '#FBF6EC',
      wetColor: '#B52B14',
    });
    return geo;
  }, []);

  useEffect(() => {
    return () => {
      bowlGeo.dispose();
      sauceGeo.dispose();
      tofuCubeGeo.dispose();
      sauceMat.dispose();
      tofuMat.dispose();
      scallionBrightMat.dispose();
      scallionDeepMat.dispose();
    };
  }, [
    bowlGeo,
    sauceGeo,
    tofuCubeGeo,
    sauceMat,
    tofuMat,
    scallionBrightMat,
    scallionDeepMat,
  ]);

  const isBowlHi = highlightedPart === 'bowl';
  const isSauceHi = highlightedPart === 'sauce';
  const isTofuHi = highlightedPart === 'tofu';
  const isPorkHi = highlightedPart === 'pork';
  const isScallionsHi = highlightedPart === 'scallions';

  useEffect(() => {
    tofuMat.emissiveIntensity = isTofuHi ? 0.2 : 0;
  }, [isTofuHi, tofuMat]);

  useEffect(() => {
    scallionBrightMat.emissiveIntensity = isScallionsHi ? 0.34 : 0;
    scallionDeepMat.emissiveIntensity = isScallionsHi ? 0.34 : 0;
  }, [isScallionsHi, scallionBrightMat, scallionDeepMat]);

  useFrame((state) => {
    updateBrothMaterial(sauceMat, state.clock.elapsedTime, isSauceHi);
  });

  return (
    <group>
      {/* Layer 1: Hand-Thrown Unglazed Dark Stoneware Clay Bowl */}
      <FoodLayer
        partId="bowl"
        label="Dark Clay Bowl"
        explodeY={-0.3}
        exploded={exploded}
        highlighted={isBowlHi}
        onSelect={handleSelect}
      >
        <group>
          <mesh geometry={bowlGeo} castShadow receiveShadow>
            <meshStandardMaterial
              color="#7A706A"
              map={slateTex.map}
              normalMap={slateTex.normalMap}
              normalScale={NORMAL_SCALE_BOWL}
              roughnessMap={slateTex.roughnessMap}
              roughness={0.94}
              metalness={0.05}
              emissive="#4A3022"
              emissiveIntensity={isBowlHi ? 0.3 : 0}
            />
          </mesh>

          <mesh position={[0, 0.246, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <torusGeometry args={[1.275, 0.034, 14, 64]} />
            <meshPhysicalMaterial
              color="#544033"
              normalMap={slateTex.normalMap}
              normalScale={NORMAL_SCALE_LIP}
              roughness={0.6}
              clearcoat={0.3}
              clearcoatRoughness={0.4}
              emissive="#6A3C24"
              emissiveIntensity={isBowlHi ? 0.32 : 0}
            />
          </mesh>

          <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.242, 0.014, 10, 56]} />
            <meshStandardMaterial
              color="#3A322E"
              normalMap={slateTex.normalMap}
              normalScale={NORMAL_SCALE_LIP}
              roughness={0.86}
              emissive="#4A3022"
              emissiveIntensity={isBowlHi ? 0.26 : 0}
            />
          </mesh>
        </group>
      </FoodLayer>

      {/* Layer 2: Real PBR Studio-Reflecting Doubanjiang Chili Oil + Meniscus */}
      <FoodLayer
        partId="sauce"
        label="Doubanjiang Chili Oil"
        explodeY={0.25}
        pinPosition={[-1.25, 0.3, 0.2]}
        exploded={exploded}
        highlighted={isSauceHi}
        onSelect={handleSelect}
      >
        <group>
          <mesh geometry={sauceGeo} material={sauceMat} receiveShadow />

          {/* Glistening crimson oil meniscus hugging the dark stoneware inner wall */}
          <mesh position={[0, 0.088, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1.4]}>
            <torusGeometry args={[1.132, 0.015, 12, 64]} />
            <meshPhysicalMaterial
              color="#CC2410"
              transparent
              opacity={0.86}
              roughness={0.04}
              clearcoat={1}
              clearcoatRoughness={0.03}
              emissive="#8F1406"
              emissiveIntensity={isSauceHi ? 0.36 : 0.08}
            />
          </mesh>

          {/* Tiny glistening red chili oil droplets clinging around the inner clay rim */}
          {EDGE_DROPLETS.map(([x, y, z, r], idx) => (
            <mesh
              key={`drop-${idx}`}
              position={[x, y, z]}
              scale={[1.0, 0.42, 1.0]}
              receiveShadow
            >
              <sphereGeometry args={[r, 12, 10]} />
              <meshPhysicalMaterial
                color="#D42814"
                roughness={0.05}
                clearcoat={1}
                clearcoatRoughness={0.03}
                emissive="#A81808"
                emissiveIntensity={isSauceHi ? 0.4 : 0.08}
              />
            </mesh>
          ))}
        </group>
      </FoodLayer>

      {/* Layer 3: Creamy Backlit SSS Silken Tofu Cubes with Chili-Stained Lower Wetness */}
      <FoodLayer
        partId="tofu"
        label="Silken Tofu Cubes"
        explodeY={0.75}
        pinPosition={[1.2, 0.45, 0.2]}
        exploded={exploded}
        highlighted={isTofuHi}
        onSelect={handleSelect}
      >
        <group>
          {TOFU_CUBES.map((cube, idx) => (
            <mesh
              key={`tofu-${idx}`}
              geometry={tofuCubeGeo}
              material={tofuMat}
              position={cube.pos}
              rotation={cube.rot}
              scale={cube.scale}
              castShadow
              receiveShadow
            />
          ))}

          {/* Glossy crimson glaze fillets peeking between the silken cubes */}
          {SAUCE_GLAZE_SPOTS.map(([x, y, z, r], idx) => (
            <mesh key={`glaze-${idx}`} position={[x, y, z]} scale={[1.2, 0.24, 1.0]} receiveShadow>
              <sphereGeometry args={[r, 12, 10]} />
              <meshPhysicalMaterial
                color="#A61D10"
                roughness={0.06}
                clearcoat={1}
                clearcoatRoughness={0.04}
                emissive="#8A1408"
                emissiveIntensity={isTofuHi ? 0.3 : 0.04}
              />
            </mesh>
          ))}
        </group>
      </FoodLayer>

      {/* Layer 4: High-Contrast Crispy Minced Pork & Glossy Fermented Black Beans */}
      <FoodLayer
        partId="pork"
        label="Crispy Minced Pork"
        explodeY={1.15}
        pinPosition={[-1.1, 0.65, -0.3]}
        exploded={exploded}
        highlighted={isPorkHi}
        onSelect={handleSelect}
      >
        <group>
          {PORK_CRUMBLES.map((crumble, idx) => (
            <mesh
              key={`pork-${idx}`}
              position={crumble.pos}
              rotation={crumble.rot}
              scale={crumble.scale}
              castShadow
              receiveShadow
            >
              <dodecahedronGeometry args={[1, 1]} />
              <meshPhysicalMaterial
                color={crumble.dark ? '#442014' : '#5D2E1B'}
                normalMap={pankoTex.normalMap}
                normalScale={NORMAL_SCALE_PORK}
                roughnessMap={pankoTex.roughnessMap}
                roughness={0.78}
                clearcoat={0.62}
                clearcoatRoughness={0.14}
                emissive="#6E2810"
                emissiveIntensity={isPorkHi ? 0.36 : 0}
              />
            </mesh>
          ))}

          {DOUCHI_BEANS.map(([x, y, z, rotY], idx) => (
            <mesh
              key={`douchi-${idx}`}
              position={[x, y, z]}
              rotation={[0.2, rotY, 0.15]}
              scale={[0.036, 0.022, 0.024]}
              castShadow
              receiveShadow
            >
              <sphereGeometry args={[1, 10, 10]} />
              <meshPhysicalMaterial
                color="#191311"
                roughness={0.12}
                clearcoat={0.96}
                clearcoatRoughness={0.06}
                emissive="#4A2A1E"
                emissiveIntensity={isPorkHi ? 0.4 : 0}
              />
            </mesh>
          ))}
        </group>
      </FoodLayer>

      {/* Layer 5: Freshly Chopped Backlit SSS Scallions & Ground Sichuan Peppercorn */}
      <FoodLayer
        partId="scallions"
        label="Chopped Green Scallions"
        explodeY={1.55}
        pinPosition={[1.1, 0.8, -0.25]}
        exploded={exploded}
        highlighted={isScallionsHi}
        onSelect={handleSelect}
      >
        <group>
          {SCALLION_RINGS.map((ring, idx) => (
            <mesh
              key={`sc-${idx}`}
              position={ring.pos}
              rotation={ring.rot}
              material={ring.bright ? scallionBrightMat : scallionDeepMat}
              castShadow
              receiveShadow
            >
              <torusGeometry args={[ring.radius, 0.015, 10, 20]} />
            </mesh>
          ))}

          {PEPPERCORN_DUST.map((pos, idx) => (
            <mesh key={`dust-${idx}`} position={pos} castShadow>
              <dodecahedronGeometry args={[0.011, 0]} />
              <meshStandardMaterial
                color={idx % 2 === 0 ? '#5C341E' : '#3E2012'}
                roughness={0.74}
                emissive="#6A3418"
                emissiveIntensity={isScallionsHi ? 0.36 : 0}
              />
            </mesh>
          ))}
        </group>
      </FoodLayer>
    </group>
  );
}

export default MapoTofuModel;

'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FoodModelProps } from '@/types/dish';
import {
  createBrothShaderMaterial,
  getOrganicNoiseBump,
  getStonewareTextures,
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
  [0.78, 0.129, 0.28, 0.052],
  [-0.74, 0.129, 0.42, 0.044],
  [0.44, 0.129, -0.68, 0.048],
  [-0.12, 0.129, 0.78, 0.042],
  [0.86, 0.129, -0.14, 0.038],
  [-0.68, 0.129, -0.52, 0.046],
  [0.08, 0.129, -0.78, 0.04],
  [-0.86, 0.129, 0.04, 0.044],
];

const PHO_BROTH_BASE_COLOR = new THREE.Color('#7B3E10');
const PHO_BROTH_HI_COLOR = new THREE.Color('#A85B1B');

export function PhoModel({
  exploded,
  highlightedPart,
  onSelectPart,
}: FoodModelProps) {
  const brothGroupRef = useRef<THREE.Group>(null);
  const floatGarnishRef = useRef<THREE.Group>(null);
  const starAniseRef = useRef<THREE.Group>(null);

  const handleSelect = (partId: string) => {
    onSelectPart(highlightedPart === partId ? null : partId);
  };

  // Shared cached procedural PBR textures (do NOT dispose cached singletons)
  const stonewareTex = useMemo(() => getStonewareTextures(), []);
  const beefBump = useMemo(() => getOrganicNoiseBump(409, 12), []);
  const noodleBump = useMemo(() => getOrganicNoiseBump(307, 14), []);
  const garnishBump = useMemo(() => getOrganicNoiseBump(433, 12), []);

  // Per-instance animated GLSL broth shader (disposed cleanly on unmount)
  const brothShaderMat = useMemo(
    () =>
      createBrothShaderMaterial({
        baseColor: '#7B3E10',
        oilColor: '#D99A2E',
        sheenColor: '#FFF0C4',
        isSpicy: false,
        opacity: 0.86,
      }),
    []
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

  // Rich translucent amber beef broth body matching the bowl interior
  const brothGeo = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.0, -0.4),
      new THREE.Vector2(0.44, -0.39),
      new THREE.Vector2(0.72, -0.31),
      new THREE.Vector2(0.94, -0.16),
      new THREE.Vector2(1.1, 0.02),
      new THREE.Vector2(1.17, 0.12),
      new THREE.Vector2(0.0, 0.12),
    ];
    const geo = new THREE.LatheGeometry(pts, 56);
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Organic coiled flat rice noodles (multiple sinuous TubeGeometry ribbons)
  const noodleGeos = useMemo(() => {
    const curves: THREE.CatmullRomCurve3[] = [
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.78, 0.02, 0.24),
        new THREE.Vector3(-0.35, 0.16, 0.52),
        new THREE.Vector3(0.24, 0.14, 0.44),
        new THREE.Vector3(0.68, 0.12, 0.12),
        new THREE.Vector3(0.56, 0.08, -0.36),
        new THREE.Vector3(0.05, 0.15, -0.48),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.62, 0.06, -0.42),
        new THREE.Vector3(-0.18, 0.17, -0.26),
        new THREE.Vector3(0.32, 0.16, -0.14),
        new THREE.Vector3(0.74, 0.09, 0.22),
        new THREE.Vector3(0.34, 0.13, 0.64),
        new THREE.Vector3(-0.22, 0.07, 0.56),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.84, 0.04, -0.06),
        new THREE.Vector3(-0.42, 0.15, 0.18),
        new THREE.Vector3(0.08, 0.18, 0.22),
        new THREE.Vector3(0.48, 0.14, -0.04),
        new THREE.Vector3(0.32, 0.11, -0.58),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.82, 0.05, -0.18),
        new THREE.Vector3(0.44, 0.16, -0.34),
        new THREE.Vector3(-0.08, 0.14, -0.52),
        new THREE.Vector3(-0.56, 0.12, -0.22),
        new THREE.Vector3(-0.48, 0.14, 0.34),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.3, 0.08, 0.72),
        new THREE.Vector3(0.18, 0.17, 0.34),
        new THREE.Vector3(0.54, 0.16, 0.04),
        new THREE.Vector3(0.18, 0.15, -0.24),
        new THREE.Vector3(-0.34, 0.12, -0.04),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.62, 0.04, 0.44),
        new THREE.Vector3(0.14, 0.16, 0.58),
        new THREE.Vector3(-0.38, 0.15, 0.44),
        new THREE.Vector3(-0.72, 0.09, 0.08),
        new THREE.Vector3(-0.42, 0.06, -0.46),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.14, 0.04, -0.74),
        new THREE.Vector3(0.28, 0.15, -0.44),
        new THREE.Vector3(0.68, 0.12, -0.04),
        new THREE.Vector3(0.42, 0.15, 0.38),
        new THREE.Vector3(-0.08, 0.12, 0.28),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.06, 0.13, -0.06),
        new THREE.Vector3(0.36, 0.19, 0.16),
        new THREE.Vector3(0.04, 0.18, 0.44),
        new THREE.Vector3(-0.36, 0.14, 0.16),
        new THREE.Vector3(-0.12, 0.16, -0.24),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.76, 0.06, 0.02),
        new THREE.Vector3(0.52, 0.15, 0.42),
        new THREE.Vector3(0.02, 0.14, 0.68),
        new THREE.Vector3(-0.54, 0.09, 0.48),
      ]),
    ];

    return curves.map((curve, idx) => {
      const geo = new THREE.TubeGeometry(curve, 44, idx % 2 === 0 ? 0.044 : 0.038, 10, false);
      geo.scale(1, 0.42, 1);
      geo.computeVertexNormals();
      return geo;
    });
  }, []);

  // Soft wavy thin-sliced rare beef geometry (outer seared rim + tender rosy center)
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
      curveSegments: 18,
    });
    outer.rotateX(-Math.PI / 2);
    const oPos = outer.attributes.position;
    for (let i = 0; i < oPos.count; i++) {
      const x = oPos.getX(i);
      const y = oPos.getY(i);
      const z = oPos.getZ(i);
      oPos.setY(i, y + Math.sin(x * 7.5 + z * 3.0) * 0.032);
    }
    outer.computeVertexNormals();

    const inner = new THREE.ExtrudeGeometry(innerShape, {
      depth: 0.032,
      bevelEnabled: true,
      bevelThickness: 0.008,
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
      iPos.setY(i, y + Math.sin(x * 7.5 + z * 3.0) * 0.032 + 0.004);
    }
    inner.computeVertexNormals();

    return { beefOuterGeo: outer, beefCenterGeo: inner };
  }, []);

  // Sculpted Thai basil / cilantro leaf geometry
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
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Vibrant lime wedge geometry (rind + pith + translucent juicy chartreuse flesh)
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
      brothShaderMat.dispose();
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
    brothShaderMat,
  ]);

  const isBowlHi = highlightedPart === 'bowl';
  const isBrothHi = highlightedPart === 'broth';
  const isNoodlesHi = highlightedPart === 'noodles';
  const isBeefHi = highlightedPart === 'beef';
  const isGarnishHi = highlightedPart === 'garnish';

  useEffect(() => {
    brothShaderMat.uniforms.uBaseColor.value.copy(
      isBrothHi ? PHO_BROTH_HI_COLOR : PHO_BROTH_BASE_COLOR
    );
  }, [isBrothHi, brothShaderMat]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    brothShaderMat.uniforms.uTime.value = t;

    if (brothGroupRef.current) {
      brothGroupRef.current.position.y = Math.sin(t * 1.4) * 0.004;
    }
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
          {/* Matte artisanal indigo/charcoal stoneware exterior */}
          <mesh geometry={outerBowlGeo} castShadow receiveShadow>
            <meshPhysicalMaterial
              color="#2B303A"
              bumpMap={stonewareTex.bumpMap}
              bumpScale={0.024}
              roughnessMap={stonewareTex.roughnessMap}
              roughness={0.82}
              metalness={0.04}
              clearcoat={0.2}
              clearcoatRoughness={0.5}
              emissive="#3A4259"
              emissiveIntensity={isBowlHi ? 0.32 : 0}
            />
          </mesh>

          {/* Glossy warm celadon-ivory stoneware glazed interior */}
          <mesh geometry={innerBowlGeo} receiveShadow>
            <meshPhysicalMaterial
              color="#F2EFE7"
              map={stonewareTex.map}
              bumpMap={stonewareTex.bumpMap}
              bumpScale={0.009}
              roughness={0.18}
              clearcoat={0.72}
              clearcoatRoughness={0.16}
              emissive="#5A452C"
              emissiveIntensity={isBowlHi ? 0.22 : 0}
            />
          </mesh>

          {/* Matte hand-thrown terracotta rim accent */}
          <mesh position={[0, 0.268, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[1.318, 0.032, 16, 72]} />
            <meshStandardMaterial
              color="#B55A38"
              bumpMap={stonewareTex.bumpMap}
              bumpScale={0.02}
              roughnessMap={stonewareTex.roughnessMap}
              roughness={0.72}
              emissive="#7A2D12"
              emissiveIntensity={isBowlHi ? 0.32 : 0}
            />
          </mesh>

          {/* Decorative exterior stoneware groove band */}
          <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.255, 0.012, 10, 64]} />
            <meshStandardMaterial
              color="#39404D"
              bumpMap={stonewareTex.bumpMap}
              bumpScale={0.016}
              roughness={0.72}
              emissive="#3A4259"
              emissiveIntensity={isBowlHi ? 0.28 : 0}
            />
          </mesh>
        </group>
      </FoodLayer>

      {/* Layer 2: Animated GLSL Charred-Spice Amber Beef Broth */}
      <FoodLayer
        partId="broth"
        label="Charred-Spice Beef Broth"
        explodeY={0.25}
        pinPosition={[-1.25, 0.35, 0.2]}
        exploded={exploded}
        highlighted={isBrothHi}
        onSelect={handleSelect}
      >
        <group ref={brothGroupRef}>
          <mesh geometry={brothGeo} material={brothShaderMat} receiveShadow />

          {/* Physical golden bone-marrow oil pearls catching specular light above the shader */}
          {OIL_DROPLETS.map(([x, y, z, r], idx) => (
            <mesh key={`oil-${idx}`} position={[x, y, z]} scale={[1, 0.14, 1]}>
              <sphereGeometry args={[r, 12, 10]} />
              <meshPhysicalMaterial
                color="#D99A2E"
                transparent
                opacity={0.72}
                roughness={0.05}
                clearcoat={1}
                clearcoatRoughness={0.04}
                emissive="#8A5208"
                emissiveIntensity={isBrothHi ? 0.3 : 0}
              />
            </mesh>
          ))}
        </group>
      </FoodLayer>

      {/* Layer 3: Organic Coiled Nest of Silky Flat Rice Noodles */}
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
              castShadow
              receiveShadow
            >
              <meshPhysicalMaterial
                color={idx % 3 === 0 ? '#FFFBF2' : '#FBF6EC'}
                bumpMap={noodleBump}
                bumpScale={0.006}
                roughness={0.22}
                clearcoat={0.62}
                clearcoatRoughness={0.14}
                emissive="#6B5636"
                emissiveIntensity={isNoodlesHi ? 0.24 : 0}
              />
            </mesh>
          ))}
        </group>
      </FoodLayer>

      {/* Layer 4: Rare Thin-Sliced Beef with Organic Meat Fiber Bump & Moist Sheen */}
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
              {/* Seared rosy-brown beef edge with fibrous organic bump */}
              <mesh geometry={beefOuterGeo} castShadow receiveShadow>
                <meshPhysicalMaterial
                  color="#883631"
                  bumpMap={beefBump}
                  bumpScale={0.03}
                  roughness={0.34}
                  clearcoat={0.48}
                  clearcoatRoughness={0.2}
                  emissive="#6E1E1A"
                  emissiveIntensity={isBeefHi ? 0.32 : 0}
                />
              </mesh>
              {/* Moist tender rare rosy center */}
              <mesh geometry={beefCenterGeo} castShadow>
                <meshPhysicalMaterial
                  color="#B8564E"
                  bumpMap={beefBump}
                  bumpScale={0.022}
                  roughness={0.26}
                  clearcoat={0.62}
                  clearcoatRoughness={0.16}
                  sheen={0.28}
                  sheenColor="#E69B94"
                  emissive="#7A241E"
                  emissiveIntensity={isBeefHi ? 0.32 : 0}
                />
              </mesh>
            </group>
          ))}

          {/* Thin sweet white onion rings nestled beside the beef */}
          {[
            { pos: [-0.22, 0.16, 0.34] as [number, number, number], rot: [Math.PI / 2 - 0.12, 0.1, 0.2] as [number, number, number], r: 0.14 },
            { pos: [-0.62, 0.155, -0.36] as [number, number, number], rot: [Math.PI / 2 + 0.1, -0.1, 0.5] as [number, number, number], r: 0.12 },
          ].map((onion, idx) => (
            <mesh key={`onion-${idx}`} position={onion.pos} rotation={onion.rot}>
              <torusGeometry args={[onion.r, 0.014, 10, 32]} />
              <meshPhysicalMaterial
                color="#F4EDE2"
                transparent
                opacity={0.86}
                roughness={0.18}
                clearcoat={0.65}
                emissive="#5A4A36"
                emissiveIntensity={isBeefHi ? 0.22 : 0}
              />
            </mesh>
          ))}
        </group>
      </FoodLayer>

      {/* Layer 5: Scallions, 8-Pointed Star Anise, Chilies, Herbs & Translucent Lime Wedge */}
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
          {/* Floating herbs, scallions & chili rings */}
          <group ref={floatGarnishRef}>
            {SCALLION_RINGS.map((ring, idx) => (
              <mesh
                key={`scallion-${idx}`}
                position={ring.pos}
                rotation={ring.rot}
                castShadow
              >
                <torusGeometry args={[ring.radius, 0.015, 10, 20]} />
                <meshPhysicalMaterial
                  color={ring.light ? '#84BA5A' : '#4D8B31'}
                  bumpMap={garnishBump}
                  bumpScale={0.008}
                  roughness={0.32}
                  clearcoat={0.44}
                  emissive="#204A10"
                  emissiveIntensity={isGarnishHi ? 0.34 : 0}
                />
              </mesh>
            ))}

            {/* Sliced red bird's-eye chili rings with seed centers */}
            {CHILI_RINGS.map((chili, idx) => (
              <group
                key={`chili-${idx}`}
                position={chili.pos}
                rotation={chili.rot}
                scale={chili.scale}
              >
                <mesh castShadow>
                  <torusGeometry args={[0.042, 0.014, 10, 18]} />
                  <meshPhysicalMaterial
                    color="#D4261C"
                    roughness={0.18}
                    clearcoat={0.82}
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

            {/* Fresh Thai basil / cilantro leaves */}
            {HERB_LEAVES.map((leaf, idx) => (
              <mesh
                key={`leaf-${idx}`}
                geometry={leafGeo}
                position={leaf.pos}
                rotation={leaf.rot}
                scale={leaf.scale}
                castShadow
              >
                <meshPhysicalMaterial
                  color={idx % 2 === 0 ? '#3B7A28' : '#4E9436'}
                  bumpMap={garnishBump}
                  bumpScale={0.014}
                  roughness={0.38}
                  clearcoat={0.34}
                  emissive="#1C4612"
                  emissiveIntensity={isGarnishHi ? 0.34 : 0}
                />
              </mesh>
            ))}
          </group>

          {/* Sculptural 8-pointed dark brown star anise pod */}
          <group ref={starAniseRef} position={[0.16, 0.165, -0.02]}>
            <mesh castShadow>
              <sphereGeometry args={[0.048, 14, 12]} />
              <meshStandardMaterial
                color="#4E2A14"
                bumpMap={garnishBump}
                bumpScale={0.022}
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
                  >
                    <coneGeometry args={[0.042, 0.15, 8]} />
                    <meshStandardMaterial
                      color="#4E2A14"
                      bumpMap={garnishBump}
                      bumpScale={0.022}
                      roughness={0.6}
                      emissive="#4A1F0A"
                      emissiveIntensity={isGarnishHi ? 0.38 : 0}
                    />
                  </mesh>
                  {/* Glossy mahogany seed pearl peeking from the carpel */}
                  <mesh position={[0.075, 0.022, 0]} scale={[1.2, 0.7, 0.8]}>
                    <sphereGeometry args={[0.015, 8, 8]} />
                    <meshPhysicalMaterial
                      color="#753E1E"
                      roughness={0.18}
                      clearcoat={0.85}
                      emissive="#5A280A"
                      emissiveIntensity={isGarnishHi ? 0.36 : 0}
                    />
                  </mesh>
                </group>
              );
            })}
          </group>

          {/* Vibrant green lime wedge with translucent juicy citrus flesh */}
          <group position={[1.18, 0.34, -0.22]} rotation={[0.35, -0.35, -0.65]}>
            <mesh geometry={limeRindGeo} castShadow receiveShadow>
              <meshPhysicalMaterial
                color="#67A42B"
                bumpMap={garnishBump}
                bumpScale={0.022}
                roughness={0.46}
                clearcoat={0.4}
                clearcoatRoughness={0.3}
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
            <mesh geometry={limeFleshGeo}>
              <meshPhysicalMaterial
                color="#C6E462"
                bumpMap={garnishBump}
                bumpScale={0.012}
                transmission={0.22}
                thickness={0.25}
                ior={1.35}
                attenuationColor="#A9CF38"
                attenuationDistance={0.5}
                roughness={0.12}
                clearcoat={0.88}
                clearcoatRoughness={0.08}
                emissive="#4C6410"
                emissiveIntensity={isGarnishHi ? 0.32 : 0}
              />
            </mesh>
            {/* Radial citrus segment membrane lines */}
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

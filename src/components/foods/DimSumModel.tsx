'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FoodModelProps } from '@/types/dish';
import {
  applyFoodSSS,
  applyWetnessVertexColors,
  displaceGeometryOrganic,
  getBambooWeaveTextures,
  getOrganicNormalMap,
  getStonewareTextures,
} from '@/lib/proceduralTextures';
import { FoodLayer } from './FoodLayer';

const STEAMER_CENTER: [number, number, number] = [-0.26, 0, -0.06];
const STEAMER_BASE_Y = -0.45;
const STEAMER_FLOOR_Y = -0.11;
const DISH_POS: [number, number, number] = [1.22, -0.45, 0.44];

/** Creates a darker braided rattan binding texture. */
function createRattanTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#A87B43';
  ctx.fillRect(0, 0, 256, 128);

  for (let x = -128; x < 384; x += 14) {
    ctx.strokeStyle = 'rgba(84, 54, 22, 0.45)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 96, 128);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(218, 178, 120, 0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 5, 0);
    ctx.lineTo(x + 101, 128);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 1);
  return tex;
}

/** Creates a hollow bamboo steamer wall ring using LatheGeometry. */
function createSteamerWallGeometry(
  innerR: number,
  outerR: number,
  height: number
): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(innerR, 0),
    new THREE.Vector2(outerR, 0),
    new THREE.Vector2(outerR, height - 0.015),
    new THREE.Vector2(outerR - 0.014, height),
    new THREE.Vector2(innerR + 0.014, height),
    new THREE.Vector2(innerR, height - 0.015),
    new THREE.Vector2(innerR, 0),
  ];
  return new THREE.LatheGeometry(pts, 48);
}

/** Creates a gently crinkled perforated round steamer parchment liner with real punched steam holes. */
function createPerforatedParchmentGeometry(radius: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const segs = 48;
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const r = radius * (1 + Math.sin(a * 14) * 0.012);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const holeSpecs: [number, number, number][] = [[0, 0, 0.042]];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    holeSpecs.push([Math.cos(a) * 0.34, Math.sin(a) * 0.34, 0.038]);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.15;
    holeSpecs.push([Math.cos(a) * 0.7, Math.sin(a) * 0.7, 0.036]);
  }

  for (const [hx, hy, hr] of holeSpecs) {
    const hole = new THREE.Path();
    hole.absarc(hx, hy, hr, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.008,
    bevelEnabled: false,
    curveSegments: 16,
  });
  geo.rotateX(-Math.PI / 2);

  return displaceGeometryOrganic(geo, {
    amplitude: 0.0045,
    frequency: 4.5,
    seed: 701,
    flattenBottomY: -0.001,
    preserveSeam: true,
  });
}

/**
 * Creates a plump 18-pleat Xiaolongbao soup dumpling BufferGeometry
 * with spiral-converging pleat ridges, pinched twisted topknot,
 * organic soup-heavy belly sag (`displaceGeometryOrganic`), and
 * warm translucent soup-to-porcelain vertical vertex color gradient (`applyWetnessVertexColors`).
 */
function createXiaolongbaoGeometry(seed: number): THREE.BufferGeometry {
  const radialSegs = 72;
  const heightSegs = 34;
  const pleats = 18;

  const profile: [number, number, number][] = [
    [0.0, 0.001, 0.0],
    [0.08, 0.165, 0.002],
    [0.16, 0.262, 0.022],
    [0.26, 0.318, 0.07],
    [0.36, 0.326, 0.122],
    [0.48, 0.296, 0.176],
    [0.62, 0.232, 0.23],
    [0.74, 0.152, 0.276],
    [0.83, 0.082, 0.308],
    [0.9, 0.09, 0.34],
    [0.96, 0.056, 0.352],
    [1.0, 0.001, 0.332],
  ];

  const sampleProfile = (v: number): [number, number] => {
    for (let i = 0; i < profile.length - 1; i++) {
      const [v0, r0, y0] = profile[i];
      const [v1, r1, y1] = profile[i + 1];
      if (v >= v0 && v <= v1) {
        const t = (v - v0) / (v1 - v0);
        const s = t * t * (3 - 2 * t);
        return [r0 + (r1 - r0) * s, y0 + (y1 - y0) * s];
      }
    }
    const last = profile[profile.length - 1];
    return [last[1], last[2]];
  };

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= heightSegs; iy++) {
    const v = iy / heightSegs;
    const [rBase, yBase] = sampleProfile(v);

    const pleatOnset = THREE.MathUtils.smoothstep(v, 0.26, 0.56);
    const pleatFade = 1 - THREE.MathUtils.smoothstep(v, 0.88, 0.99);
    const pleatAmp = 0.0158 * pleatOnset * pleatFade;
    const twist = Math.pow(Math.max(0, v - 0.24), 1.38) * 1.15;

    for (let ix = 0; ix <= radialSegs; ix++) {
      const u = ix / radialSegs;
      const theta = u * Math.PI * 2;

      const phase = pleats * (theta + twist);
      const pleatWave = Math.sin(phase) + Math.sin(phase * 2 - 0.45) * 0.24;
      const knotFlute = v > 0.84 && v < 0.97 ? Math.sin(phase) * 0.007 : 0;

      const r = Math.max(0.0005, rBase + pleatWave * pleatAmp);
      const y = yBase + knotFlute + pleatWave * pleatAmp * 0.32;

      positions.push(Math.cos(theta) * r, y, Math.sin(theta) * r);
      uvs.push(u, v);
    }
  }

  const row = radialSegs + 1;
  for (let iy = 0; iy < heightSegs; iy++) {
    for (let ix = 0; ix < radialSegs; ix++) {
      const a = iy * row + ix;
      const b = (iy + 1) * row + ix;
      const c = (iy + 1) * row + ix + 1;
      const d = iy * row + ix + 1;
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  // Unique subtle heavy-soup organic belly sag per dumpling while keeping bottom flat & pleats intact
  displaceGeometryOrganic(geo, {
    amplitude: 0.0095,
    frequency: 4.2,
    seed,
    flattenBottomY: 0,
    preserveSeam: true,
  });

  // Rich translucent amber-ivory soup-heavy lower belly fading cleanly to porcelain-ivory topknot
  applyWetnessVertexColors(geo, {
    wetY: 0.03,
    bandHeight: 0.21,
    wetColor: '#E6CEAA',
    dryColor: '#FAF4E8',
  });

  return geo;
}

/** Creates a classic Chinese flared porcelain dipping saucer LatheGeometry. */
function createDippingSaucerGeometry(): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 0.012),
    new THREE.Vector2(0.21, 0.012),
    new THREE.Vector2(0.22, 0.0),
    new THREE.Vector2(0.25, 0.0),
    new THREE.Vector2(0.265, 0.022),
    new THREE.Vector2(0.36, 0.075),
    new THREE.Vector2(0.435, 0.145),
    new THREE.Vector2(0.445, 0.16),
    new THREE.Vector2(0.428, 0.166),
    new THREE.Vector2(0.405, 0.148),
    new THREE.Vector2(0.325, 0.082),
    new THREE.Vector2(0.22, 0.044),
    new THREE.Vector2(0.0, 0.04),
  ];
  return new THREE.LatheGeometry(pts, 40);
}

/** Creates a delicate slightly curved julienned ginger matchstick geometry. */
function createGingerStripGeometry(): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.075, 0, -0.008),
    new THREE.Vector3(-0.02, 0.002, 0.006),
    new THREE.Vector3(0.035, 0.001, -0.004),
    new THREE.Vector3(0.078, 0, 0.007),
  ]);
  return new THREE.TubeGeometry(curve, 10, 0.0075, 6, false);
}

const DUMPLING_RING = Array.from({ length: 5 }, (_, i) => {
  const angle = (i / 5) * Math.PI * 2 + 0.35;
  const dist = 0.52;
  return {
    x: STEAMER_CENTER[0] + Math.cos(angle) * dist,
    z: STEAMER_CENTER[2] + Math.sin(angle) * dist,
    rotY: angle + i * 0.7,
    phase: i * 1.25,
    scale: 0.96 + (i % 3) * 0.035,
  };
});

const FLOOR_SLAT_ZS = [-0.74, -0.52, -0.3, -0.08, 0.14, 0.36, 0.58, 0.78];

const GINGER_STRIPS = Array.from({ length: 18 }, (_, i) => {
  const r = 0.03 + ((i * 0.6180339) % 1) * 0.22;
  const a = i * 2.39996;
  return {
    x: Math.cos(a) * r,
    z: Math.sin(a) * r,
    rotY: (i * 0.93) % Math.PI,
    scale: 0.78 + (i % 4) * 0.14,
  };
});

export function DimSumModel({ exploded, highlightedPart, onSelectPart }: FoodModelProps) {
  const dumplingRefs = useRef<(THREE.Group | null)[]>([]);
  const gingerGroupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < DUMPLING_RING.length; i++) {
      const grp = dumplingRefs.current[i];
      if (!grp) continue;
      const spec = DUMPLING_RING[i];
      const breath = Math.sin(t * 2.0 + spec.phase) * 0.018;
      grp.scale.set(
        spec.scale * (1 - breath * 0.45),
        spec.scale * (1 + breath),
        spec.scale * (1 - breath * 0.45)
      );
    }

    if (gingerGroupRef.current) {
      gingerGroupRef.current.rotation.y = Math.sin(t * 0.45) * 0.05;
    }
  });

  const assets = useMemo(() => {
    // Shared cached 512x512 procedural PBR & Sobel normal maps (DO NOT dispose these!)
    const bambooPbr = getBambooWeaveTextures();
    const stonewarePbr = getStonewareTextures();
    const parchmentNormal = getOrganicNormalMap(109, 14, 1.5);
    const doughNormal = getOrganicNormalMap(127, 20, 1.3);
    const gingerNormal = getOrganicNormalMap(139, 16, 1.8);

    // Local per-component rattan weave albedo (disposed on unmount)
    const rattanTex = createRattanTexture();

    const lowerWallGeo = createSteamerWallGeometry(0.96, 1.07, 0.33);
    const upperWallGeo = createSteamerWallGeometry(1.01, 1.12, 0.38);

    const lowerRimBandGeo = new THREE.TorusGeometry(1.072, 0.022, 12, 48);
    lowerRimBandGeo.rotateX(Math.PI / 2);

    const upperRimBandGeo = new THREE.TorusGeometry(1.122, 0.025, 12, 48);
    upperRimBandGeo.rotateX(Math.PI / 2);

    const slatGeos = FLOOR_SLAT_ZS.map((z) => {
      const halfSpan = Math.sqrt(Math.max(0.08, 0.99 * 0.99 - z * z));
      return new THREE.BoxGeometry(halfSpan * 1.96, 0.026, 0.125);
    });

    const parchmentGeo = createPerforatedParchmentGeometry(0.96);
    const lashingGeo = new THREE.BoxGeometry(0.032, 0.085, 0.022);

    // 5 individually sagged 18-pleat Xiaolongbao dumpling geometries
    const dumplingGeos = DUMPLING_RING.map((_, i) => createXiaolongbaoGeometry(613 + i * 29));

    const saucerGeo = createDippingSaucerGeometry();
    const cobaltOuterRimGeo = new THREE.TorusGeometry(0.436, 0.01, 10, 40);
    cobaltOuterRimGeo.rotateX(Math.PI / 2);
    const cobaltInnerRingGeo = new THREE.TorusGeometry(0.37, 0.007, 8, 36);
    cobaltInnerRingGeo.rotateX(Math.PI / 2);

    const vinegarGeo = new THREE.CircleGeometry(0.352, 36);
    vinegarGeo.rotateX(-Math.PI / 2);
    const gingerStripGeo = createGingerStripGeometry();

    // v3 Look-Dev PBR Materials with 512x512 RGB Normal Maps & Backlit Amber SSS
    const bambooMat = new THREE.MeshStandardMaterial({
      color: '#F6E4C2',
      map: bambooPbr.map,
      normalMap: bambooPbr.normalMap,
      normalScale: new THREE.Vector2(1.0, 1.0),
      roughnessMap: bambooPbr.roughnessMap,
      roughness: 0.9,
      metalness: 0.0,
    });

    const bambooLowerMat = new THREE.MeshStandardMaterial({
      color: '#E7CEA0',
      map: bambooPbr.map,
      normalMap: bambooPbr.normalMap,
      normalScale: new THREE.Vector2(0.95, 0.95),
      roughnessMap: bambooPbr.roughnessMap,
      roughness: 0.92,
      metalness: 0.0,
    });

    const bambooSlatMat = new THREE.MeshStandardMaterial({
      color: '#DFC391',
      map: bambooPbr.map,
      normalMap: bambooPbr.normalMap,
      normalScale: new THREE.Vector2(0.9, 0.9),
      roughnessMap: bambooPbr.roughnessMap,
      roughness: 0.9,
      metalness: 0.0,
    });

    const rattanMat = new THREE.MeshStandardMaterial({
      color: '#B5854A',
      map: rattanTex,
      normalMap: bambooPbr.normalMap,
      normalScale: new THREE.Vector2(1.1, 1.1),
      roughness: 0.86,
      metalness: 0.0,
    });

    // Opaque backlit steam-dampened steamer parchment liner (uses real punched steam holes, zero transparent sorting)
    const parchmentMat = applyFoodSSS(
      new THREE.MeshPhysicalMaterial({
        color: '#FAF4E8',
        normalMap: parchmentNormal,
        normalScale: new THREE.Vector2(0.5, 0.5),
        roughness: 0.54,
        metalness: 0.0,
        clearcoat: 0.22,
        clearcoatRoughness: 0.36,
        side: THREE.DoubleSide,
      }),
      { color: '#FFF5E2', intensity: 0.26, power: 2.6 }
    );

    // Authentic soup-filled Xiaolongbao skin: backlit warm amber SSS + vertex soup-belly gradient
    const dumplingMat = applyFoodSSS(
      new THREE.MeshPhysicalMaterial({
        color: '#FFFFFF',
        vertexColors: true,
        normalMap: doughNormal,
        normalScale: new THREE.Vector2(0.45, 0.45),
        roughness: 0.28,
        metalness: 0.0,
        clearcoat: 0.34,
        clearcoatRoughness: 0.28,
        sheen: 0.55,
        sheenColor: new THREE.Color('#FFE8C6'),
        sheenRoughness: 0.45,
      }),
      { color: '#F2B86B', intensity: 0.62, power: 2.3, scale: 1.15 }
    );

    // Artisanal glazed porcelain saucer with Sobel stoneware normal relief
    const porcelainMat = new THREE.MeshPhysicalMaterial({
      color: '#FDFBF7',
      map: stonewarePbr.map,
      normalMap: stonewarePbr.normalMap,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughnessMap: stonewarePbr.roughnessMap,
      roughness: 0.2,
      metalness: 0.0,
      clearcoat: 0.94,
      clearcoatRoughness: 0.05,
    });

    const cobaltMat = new THREE.MeshPhysicalMaterial({
      color: '#254C8C',
      roughness: 0.14,
      clearcoat: 0.88,
    });

    // Mirror-glossy aged Zhenjiang black vinegar catching crisp studio softbox reflections
    const vinegarMat = new THREE.MeshPhysicalMaterial({
      color: '#1C0B06',
      roughness: 0.03,
      metalness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      ior: 1.36,
      reflectivity: 1.0,
    });

    // Backlit pale-gold julienned fresh young ginger strips
    const gingerStripMat = applyFoodSSS(
      new THREE.MeshPhysicalMaterial({
        color: '#E8C97A',
        normalMap: gingerNormal,
        normalScale: new THREE.Vector2(0.5, 0.5),
        roughness: 0.3,
        clearcoat: 0.45,
        clearcoatRoughness: 0.2,
      }),
      { color: '#FFE49E', intensity: 0.52, power: 2.2, scale: 1.15 }
    );

    return {
      localTextures: [rattanTex],
      geometries: {
        lowerWallGeo,
        upperWallGeo,
        lowerRimBandGeo,
        upperRimBandGeo,
        slatGeos,
        parchmentGeo,
        lashingGeo,
        dumplingGeos,
        saucerGeo,
        cobaltOuterRimGeo,
        cobaltInnerRingGeo,
        vinegarGeo,
        gingerStripGeo,
      },
      materials: {
        bambooMat,
        bambooLowerMat,
        bambooSlatMat,
        rattanMat,
        parchmentMat,
        dumplingMat,
        porcelainMat,
        cobaltMat,
        vinegarMat,
        gingerStripMat,
      },
    };
  }, []);

  useEffect(() => {
    return () => {
      assets.localTextures.forEach((t) => t?.dispose());
      const g = assets.geometries;
      g.lowerWallGeo.dispose();
      g.upperWallGeo.dispose();
      g.lowerRimBandGeo.dispose();
      g.upperRimBandGeo.dispose();
      g.slatGeos.forEach((sg) => sg.dispose());
      g.parchmentGeo.dispose();
      g.lashingGeo.dispose();
      g.dumplingGeos.forEach((dg) => dg.dispose());
      g.saucerGeo.dispose();
      g.cobaltOuterRimGeo.dispose();
      g.cobaltInnerRingGeo.dispose();
      g.vinegarGeo.dispose();
      g.gingerStripGeo.dispose();
      Object.values(assets.materials).forEach((m) => m.dispose());
    };
  }, [assets]);

  return (
    <group position={[0, 0, 0]}>
      {/* 1. TWO-TIER WOVEN BAMBOO STEAMER BASKET */}
      <FoodLayer
        partId="steamer"
        label="Bamboo Steamer Basket"
        explodeY={-0.25}
        pinPosition={[-1.5, 0.25, 0.3]}
        exploded={exploded}
        highlighted={highlightedPart === 'steamer'}
        onSelect={onSelectPart}
      >
        <group position={STEAMER_CENTER}>
          <mesh
            geometry={assets.geometries.lowerWallGeo}
            material={assets.materials.bambooLowerMat}
            position={[0, STEAMER_BASE_Y, 0]}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={assets.geometries.lowerRimBandGeo}
            material={assets.materials.rattanMat}
            position={[0, STEAMER_BASE_Y + 0.04, 0]}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={assets.geometries.lowerRimBandGeo}
            material={assets.materials.rattanMat}
            position={[0, STEAMER_BASE_Y + 0.28, 0]}
            castShadow
            receiveShadow
          />

          <mesh
            geometry={assets.geometries.upperWallGeo}
            material={assets.materials.bambooMat}
            position={[0, STEAMER_BASE_Y + 0.31, 0]}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={assets.geometries.upperRimBandGeo}
            material={assets.materials.rattanMat}
            position={[0, STEAMER_BASE_Y + 0.36, 0]}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={assets.geometries.upperRimBandGeo}
            material={assets.materials.rattanMat}
            position={[0, STEAMER_BASE_Y + 0.65, 0]}
            castShadow
            receiveShadow
          />

          {[-0.08, 0, 0.08].map((offsetAngle, idx) => {
            const a = Math.PI * 0.78 + offsetAngle;
            return (
              <mesh
                key={idx}
                geometry={assets.geometries.lashingGeo}
                material={assets.materials.rattanMat}
                position={[Math.cos(a) * 1.125, STEAMER_BASE_Y + 0.5, Math.sin(a) * 1.125]}
                rotation={[0, -a + Math.PI / 2, 0]}
                castShadow
                receiveShadow
              />
            );
          })}

          {FLOOR_SLAT_ZS.map((z, idx) => (
            <mesh
              key={idx}
              geometry={assets.geometries.slatGeos[idx]}
              material={assets.materials.bambooSlatMat}
              position={[0, STEAMER_FLOOR_Y - 0.022, z]}
              castShadow
              receiveShadow
            />
          ))}

          <mesh
            geometry={assets.geometries.parchmentGeo}
            material={assets.materials.parchmentMat}
            position={[0, STEAMER_FLOOR_Y - 0.004, 0]}
            receiveShadow
          />
        </group>
      </FoodLayer>

      {/* 2. 18-PLEAT SOUP DUMPLINGS (5 plump Xiaolongbao with backlit amber SSS + organic belly sag) */}
      <FoodLayer
        partId="dumplings"
        label="18-Pleat Soup Dumplings"
        explodeY={0.75}
        pinPosition={[0.0, 0.95, 0.4]}
        exploded={exploded}
        highlighted={highlightedPart === 'dumplings'}
        onSelect={onSelectPart}
      >
        {DUMPLING_RING.map((d, i) => (
          <group
            key={i}
            ref={(el) => {
              dumplingRefs.current[i] = el;
            }}
            position={[d.x, STEAMER_FLOOR_Y + 0.011, d.z]}
            rotation={[0, d.rotY, 0]}
            scale={d.scale}
          >
            <mesh
              geometry={assets.geometries.dumplingGeos[i]}
              material={assets.materials.dumplingMat}
              castShadow
              receiveShadow
            />
          </group>
        ))}
      </FoodLayer>

      {/* 3. BLACK VINEGAR & GINGER DIP SAUCER */}
      <FoodLayer
        partId="dipping-dish"
        label="Black Vinegar & Ginger Dip"
        explodeY={0.45}
        explodeOffset={[0.45, 0.45, 0.25]}
        pinPosition={[1.65, 0.3, 0.55]}
        exploded={exploded}
        highlighted={highlightedPart === 'dipping-dish'}
        onSelect={onSelectPart}
      >
        <group position={DISH_POS}>
          <mesh
            geometry={assets.geometries.saucerGeo}
            material={assets.materials.porcelainMat}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={assets.geometries.cobaltOuterRimGeo}
            material={assets.materials.cobaltMat}
            position={[0, 0.162, 0]}
            castShadow
          />
          <mesh
            geometry={assets.geometries.cobaltInnerRingGeo}
            material={assets.materials.cobaltMat}
            position={[0, 0.12, 0]}
          />

          <mesh
            geometry={assets.geometries.vinegarGeo}
            material={assets.materials.vinegarMat}
            position={[0, 0.102, 0]}
            receiveShadow
          />

          <group ref={gingerGroupRef} position={[0, 0.107, 0]}>
            {GINGER_STRIPS.map((strip, idx) => (
              <mesh
                key={idx}
                geometry={assets.geometries.gingerStripGeo}
                material={assets.materials.gingerStripMat}
                position={[strip.x, (idx % 3) * 0.0022, strip.z]}
                rotation={[0, strip.rotY, 0]}
                scale={strip.scale}
                castShadow
                receiveShadow
              />
            ))}
          </group>
        </group>
      </FoodLayer>
    </group>
  );
}

export default DimSumModel;

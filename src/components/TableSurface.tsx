'use client';

import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import type { TableSurfaceType } from '@/types/dish';
import {
  getBambooWeaveTextures,
  getLinenTextures,
  getSlateTextures,
  getWoodGrainTextures,
} from '@/lib/proceduralTextures';

export interface TableSurfaceProps {
  surface: TableSurfaceType;
}

const noopRaycast = (): void => {};

const LINEN_NORMAL_SCALE = new THREE.Vector2(0.55, 0.55);
const CEDAR_NORMAL_SCALE = new THREE.Vector2(0.62, 0.62);
const HINOKI_NORMAL_SCALE = new THREE.Vector2(0.45, 0.45);
const WALNUT_NORMAL_SCALE = new THREE.Vector2(0.5, 0.5);
const SLATE_NORMAL_SCALE = new THREE.Vector2(0.78, 0.78);
const BAMBOO_NORMAL_SCALE = new THREE.Vector2(0.82, 0.82);
const RATTAN_NORMAL_SCALE = new THREE.Vector2(0.65, 0.65);

/** Builds a rounded rectangle THREE.Shape centered at (0, 0). */
function createRoundedRectShape(width: number, depth: number, radius: number): THREE.Shape {
  const w = width / 2;
  const d = depth / 2;
  const r = Math.min(radius, w, d);

  const shape = new THREE.Shape();
  shape.moveTo(-w + r, -d);
  shape.lineTo(w - r, -d);
  shape.quadraticCurveTo(w, -d, w, -d + r);
  shape.lineTo(w, d - r);
  shape.quadraticCurveTo(w, d, w - r, d);
  shape.lineTo(-w + r, d);
  shape.quadraticCurveTo(-w, d, -w, d - r);
  shape.lineTo(-w, -d + r);
  shape.quadraticCurveTo(-w, -d, -w + r, -d);
  return shape;
}

/** Builds a beveled circular pizza peel shape with a sculpted tapered handle. */
function createPizzaPeelShape(): THREE.Shape {
  const shape = new THREE.Shape();
  const radius = 2.02;
  const neckAngle = 0.21;

  shape.absarc(0, 0, radius, neckAngle, Math.PI * 2 - neckAngle, false);

  shape.quadraticCurveTo(radius + 0.22, -0.34, radius + 0.45, -0.24);
  shape.lineTo(radius + 1.25, -0.19);
  shape.quadraticCurveTo(radius + 1.48, -0.17, radius + 1.48, 0);
  shape.quadraticCurveTo(radius + 1.48, 0.17, radius + 1.25, 0.19);
  shape.lineTo(radius + 0.45, 0.24);
  shape.quadraticCurveTo(
    radius + 0.22,
    0.34,
    Math.cos(neckAngle) * radius,
    Math.sin(neckAngle) * radius
  );

  return shape;
}

/** Normalizes ExtrudeGeometry UVs into clean world-proportional [0..1] tiling. */
function normalizePlanarUVs(geometry: THREE.BufferGeometry, uvScale = 0.28): void {
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  if (!pos || !uv) return;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) * uvScale + 0.5, pos.getY(i) * uvScale + 0.5);
  }
  uv.needsUpdate = true;
}

export function TableSurface({ surface }: TableSurfaceProps) {
  // Cached singleton 512x512 PBR textures (never disposed by this component)
  const linen = useMemo(() => getLinenTextures(), []);
  const cedar = useMemo(() => getWoodGrainTextures('cedar'), []);
  const hinoki = useMemo(() => getWoodGrainTextures('hinoki'), []);
  const walnut = useMemo(() => getWoodGrainTextures('walnut'), []);
  const slate = useMemo(() => getSlateTextures(), []);
  const bamboo = useMemo(() => getBambooWeaveTextures(), []);

  // Per-variant beveled geometries, disposed cleanly on unmount
  const geometries = useMemo(() => {
    const linenGeo = new THREE.ExtrudeGeometry(createRoundedRectShape(4.65, 3.55, 0.28), {
      depth: 0.022,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.022,
      bevelSegments: 3,
      curveSegments: 20,
    });
    normalizePlanarUVs(linenGeo, 0.24);
    linenGeo.rotateX(-Math.PI / 2);

    const peelGeo = new THREE.ExtrudeGeometry(createPizzaPeelShape(), {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.016,
      bevelSize: 0.025,
      bevelSegments: 4,
      curveSegments: 48,
    });
    normalizePlanarUVs(peelGeo, 0.24);
    peelGeo.rotateX(-Math.PI / 2);

    const hinokiGeo = new THREE.ExtrudeGeometry(createRoundedRectShape(4.85, 3.3, 0.14), {
      depth: 0.048,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.02,
      bevelSegments: 3,
      curveSegments: 16,
    });
    normalizePlanarUVs(hinokiGeo, 0.22);
    hinokiGeo.rotateX(-Math.PI / 2);

    const slateGeo = new THREE.ExtrudeGeometry(createRoundedRectShape(4.35, 3.65, 0.42), {
      depth: 0.046,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.032,
      bevelSegments: 2,
      curveSegments: 24,
    });
    normalizePlanarUVs(slateGeo, 0.24);
    slateGeo.rotateX(-Math.PI / 2);

    return { linenGeo, peelGeo, hinokiGeo, slateGeo };
  }, []);

  useEffect(() => {
    return () => {
      geometries.linenGeo.dispose();
      geometries.peelGeo.dispose();
      geometries.hinokiGeo.dispose();
      geometries.slateGeo.dispose();
    };
  }, [geometries]);

  // Top face of every surface rests cleanly around y = -0.54
  switch (surface) {
    case 'ceramic-linen':
      return (
        <group position={[0, -0.574, 0]}>
          {/* Soft woven linen editorial placemat */}
          <mesh geometry={geometries.linenGeo} receiveShadow raycast={noopRaycast}>
            <meshStandardMaterial
              map={linen.map}
              normalMap={linen.normalMap}
              normalScale={LINEN_NORMAL_SCALE}
              roughnessMap={linen.roughnessMap}
              roughness={0.92}
              metalness={0.0}
              color="#F5EFE4"
            />
          </mesh>
          {/* Subtle woven inset hem border */}
          <mesh
            position={[0, 0.037, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            raycast={noopRaycast}
          >
            <ringGeometry args={[1.42, 1.45, 64]} />
            <meshStandardMaterial
              color="#D4C3AE"
              roughness={0.9}
              transparent
              opacity={0.48}
              polygonOffset
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
            />
          </mesh>
        </group>
      );

    case 'wood-peel':
      return (
        <group position={[0, -0.601, 0]} rotation={[0, -0.58, 0]}>
          {/* Artisanal beveled cedar wood pizza peel */}
          <mesh geometry={geometries.peelGeo} receiveShadow raycast={noopRaycast}>
            <meshStandardMaterial
              map={cedar.map}
              normalMap={cedar.normalMap}
              normalScale={CEDAR_NORMAL_SCALE}
              roughnessMap={cedar.roughnessMap}
              roughness={0.76}
              metalness={0.02}
              color="#E7C9A4"
            />
          </mesh>
          {/* Hanging leather/hole eyelet accent near peel handle end */}
          <mesh
            position={[3.18, 0.064, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            raycast={noopRaycast}
          >
            <circleGeometry args={[0.075, 20]} />
            <meshStandardMaterial
              color="#5E3C24"
              roughness={0.85}
              polygonOffset
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
            />
          </mesh>
        </group>
      );

    case 'hinoki-cedar':
      return (
        <group position={[0, -0.602, 0]}>
          {/* Pale Japanese hinoki cypress counter tray */}
          <mesh geometry={geometries.hinokiGeo} receiveShadow raycast={noopRaycast}>
            <meshStandardMaterial
              map={hinoki.map}
              normalMap={hinoki.normalMap}
              normalScale={HINOKI_NORMAL_SCALE}
              roughnessMap={hinoki.roughnessMap}
              roughness={0.62}
              metalness={0.02}
              color="#F4E3C8"
            />
          </mesh>
          {/* Subtle dark walnut trim strips framing the counter mat */}
          <mesh position={[-2.14, 0.056, 0]} receiveShadow raycast={noopRaycast}>
            <boxGeometry args={[0.065, 0.018, 3.06]} />
            <meshStandardMaterial
              map={walnut.map}
              normalMap={walnut.normalMap}
              normalScale={WALNUT_NORMAL_SCALE}
              roughnessMap={walnut.roughnessMap}
              roughness={0.65}
              color="#7C563C"
            />
          </mesh>
          <mesh position={[2.14, 0.056, 0]} receiveShadow raycast={noopRaycast}>
            <boxGeometry args={[0.065, 0.018, 3.06]} />
            <meshStandardMaterial
              map={walnut.map}
              normalMap={walnut.normalMap}
              normalScale={WALNUT_NORMAL_SCALE}
              roughnessMap={walnut.roughnessMap}
              roughness={0.65}
              color="#7C563C"
            />
          </mesh>
        </group>
      );

    case 'dark-slate':
      return (
        <group position={[0, -0.6, 0]}>
          {/* Natural chamfered dark slate charger slab */}
          <mesh geometry={geometries.slateGeo} receiveShadow raycast={noopRaycast}>
            <meshStandardMaterial
              map={slate.map}
              normalMap={slate.normalMap}
              normalScale={SLATE_NORMAL_SCALE}
              roughnessMap={slate.roughnessMap}
              roughness={0.84}
              metalness={0.08}
              color="#43403E"
            />
          </mesh>
          {/* Hairline brushed warm-brass trivet inlay ring */}
          <mesh
            position={[0, 0.063, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            raycast={noopRaycast}
          >
            <ringGeometry args={[1.48, 1.505, 64]} />
            <meshStandardMaterial
              color="#B8894A"
              roughness={0.36}
              metalness={0.78}
              polygonOffset
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
            />
          </mesh>
        </group>
      );

    case 'woven-bamboo':
      return (
        <group position={[0, -0.57, 0]}>
          {/* Round woven bamboo trivet mat */}
          <mesh receiveShadow raycast={noopRaycast}>
            <cylinderGeometry args={[2.05, 2.09, 0.06, 56]} />
            <meshStandardMaterial
              map={bamboo.map}
              normalMap={bamboo.normalMap}
              normalScale={BAMBOO_NORMAL_SCALE}
              roughnessMap={bamboo.roughnessMap}
              roughness={0.78}
              metalness={0.02}
              color="#E7CBA0"
            />
          </mesh>
          {/* Darker woven rattan perimeter binding ring */}
          <mesh
            position={[0, 0.01, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            receiveShadow
            raycast={noopRaycast}
          >
            <torusGeometry args={[2.06, 0.042, 12, 64]} />
            <meshStandardMaterial
              map={bamboo.map}
              normalMap={bamboo.normalMap}
              normalScale={RATTAN_NORMAL_SCALE}
              roughness={0.72}
              color="#9E703E"
            />
          </mesh>
        </group>
      );

    default:
      return null;
  }
}

export default TableSurface;

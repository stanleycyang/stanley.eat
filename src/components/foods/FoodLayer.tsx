'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Html, useCursor } from '@react-three/drei';
import * as THREE from 'three';

export interface FoodLayerProps {
  partId: string;
  label: string;
  explodeY: number;
  explodeOffset?: [number, number, number];
  pinPosition?: [number, number, number];
  exploded: boolean;
  highlighted: boolean;
  onSelect: (partId: string) => void;
  children: React.ReactNode;
}

const DEFAULT_PIN_POSITION: [number, number, number] = [1.35, 0.25, 0];

export function FoodLayer({
  partId,
  label,
  explodeY,
  explodeOffset,
  pinPosition,
  exploded,
  highlighted,
  onSelect,
  children,
}: FoodLayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const contentRef = useRef<THREE.Group>(null);
  const highlightGroupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const baseRadiusRef = useRef(0.75);

  const [hovered, setHovered] = useState(false);

  useCursor(hovered);

  // Reusable scratch objects to keep highlight measurement allocation-free
  const boxScratch = useMemo(() => new THREE.Box3(), []);
  const centerScratch = useMemo(() => new THREE.Vector3(), []);
  const sizeScratch = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (!highlighted || !contentRef.current) return;

    contentRef.current.updateWorldMatrix(true, true);
    boxScratch.setFromObject(contentRef.current);

    if (!boxScratch.isEmpty()) {
      boxScratch.getCenter(centerScratch);
      boxScratch.getSize(sizeScratch);

      // Convert world-space center back into groupRef's local space
      if (groupRef.current) {
        groupRef.current.worldToLocal(centerScratch);
      }

      const horizontalRadius = Math.max(
        0.38,
        Math.min(1.65, Math.max(sizeScratch.x, sizeScratch.z) * 0.56)
      );

      baseRadiusRef.current = horizontalRadius;
      if (highlightGroupRef.current) {
        highlightGroupRef.current.position.set(
          centerScratch.x,
          Math.max(-0.35, centerScratch.y - sizeScratch.y * 0.32),
          centerScratch.z
        );
      }
      if (ringRef.current) {
        ringRef.current.scale.set(horizontalRadius, horizontalRadius, 1);
      }
    }
  }, [highlighted, boxScratch, centerScratch, sizeScratch]);

  const resolvedPinPosition = pinPosition ?? DEFAULT_PIN_POSITION;

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const dt = Math.min(delta, 0.05);
    const lerpFactor = 1 - Math.exp(-8.5 * dt);

    const targetX = exploded ? (explodeOffset ? explodeOffset[0] : 0) : 0;
    const baseTargetY = exploded ? (explodeOffset ? explodeOffset[1] : explodeY) : 0;
    const targetY = baseTargetY + (highlighted ? 0.06 : 0);
    const targetZ = exploded ? (explodeOffset ? explodeOffset[2] : 0) : 0;

    group.position.x = THREE.MathUtils.lerp(group.position.x, targetX, lerpFactor);
    group.position.y = THREE.MathUtils.lerp(group.position.y, targetY, lerpFactor);
    group.position.z = THREE.MathUtils.lerp(group.position.z, targetZ, lerpFactor);

    const elapsed = state.clock.elapsedTime;
    const targetScale = highlighted
      ? 1 + Math.sin(elapsed * 5.5) * 0.035
      : hovered
        ? 1.015
        : 1;

    const nextScale = THREE.MathUtils.lerp(group.scale.x, targetScale, lerpFactor);
    group.scale.setScalar(nextScale);

    if (highlighted && ringRef.current && ringMatRef.current) {
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 5.5);
      const ringScale = baseRadiusRef.current * (1 + pulse * 0.04);
      ringRef.current.scale.set(ringScale, ringScale, 1);
      ringMatRef.current.opacity = 0.34 + pulse * 0.24;
    }

    if (highlighted && lightRef.current) {
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 5.5);
      lightRef.current.intensity = 0.65 + pulse * 0.35;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(partId);
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
  };

  const showPin = exploded || highlighted;

  return (
    <group
      ref={groupRef}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <group ref={contentRef}>{children}</group>

      {highlighted && (
        <group ref={highlightGroupRef} position={[0, 0.05, 0]}>
          {/* Subtle warm chili-red halo ring framing the active layer */}
          <mesh
            ref={ringRef}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[0.75, 0.75, 1]}
            renderOrder={5}
          >
            <ringGeometry args={[0.92, 1, 48]} />
            <meshBasicMaterial
              ref={ringMatRef}
              color="#C8341B"
              transparent
              opacity={0.44}
              side={THREE.DoubleSide}
              depthWrite={false}
              toneMapped
            />
          </mesh>

          {/* Warm localized glow light accentuating the highlighted layer (kept below bloom threshold) */}
          <pointLight
            ref={lightRef}
            color="#FF8A65"
            intensity={0.8}
            distance={2.5}
            decay={2}
            position={[0, 0.42, 0.25]}
          />
        </group>
      )}

      {showPin && (
        <Html
          position={resolvedPinPosition}
          center
          occlude={false}
          zIndexRange={[20, 0]}
          style={{ pointerEvents: 'auto' }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(partId);
            }}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            aria-label={`Select ${label}`}
            className={[
              'group flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1',
              'text-[11px] font-medium tracking-[0.01em] transition-all duration-200 select-none cursor-pointer',
              'backdrop-blur-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]/60',
              highlighted
                ? 'scale-105 border-[#B92D17] bg-[#D9381E] text-[#FAF7F2] shadow-[0_6px_18px_rgba(217,56,30,0.34)]'
                : 'border-[#E6DDD0] bg-[#FAF7F2]/95 text-[#1C1917] shadow-[0_4px_14px_rgba(28,25,23,0.12)] hover:border-[#D9381E]/55 hover:bg-[#FFFDF9]',
            ].join(' ')}
          >
            <span
              className={[
                'h-2 w-2 shrink-0 rounded-full transition-transform duration-200',
                highlighted
                  ? 'bg-[#FAF7F2] shadow-[0_0_6px_rgba(250,247,242,0.85)]'
                  : 'bg-[#D9381E] group-hover:scale-110',
              ].join(' ')}
            />
            <span>{label}</span>
          </button>
        </Html>
      )}
    </group>
  );
}

export default FoodLayer;

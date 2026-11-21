'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface SteamParticlesProps {
  active: boolean;
  baseY?: number;
  spread?: number;
  exploded?: boolean;
}

interface SteamSeed {
  phase: number;
  speed: number;
  radius: number;
  angle: number;
  swayFreqX: number;
  swayFreqZ: number;
  swayAmp: number;
  baseScale: number;
  elongation: number;
  rotSpeed: number;
  maxHeight: number;
}

const PARTICLE_COUNT = 28;

// Deterministic PRNG so SSR/hydration and renders stay consistent
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const noopRaycast = (): void => {};

export function SteamParticles({
  active,
  baseY = 0.25,
  spread = 0.65,
  exploded = false,
}: SteamParticlesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const smoothExplodeRef = useRef(exploded ? 1 : 0);

  // Single reusable dummy object — zero per-frame allocations
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const seeds = useMemo<SteamSeed[]>(() => {
    const rand = mulberry32(202605);
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      phase: i / PARTICLE_COUNT + rand() * 0.08,
      speed: 0.16 + rand() * 0.11,
      radius: Math.sqrt(rand()) * 0.95,
      angle: rand() * Math.PI * 2,
      swayFreqX: 0.7 + rand() * 0.7,
      swayFreqZ: 0.65 + rand() * 0.75,
      swayAmp: 0.08 + rand() * 0.12,
      baseScale: 0.65 + rand() * 0.65,
      elongation: 1.15 + rand() * 0.45,
      rotSpeed: (rand() - 0.5) * 0.45,
      maxHeight: 1.45 + rand() * 0.65,
    }));
  }, []);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh || !active) return;

    const dt = Math.min(delta, 0.05);
    const lerpFactor = 1 - Math.exp(-5 * dt);
    smoothExplodeRef.current = THREE.MathUtils.lerp(
      smoothExplodeRef.current,
      exploded ? 1 : 0,
      lerpFactor
    );

    const t = state.clock.elapsedTime;
    const explodeFactor = smoothExplodeRef.current;
    const currentBaseY = baseY + explodeFactor * 0.55;
    const currentSpread = spread * (1 + explodeFactor * 0.28);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const s = seeds[i];
      const progress = (t * s.speed + s.phase) % 1;

      // Soft bell-curve life envelope: eases in from base, puffs out, dissolves at top
      const fadeIn = Math.min(1, progress / 0.18);
      const fadeOut = Math.max(0, 1 - Math.max(0, (progress - 0.55) / 0.45));
      const envelope = fadeIn * fadeOut * fadeOut;

      // Gradually widens as steam rises
      const radialDrift = s.radius * currentSpread * (0.55 + progress * 0.85);
      const swayX = Math.sin(t * s.swayFreqX + s.angle) * s.swayAmp * (0.4 + progress);
      const swayZ = Math.cos(t * s.swayFreqZ + s.angle * 1.3) * s.swayAmp * (0.4 + progress);

      const x = Math.cos(s.angle) * radialDrift + swayX;
      const y = currentBaseY + progress * s.maxHeight;
      const z = Math.sin(s.angle) * radialDrift + swayZ;

      const growth = 0.45 + progress * 1.05;
      const scaleXZ = s.baseScale * growth * envelope;
      const scaleY = scaleXZ * s.elongation;

      dummy.position.set(x, y, z);
      dummy.rotation.set(
        progress * 0.5,
        s.angle + t * s.rotSpeed,
        Math.sin(t * 0.6 + i) * 0.25
      );
      dummy.scale.set(scaleXZ, scaleY, scaleXZ);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, PARTICLE_COUNT]}
      frustumCulled={false}
      raycast={noopRaycast}
      renderOrder={4}
    >
      <sphereGeometry args={[0.13, 12, 10]} />
      <meshBasicMaterial
        color="#FFFDF8"
        transparent
        opacity={0.16}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

export default SteamParticles;

'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface SteamParticlesProps {
  active: boolean;
  baseY?: number;
  spread?: number;
  exploded?: boolean;
}

interface SteamWispSeed {
  phase: number;
  speed: number;
  radius: number;
  angle: number;
  swayFreqX: number;
  swayFreqZ: number;
  swayAmp: number;
  baseWidth: number;
  baseHeight: number;
  rotSpeed: number;
  maxHeight: number;
  shaderSeed: number;
}

const WISP_COUNT = 22;

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const noopRaycast = (): void => {};

const STEAM_VERTEX_SHADER = /* glsl */ `
  attribute float aSeed;
  attribute float aProgress;

  varying vec2 vUv;
  varying float vSeed;
  varying float vProgress;

  void main() {
    vUv = uv;
    vSeed = aSeed;
    vProgress = aProgress;

    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const STEAM_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;

  varying vec2 vUv;
  varying float vSeed;
  varying float vProgress;

  float hash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = rot * p * 2.02;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // Centered quad coords [-1, 1]
    vec2 p = vUv * 2.0 - 1.0;
    float dist = length(p);
    if (dist >= 1.0) discard;

    // Soft radial + vertical plume envelope so quad borders are completely invisible
    float radialMask = pow(1.0 - smoothstep(0.08, 0.96, dist), 1.45);
    float vertMask = smoothstep(0.0, 0.24, vUv.y) * (1.0 - smoothstep(0.70, 1.0, vUv.y));

    // Organic curl-like FBM domain warp scrolling upward with time
    vec2 q = vec2(p.x * 1.45, p.y * 1.15 - uTime * 0.28 + vSeed * 11.3);
    vec2 curl = vec2(
      fbm(q + vec2(vSeed * 3.7, -uTime * 0.16)) - 0.5,
      fbm(q + vec2(-vSeed * 2.9 + 5.2, uTime * 0.14)) - 0.5
    );
    float wisps = fbm(q * 1.65 + curl * 1.75);
    float filaments = smoothstep(0.28, 0.78, wisps);

    // Life-cycle fade: gentle emerge at dish surface, airy dissolve aloft
    float fadeIn = smoothstep(0.0, 0.18, vProgress);
    float fadeOut = 1.0 - smoothstep(0.42, 1.0, vProgress);
    float lifeAlpha = fadeIn * fadeOut * fadeOut;

    float alpha = radialMask * vertMask * filaments * lifeAlpha * 0.26;
    if (alpha < 0.004) discard;

    // Subtle warm studio back-left rim luminance across the rising wisp
    float studioRim = smoothstep(-0.6, 0.7, -p.x * 0.45 + p.y * 0.55 + (wisps - 0.5) * 0.5);
    vec3 steamColor = mix(vec3(0.95, 0.92, 0.88), vec3(1.0, 0.98, 0.94), studioRim);

    gl_FragColor = vec4(steamColor, alpha);
  }
`;

export function SteamParticles({
  active,
  baseY = 0.25,
  spread = 0.65,
  exploded = false,
}: SteamParticlesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const smoothExplodeRef = useRef(exploded ? 1 : 0);

  // Reusable scratch objects — zero per-frame allocations
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const rollQuat = useMemo(() => new THREE.Quaternion(), []);
  const zAxis = useMemo(() => new THREE.Vector3(0, 0, 1), []);

  const seeds = useMemo<SteamWispSeed[]>(() => {
    const rand = mulberry32(202605);
    return Array.from({ length: WISP_COUNT }, (_, i) => ({
      phase: i / WISP_COUNT + rand() * 0.06,
      speed: 0.14 + rand() * 0.09,
      radius: Math.sqrt(rand()) * 0.88,
      angle: rand() * Math.PI * 2,
      swayFreqX: 0.55 + rand() * 0.65,
      swayFreqZ: 0.5 + rand() * 0.65,
      swayAmp: 0.09 + rand() * 0.12,
      baseWidth: 0.58 + rand() * 0.42,
      baseHeight: 0.82 + rand() * 0.56,
      rotSpeed: (rand() - 0.5) * 0.24,
      maxHeight: 1.55 + rand() * 0.65,
      shaderSeed: rand() * 10,
    }));
  }, []);

  const { geometry, material, progressAttr } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1, 1);

    const seedArray = new Float32Array(WISP_COUNT);
    const progArray = new Float32Array(WISP_COUNT);
    for (let i = 0; i < WISP_COUNT; i++) {
      seedArray[i] = seeds[i].shaderSeed;
      progArray[i] = seeds[i].phase % 1;
    }

    const sAttr = new THREE.InstancedBufferAttribute(seedArray, 1);
    const pAttr = new THREE.InstancedBufferAttribute(progArray, 1);
    pAttr.setUsage(THREE.DynamicDrawUsage);

    geo.setAttribute('aSeed', sAttr);
    geo.setAttribute('aProgress', pAttr);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: STEAM_VERTEX_SHADER,
      fragmentShader: STEAM_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    });

    return { geometry: geo, material: mat, progressAttr: pAttr };
  }, [seeds]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

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
    material.uniforms.uTime.value = t;

    const explodeFactor = smoothExplodeRef.current;
    const currentBaseY = baseY + explodeFactor * 0.55;
    const currentSpread = spread * (1 + explodeFactor * 0.28);
    const progArr = progressAttr.array as Float32Array;

    for (let i = 0; i < WISP_COUNT; i++) {
      const s = seeds[i];
      const progress = (t * s.speed + s.phase) % 1;
      progArr[i] = progress;

      const radialDrift = s.radius * currentSpread * (0.48 + progress * 0.85);
      const swayX = Math.sin(t * s.swayFreqX + s.angle) * s.swayAmp * (0.35 + progress);
      const swayZ = Math.cos(t * s.swayFreqZ + s.angle * 1.3) * s.swayAmp * (0.35 + progress);

      const x = Math.cos(s.angle) * radialDrift + swayX;
      const y = currentBaseY + progress * s.maxHeight;
      const z = Math.sin(s.angle) * radialDrift + swayZ;

      const growth = 0.58 + progress * 0.95;
      const w = s.baseWidth * growth;
      const h = s.baseHeight * (0.65 + progress * 0.8);

      dummy.position.set(x, y, z);
      // Camera-facing billboard with gentle organic Z-roll
      dummy.quaternion.copy(state.camera.quaternion);
      rollQuat.setFromAxisAngle(zAxis, Math.sin(t * 0.4 + s.shaderSeed) * 0.22 + progress * s.rotSpeed);
      dummy.quaternion.multiply(rollQuat);
      dummy.scale.set(w, h, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    progressAttr.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, WISP_COUNT]}
      frustumCulled={false}
      raycast={noopRaycast}
      renderOrder={6}
    />
  );
}

export default SteamParticles;

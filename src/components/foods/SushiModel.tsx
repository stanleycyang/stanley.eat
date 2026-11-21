'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FoodModelProps } from '@/types/dish';
import {
  getOrganicNoiseBump,
  getRiceGrainTextures,
  getWoodGrainTextures,
} from '@/lib/proceduralTextures';
import { FoodLayer } from './FoodLayer';

const BOARD_BASE_Y = -0.45;
const BOARD_TOP_Y = -0.18;

/** Creates rich coral-orange Atlantic salmon flesh with pale ivory fat marbling stripes. */
function createSalmonTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#EA6438');
  grad.addColorStop(0.5, '#F2774B');
  grad.addColorStop(1, '#E45E34');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Diagonal delicate pale-white fat marbling striations
  for (let i = -4; i < 14; i++) {
    const baseX = i * 44;
    ctx.strokeStyle = 'rgba(255, 240, 228, 0.78)';
    ctx.lineWidth = 4.2 + (i % 3) * 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let t = 0; t <= 20; t++) {
      const f = t / 20;
      const x = baseX + f * 78 + Math.sin(f * Math.PI * 1.5) * 14;
      const y = f * 256;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 214, 192, 0.36)';
    ctx.lineWidth = 10;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/** Creates deep ruby-red maguro tuna grain texture. */
function createTunaTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, 512, 256);
  grad.addColorStop(0, '#A51922');
  grad.addColorStop(0.5, '#BC232C');
  grad.addColorStop(1, '#98151E');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Subtle lean ruby muscle fibers
  for (let i = 0; i < 36; i++) {
    const y = (i / 36) * 256;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(126, 12, 22, 0.32)' : 'rgba(232, 82, 92, 0.18)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 512; x += 64) {
      ctx.lineTo(x, y + Math.sin(x * 0.015 + i * 0.4) * 5);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Creates matte toasted nori seaweed texture. */
function createNoriTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#1B221B';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 480; i++) {
    const x = ((i * 0.7548) % 1) * 256;
    const y = ((i * 0.5698 + 0.07 * (i % 11)) % 1) * 256;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(46, 62, 42, 0.48)' : 'rgba(13, 17, 13, 0.52)';
    ctx.fillRect(x, y, 3 + (i % 4), 2 + (i % 3));
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Creates a soft blush-to-rose gradient texture for pickled gari ginger petals. */
function createGingerTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 128, 0, 0);
  grad.addColorStop(0, '#FDE7EC');
  grad.addColorStop(0.55, '#F5AAB9');
  grad.addColorStop(1, '#E67F9B');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 1.5;
  for (let x = 8; x < 128; x += 10) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.sin(x) * 3, 128);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Creates a chamfered hinoki geta top slab geometry. */
function createBoardSlabGeometry(): THREE.BufferGeometry {
  const w = 2.94;
  const d = 1.72;
  const r = 0.06;
  const hw = w / 2;
  const hd = d / 2;

  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hd);
  shape.lineTo(hw - r, -hd);
  shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
  shape.lineTo(hw, hd - r);
  shape.quadraticCurveTo(hw, hd, hw - r, hd);
  shape.lineTo(-hw + r, hd);
  shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
  shape.lineTo(-hw, -hd + r);
  shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 3,
  });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/** Creates a classic slightly tapered Japanese geta foot block. */
function createGetaFootGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.14, 0);
  shape.lineTo(0.14, 0);
  shape.lineTo(0.11, 0.155);
  shape.lineTo(-0.11, 0.155);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1.56,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.78);
  return geo;
}

/** Creates a plump hand-pressed shari sushi rice pillow resting at y = 0. */
function createRicePillowGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 24, 18);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    x *= 0.27;
    z *= 0.125;
    y = y < 0 ? y * 0.055 : y * 0.105;

    const squeeze = 1 - Math.abs(x) * 0.18;
    z *= squeeze;

    pos.setXYZ(i, x, y + 0.055, z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Creates a thick, curved draped fish fillet (neta) that hugs a nigiri rice pillow. */
function createDrapedFilletGeometry(
  length = 0.72,
  width = 0.285,
  thickness = 0.052
): THREE.BufferGeometry {
  const segX = 24;
  const segZ = 14;

  const topVerts: [number, number, number][] = [];
  const botVerts: [number, number, number][] = [];
  const uvs: number[] = [];

  for (let ix = 0; ix <= segX; ix++) {
    const u = ix / segX;
    const sx = u * 2 - 1;

    const widthTaper = 0.72 + 0.28 * Math.cos(sx * Math.PI * 0.46);
    const archY = 0.168 - sx * sx * 0.115 - Math.pow(Math.abs(sx), 3.4) * 0.025;
    const localThick = thickness * (0.58 + 0.42 * Math.cos(sx * Math.PI * 0.48));

    for (let iz = 0; iz <= segZ; iz++) {
      const v = iz / segZ;
      const sz = v * 2 - 1;

      const z = sz * (width * 0.5) * widthTaper;
      const sideDrape = sz * sz * 0.042;
      const edgeThin = Math.sqrt(Math.max(0.06, 1 - sz * sz * 0.88));

      const x = sx * (length * 0.5);
      const yBottom = archY - sideDrape;
      const yTop = yBottom + localThick * edgeThin;

      topVerts.push([x, yTop, z]);
      botVerts.push([x, yBottom, z]);
      uvs.push(u, v);
    }
  }

  const gridCount = (segX + 1) * (segZ + 1);
  const positions: number[] = [];
  const allUvs: number[] = [];

  for (let i = 0; i < gridCount; i++) {
    positions.push(...topVerts[i]);
    allUvs.push(uvs[i * 2], uvs[i * 2 + 1]);
  }
  for (let i = 0; i < gridCount; i++) {
    positions.push(...botVerts[i]);
    allUvs.push(uvs[i * 2], uvs[i * 2 + 1]);
  }

  const indices: number[] = [];
  const row = segZ + 1;

  for (let ix = 0; ix < segX; ix++) {
    for (let iz = 0; iz < segZ; iz++) {
      const a = ix * row + iz;
      const b = (ix + 1) * row + iz;
      const c = (ix + 1) * row + iz + 1;
      const d = ix * row + iz + 1;
      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  for (let ix = 0; ix < segX; ix++) {
    for (let iz = 0; iz < segZ; iz++) {
      const a = gridCount + ix * row + iz;
      const b = gridCount + (ix + 1) * row + iz;
      const c = gridCount + (ix + 1) * row + iz + 1;
      const d = gridCount + ix * row + iz + 1;
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  for (let ix = 0; ix < segX; ix++) {
    const t0 = ix * row;
    const t1 = (ix + 1) * row;
    const b0 = gridCount + t0;
    const b1 = gridCount + t1;
    indices.push(t0, t1, b0);
    indices.push(t1, b1, b0);

    const t2 = ix * row + segZ;
    const t3 = (ix + 1) * row + segZ;
    const b2 = gridCount + t2;
    const b3 = gridCount + t3;
    indices.push(t2, b2, t3);
    indices.push(t3, b2, b3);
  }

  for (let iz = 0; iz < segZ; iz++) {
    const t0 = iz;
    const t1 = iz + 1;
    const b0 = gridCount + t0;
    const b1 = gridCount + t1;
    indices.push(t0, b0, t1);
    indices.push(t1, b0, b1);

    const t2 = segX * row + iz;
    const t3 = segX * row + iz + 1;
    const b2 = gridCount + t2;
    const b3 = gridCount + t3;
    indices.push(t2, t3, b2);
    indices.push(t3, b3, b2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(allUvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Creates a sleek black nori belt wrapping cleanly around a tuna nigiri waist. */
function createNoriBeltGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const rx = 0.148;
  const ry = 0.116;
  const cy = 0.11;
  const segs = 32;

  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = cy + Math.sin(a) * (Math.sin(a) < 0 ? ry * 0.92 : ry * 1.05);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }

  const hole = new THREE.Path();
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const x = Math.cos(a) * (rx - 0.012);
    const y = cy + Math.sin(a) * (Math.sin(a) < 0 ? (ry - 0.012) * 0.92 : (ry - 0.012) * 1.05);
    if (i === 0) hole.moveTo(x, y);
    else hole.lineTo(x, y);
  }
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.105,
    bevelEnabled: false,
    curveSegments: 20,
  });
  geo.translate(0, 0, -0.0525);
  geo.rotateY(Math.PI / 2);
  return geo;
}

/** Creates a sculpted spiral-peaked fresh grated wasabi mound. */
function createWasabiMoundGeometry(): THREE.BufferGeometry {
  const radialSegs = 28;
  const heightSegs = 18;
  const height = 0.21;
  const baseR = 0.165;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= heightSegs; iy++) {
    const v = iy / heightSegs;
    const y = v * height;
    const rBase = baseR * Math.pow(1 - v, 0.72) * (1 + Math.sin(v * Math.PI) * 0.16);
    const twist = v * 2.4;

    for (let ix = 0; ix <= radialSegs; ix++) {
      const u = ix / radialSegs;
      const theta = u * Math.PI * 2;
      const swirl =
        1 +
        Math.sin(theta * 3 + twist) * 0.14 * Math.sin(v * Math.PI) +
        Math.cos(theta * 7 - v * 9) * 0.035;
      const r = rBase * swirl;

      const tipShiftX = Math.pow(v, 2.5) * 0.028;
      const tipShiftZ = Math.pow(v, 2.5) * -0.016;

      positions.push(Math.cos(theta) * r + tipShiftX, y, Math.sin(theta) * r + tipShiftZ);
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
  return geo;
}

/** Creates a paper-thin undulating blush-pink pickled gari ginger petal. */
function createGingerPetalGeometry(): THREE.BufferGeometry {
  const segU = 12;
  const segV = 8;
  const width = 0.24;
  const height = 0.19;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iu = 0; iu <= segU; iu++) {
    const u = iu / segU;
    const su = u * 2 - 1;
    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV;
      const fanWidth = (0.45 + 0.55 * Math.sin(Math.pow(v, 0.7) * Math.PI * 0.82)) * width;
      const x = su * fanWidth * 0.5;
      const y = v * height * (0.9 + 0.1 * Math.cos(su * Math.PI * 0.5));
      const z =
        Math.sin(su * Math.PI * 1.1) * 0.028 * v +
        Math.cos(v * Math.PI) * 0.018 +
        su * su * 0.025;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  const row = segV + 1;
  for (let iu = 0; iu < segU; iu++) {
    for (let iv = 0; iv < segV; iv++) {
      const a = iu * row + iv;
      const b = (iu + 1) * row + iv;
      const c = (iu + 1) * row + iv + 1;
      const d = iu * row + iv + 1;
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Creates a delicate curved Japanese sasa bamboo garnish leaf for the hinoki board. */
function createSasaLeafGeometry(): THREE.BufferGeometry {
  const segU = 14;
  const segV = 6;
  const length = 1.05;
  const maxHalfW = 0.24;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segU; i++) {
    const u = i / segU;
    const wProfile = Math.sin(Math.pow(u, 0.78) * Math.PI);
    const archY = Math.sin(u * Math.PI) * 0.016;
    for (let j = 0; j <= segV; j++) {
      const v = j / segV;
      const s = v * 2 - 1;
      const x = (u - 0.5) * length;
      const z = s * wProfile * maxHalfW;
      const y = archY + Math.abs(s) * 0.012 * wProfile;
      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  const row = segV + 1;
  for (let i = 0; i < segU; i++) {
    for (let j = 0; j < segV; j++) {
      const a = i * row + j;
      const b = (i + 1) * row + j;
      const c = (i + 1) * row + j + 1;
      const d = i * row + j + 1;
      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

interface MakiPlacement {
  position: [number, number, number];
  rotY: number;
  tilt: [number, number];
}

const MAKI_PLACEMENTS: MakiPlacement[] = [
  { position: [0.68, BOARD_TOP_Y, 0.36], rotY: 0.35, tilt: [0.02, -0.02] },
  { position: [1.06, BOARD_TOP_Y, 0.08], rotY: 1.55, tilt: [-0.02, 0.02] },
  { position: [0.58, BOARD_TOP_Y, -0.26], rotY: 2.65, tilt: [0.015, 0.015] },
];

const TOBIKO_OFFSETS: [number, number, number][] = [
  [0.02, 0.352, 0.03],
  [-0.025, 0.355, 0.02],
  [0.045, 0.35, -0.01],
  [0.005, 0.358, -0.02],
  [-0.035, 0.35, -0.035],
];

const GINGER_PETALS: {
  pos: [number, number, number];
  rot: [number, number, number];
  scale: number;
}[] = [
  { pos: [-0.05, 0.0, 0.04], rot: [-0.36, -0.5, 0.16], scale: 1.0 },
  { pos: [-0.01, 0.01, 0.02], rot: [-0.28, -0.18, 0.08], scale: 1.05 },
  { pos: [0.04, 0.012, 0.01], rot: [-0.32, 0.18, -0.08], scale: 1.02 },
  { pos: [0.08, 0.0, 0.03], rot: [-0.42, 0.56, -0.18], scale: 0.96 },
  { pos: [-0.03, 0.022, -0.03], rot: [-0.18, -0.32, 0.12], scale: 0.92 },
  { pos: [0.02, 0.026, -0.04], rot: [-0.16, 0.08, -0.04], scale: 0.95 },
  { pos: [0.06, 0.018, -0.02], rot: [-0.22, 0.42, -0.12], scale: 0.9 },
];

export function SushiModel({ exploded, highlightedPart, onSelectPart }: FoodModelProps) {
  const platterGroupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!platterGroupRef.current) return;
    platterGroupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.1) * 0.004;
  });

  const assets = useMemo(() => {
    // Shared cached procedural PBR textures (DO NOT dispose these!)
    const hinokiPbr = getWoodGrainTextures('hinoki');
    const ricePbr = getRiceGrainTextures();
    const fishBump = getOrganicNoiseBump(61, 14);
    const noriBump = getOrganicNoiseBump(83, 28);
    const wasabiBump = getOrganicNoiseBump(97, 26);
    const leafBump = getOrganicNoiseBump(53, 18);
    const gingerBump = getOrganicNoiseBump(71, 12);

    // Local per-component color textures (disposed on unmount)
    const salmonTex = createSalmonTexture();
    const tunaTex = createTunaTexture();
    const noriTex = createNoriTexture();
    const gingerTex = createGingerTexture();

    const boardSlabGeo = createBoardSlabGeometry();
    const getaFootGeo = createGetaFootGeometry();
    const sasaLeafGeo = createSasaLeafGeometry();

    const ricePillowGeo = createRicePillowGeometry();
    const salmonFilletGeo = createDrapedFilletGeometry(0.74, 0.295, 0.052);
    const tunaFilletGeo = createDrapedFilletGeometry(0.71, 0.285, 0.058);
    const noriBeltGeo = createNoriBeltGeometry();

    const makiNoriGeo = new THREE.CylinderGeometry(0.225, 0.225, 0.315, 32, 1, true);
    makiNoriGeo.translate(0, 0.16, 0);
    const makiRiceGeo = new THREE.CylinderGeometry(0.214, 0.214, 0.33, 32);
    makiRiceGeo.translate(0, 0.165, 0);

    const avoShape = new THREE.Shape();
    avoShape.absarc(0, 0, 0.088, -Math.PI * 0.4, Math.PI * 0.72, false);
    avoShape.lineTo(-0.015, 0.01);
    avoShape.closePath();
    const makiAvocadoGeo = new THREE.ExtrudeGeometry(avoShape, {
      depth: 0.345,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.005,
      bevelSegments: 2,
    });
    makiAvocadoGeo.rotateX(-Math.PI / 2);

    const makiCucSkinGeo = new THREE.BoxGeometry(0.082, 0.352, 0.082);
    makiCucSkinGeo.translate(0, 0.176, 0);
    const makiCucCoreGeo = new THREE.BoxGeometry(0.064, 0.358, 0.064);
    makiCucCoreGeo.translate(0, 0.179, 0);

    const tobikoGeo = new THREE.SphereGeometry(0.019, 10, 8);
    const sesameGeo = new THREE.SphereGeometry(0.011, 8, 6);
    sesameGeo.scale(1.6, 0.7, 0.9);

    const wasabiGeo = createWasabiMoundGeometry();
    const gingerPetalGeo = createGingerPetalGeometry();

    // v2 Tactile PBR Materials
    const hinokiMat = new THREE.MeshStandardMaterial({
      color: '#F5E4C8',
      map: hinokiPbr.map,
      bumpMap: hinokiPbr.bumpMap,
      bumpScale: 0.012,
      roughnessMap: hinokiPbr.roughnessMap,
      roughness: 0.68,
      metalness: 0.0,
    });

    const getaFootMat = new THREE.MeshStandardMaterial({
      color: '#DEC094',
      map: hinokiPbr.map,
      bumpMap: hinokiPbr.bumpMap,
      bumpScale: 0.014,
      roughnessMap: hinokiPbr.roughnessMap,
      roughness: 0.76,
      metalness: 0.0,
    });

    const sasaMat = new THREE.MeshPhysicalMaterial({
      color: '#376B38',
      bumpMap: leafBump,
      bumpScale: 0.008,
      roughness: 0.38,
      clearcoat: 0.32,
      clearcoatRoughness: 0.3,
      side: THREE.DoubleSide,
    });

    // Glistening vinegar-seasoned short-grain shari rice with individual grain bump + roughness
    const riceMat = new THREE.MeshPhysicalMaterial({
      color: '#FCF9F1',
      bumpMap: ricePbr.bumpMap,
      bumpScale: 0.024,
      roughnessMap: ricePbr.roughnessMap,
      roughness: 0.85,
      metalness: 0.0,
      clearcoat: 0.36,
      clearcoatRoughness: 0.22,
      sheen: 0.25,
      sheenColor: new THREE.Color('#FFFDF7'),
    });

    // Fresh marbled Atlantic salmon fillet with soft fleshy sheen & nikiri glaze clearcoat
    const salmonMat = new THREE.MeshPhysicalMaterial({
      color: '#FFFFFF',
      map: salmonTex,
      bumpMap: fishBump,
      bumpScale: 0.01,
      roughness: 0.14,
      metalness: 0.0,
      clearcoat: 0.85,
      clearcoatRoughness: 0.08,
      sheen: 0.42,
      sheenColor: new THREE.Color('#FFD9C6'),
      sheenRoughness: 0.32,
    });

    // Jewel-like ruby-red akami maguro tuna fillet with glossy nikiri sheen & muscle grain
    const tunaMat = new THREE.MeshPhysicalMaterial({
      color: '#FFFFFF',
      map: tunaTex,
      bumpMap: fishBump,
      bumpScale: 0.009,
      roughness: 0.14,
      metalness: 0.0,
      clearcoat: 0.86,
      clearcoatRoughness: 0.07,
      sheen: 0.4,
      sheenColor: new THREE.Color('#EC606A'),
      sheenRoughness: 0.34,
    });

    // Crisp matte textured toasted nori seaweed
    const noriMat = new THREE.MeshStandardMaterial({
      color: '#1E241E',
      map: noriTex,
      bumpMap: noriBump,
      bumpScale: 0.016,
      roughness: 0.82,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    const avocadoMat = new THREE.MeshPhysicalMaterial({
      color: '#9BC53D',
      bumpMap: gingerBump,
      bumpScale: 0.006,
      roughness: 0.3,
      clearcoat: 0.28,
      clearcoatRoughness: 0.3,
    });

    const cucSkinMat = new THREE.MeshStandardMaterial({
      color: '#468737',
      bumpMap: leafBump,
      bumpScale: 0.008,
      roughness: 0.4,
    });

    const cucCoreMat = new THREE.MeshPhysicalMaterial({
      color: '#CFE8A9',
      roughness: 0.2,
      clearcoat: 0.48,
    });

    const tobikoMat = new THREE.MeshPhysicalMaterial({
      color: '#F26419',
      roughness: 0.1,
      clearcoat: 0.96,
      clearcoatRoughness: 0.06,
    });

    const sesameMat = new THREE.MeshStandardMaterial({
      color: '#F3DFB4',
      roughness: 0.58,
    });

    // Coarse freshly grated hon-wasabi paste mound
    const wasabiMat = new THREE.MeshPhysicalMaterial({
      color: '#86B049',
      bumpMap: wasabiBump,
      bumpScale: 0.028,
      roughness: 0.88,
      metalness: 0.0,
      sheen: 0.22,
      sheenColor: new THREE.Color('#C0DF86'),
      sheenRoughness: 0.7,
    });

    // Translucent blush-pink pickled gari ginger petals
    const gingerMat = new THREE.MeshPhysicalMaterial({
      color: '#FFFFFF',
      map: gingerTex,
      bumpMap: gingerBump,
      bumpScale: 0.006,
      roughness: 0.18,
      metalness: 0.0,
      clearcoat: 0.55,
      clearcoatRoughness: 0.14,
      transmission: 0.28,
      thickness: 0.08,
      attenuationColor: new THREE.Color('#F29AB0'),
      attenuationDistance: 0.32,
      side: THREE.DoubleSide,
    });

    return {
      localTextures: [salmonTex, tunaTex, noriTex, gingerTex],
      geometries: {
        boardSlabGeo,
        getaFootGeo,
        sasaLeafGeo,
        ricePillowGeo,
        salmonFilletGeo,
        tunaFilletGeo,
        noriBeltGeo,
        makiNoriGeo,
        makiRiceGeo,
        makiAvocadoGeo,
        makiCucSkinGeo,
        makiCucCoreGeo,
        tobikoGeo,
        sesameGeo,
        wasabiGeo,
        gingerPetalGeo,
      },
      materials: {
        hinokiMat,
        getaFootMat,
        sasaMat,
        riceMat,
        salmonMat,
        tunaMat,
        noriMat,
        avocadoMat,
        cucSkinMat,
        cucCoreMat,
        tobikoMat,
        sesameMat,
        wasabiMat,
        gingerMat,
      },
    };
  }, []);

  useEffect(() => {
    return () => {
      assets.localTextures.forEach((t) => t?.dispose());
      Object.values(assets.geometries).forEach((g) => g.dispose());
      Object.values(assets.materials).forEach((m) => m.dispose());
    };
  }, [assets]);

  return (
    <group ref={platterGroupRef} position={[0, 0, 0]}>
      {/* 1. HINOKI GETA BOARD */}
      <FoodLayer
        partId="board"
        label="Hinoki Geta Board"
        explodeY={-0.25}
        pinPosition={[-1.65, 0.1, 0.4]}
        exploded={exploded}
        highlighted={highlightedPart === 'board'}
        onSelect={onSelectPart}
      >
        <mesh
          geometry={assets.geometries.boardSlabGeo}
          material={assets.materials.hinokiMat}
          position={[0, BOARD_TOP_Y - 0.115, 0]}
          castShadow
          receiveShadow
        />
        <mesh
          geometry={assets.geometries.getaFootGeo}
          material={assets.materials.getaFootMat}
          position={[-0.98, BOARD_BASE_Y, 0]}
          castShadow
          receiveShadow
        />
        <mesh
          geometry={assets.geometries.getaFootGeo}
          material={assets.materials.getaFootMat}
          position={[0.98, BOARD_BASE_Y, 0]}
          castShadow
          receiveShadow
        />
        <mesh
          geometry={assets.geometries.sasaLeafGeo}
          material={assets.materials.sasaMat}
          position={[-0.86, BOARD_TOP_Y + 0.008, -0.34]}
          rotation={[0, -0.35, 0]}
          receiveShadow
        />
      </FoodLayer>

      {/* 2. ATLANTIC SALMON NIGIRI */}
      <FoodLayer
        partId="salmon-nigiri"
        label="Atlantic Salmon Nigiri"
        explodeY={0.45}
        pinPosition={[-1.1, 0.55, 0.55]}
        exploded={exploded}
        highlighted={highlightedPart === 'salmon-nigiri'}
        onSelect={onSelectPart}
      >
        {[
          { pos: [-0.98, BOARD_TOP_Y, 0.34] as [number, number, number], rotY: 0.34 },
          { pos: [-0.72, BOARD_TOP_Y, -0.22] as [number, number, number], rotY: 0.24 },
        ].map((item, i) => (
          <group key={i} position={item.pos} rotation={[0, item.rotY, 0]}>
            <mesh
              geometry={assets.geometries.ricePillowGeo}
              material={assets.materials.riceMat}
              castShadow
              receiveShadow
            />
            <mesh
              geometry={assets.geometries.salmonFilletGeo}
              material={assets.materials.salmonMat}
              castShadow
              receiveShadow
            />
          </group>
        ))}
      </FoodLayer>

      {/* 3. LEAN TUNA NIGIRI */}
      <FoodLayer
        partId="tuna-nigiri"
        label="Lean Tuna Nigiri"
        explodeY={0.65}
        pinPosition={[-0.1, 0.65, 0.65]}
        exploded={exploded}
        highlighted={highlightedPart === 'tuna-nigiri'}
        onSelect={onSelectPart}
      >
        {[
          {
            pos: [-0.14, BOARD_TOP_Y, 0.34] as [number, number, number],
            rotY: 0.28,
            hasBelt: true,
          },
          {
            pos: [0.06, BOARD_TOP_Y, -0.24] as [number, number, number],
            rotY: 0.2,
            hasBelt: false,
          },
        ].map((item, i) => (
          <group key={i} position={item.pos} rotation={[0, item.rotY, 0]}>
            <mesh
              geometry={assets.geometries.ricePillowGeo}
              material={assets.materials.riceMat}
              castShadow
              receiveShadow
            />
            <mesh
              geometry={assets.geometries.tunaFilletGeo}
              material={assets.materials.tunaMat}
              castShadow
              receiveShadow
            />
            {item.hasBelt && (
              <mesh
                geometry={assets.geometries.noriBeltGeo}
                material={assets.materials.noriMat}
                castShadow
              />
            )}
          </group>
        ))}
      </FoodLayer>

      {/* 4. AVOCADO CUCUMBER MAKI */}
      <FoodLayer
        partId="maki"
        label="Avocado Cucumber Maki"
        explodeY={0.95}
        pinPosition={[1.15, 0.6, 0.1]}
        exploded={exploded}
        highlighted={highlightedPart === 'maki'}
        onSelect={onSelectPart}
      >
        {MAKI_PLACEMENTS.map((roll, idx) => (
          <group
            key={idx}
            position={roll.position}
            rotation={[roll.tilt[0], roll.rotY, roll.tilt[1]]}
          >
            <mesh
              geometry={assets.geometries.makiNoriGeo}
              material={assets.materials.noriMat}
              castShadow
              receiveShadow
            />
            <mesh
              geometry={assets.geometries.makiRiceGeo}
              material={assets.materials.riceMat}
              castShadow
              receiveShadow
            />
            <mesh
              geometry={assets.geometries.makiAvocadoGeo}
              material={assets.materials.avocadoMat}
              position={[-0.025, 0.002, -0.015]}
            />
            <mesh
              geometry={assets.geometries.makiCucSkinGeo}
              material={assets.materials.cucSkinMat}
              position={[0.048, 0, 0.032]}
              rotation={[0, 0.4, 0]}
            />
            <mesh
              geometry={assets.geometries.makiCucCoreGeo}
              material={assets.materials.cucCoreMat}
              position={[0.048, 0, 0.032]}
              rotation={[0, 0.4, 0]}
            />
            {TOBIKO_OFFSETS.map((off, ti) => (
              <mesh
                key={ti}
                geometry={assets.geometries.tobikoGeo}
                material={assets.materials.tobikoMat}
                position={off}
              />
            ))}
            <mesh
              geometry={assets.geometries.sesameGeo}
              material={assets.materials.sesameMat}
              position={[-0.12, 0.335, 0.06]}
              rotation={[0, 0.7, 0]}
            />
            <mesh
              geometry={assets.geometries.sesameGeo}
              material={assets.materials.sesameMat}
              position={[0.11, 0.335, -0.08]}
              rotation={[0, 2.1, 0]}
            />
          </group>
        ))}
      </FoodLayer>

      {/* 5. WASABI & PICKLED GINGER */}
      <FoodLayer
        partId="condiments"
        label="Wasabi & Pickled Ginger"
        explodeY={1.3}
        pinPosition={[1.35, 0.55, -0.55]}
        exploded={exploded}
        highlighted={highlightedPart === 'condiments'}
        onSelect={onSelectPart}
      >
        <mesh
          geometry={assets.geometries.wasabiGeo}
          material={assets.materials.wasabiMat}
          position={[0.98, BOARD_TOP_Y, -0.54]}
          castShadow
          receiveShadow
        />

        <group position={[1.19, BOARD_TOP_Y + 0.005, -0.44]} rotation={[0, -0.55, 0]}>
          {GINGER_PETALS.map((p, pi) => (
            <mesh
              key={pi}
              geometry={assets.geometries.gingerPetalGeo}
              material={assets.materials.gingerMat}
              position={p.pos}
              rotation={p.rot}
              scale={p.scale}
              castShadow
              receiveShadow
            />
          ))}
        </group>
      </FoodLayer>
    </group>
  );
}

export default SushiModel;

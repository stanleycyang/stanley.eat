'use client';

import * as THREE from 'three';

export interface PbrTextureSet {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

export interface RiceGrainTextureSet {
  bumpMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

export interface BrothShaderOptions {
  baseColor: string;
  oilColor: string;
  sheenColor?: string;
  isSpicy?: boolean;
  opacity?: number;
}

export interface AnimatedBrothMaterial extends THREE.MeshPhysicalMaterial {
  userData: {
    uTime: { value: number };
    uHighlight: { value: number };
    [key: string]: unknown;
  };
}

export interface FoodSSSOptions {
  color: string;
  intensity?: number;
  power?: number;
  scale?: number;
}

export interface DisplaceOrganicOptions {
  amplitude: number;
  frequency: number;
  seed?: number;
  flattenBottomY?: number;
  preserveSeam?: boolean;
}

export interface WetnessVertexColorOptions {
  wetY: number;
  bandHeight: number;
  dryColor: string;
  wetColor: string;
}

// ---------------------------------------------------------------------------
// Deterministic PRNG & seamless 2D/3D noise helpers
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2D(ix: number, iy: number, seed: number): number {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  n = (n ^ (n >>> 13)) | 0;
  n = Math.imul(n, 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function hash3D(ix: number, iy: number, iz: number, seed: number): number {
  let n =
    Math.imul(ix, 374761393) +
    Math.imul(iy, 668265263) +
    Math.imul(iz, 2147483647) +
    Math.imul(seed, 1442695041);
  n = (n ^ (n >>> 13)) | 0;
  n = Math.imul(n, 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function smoothstep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/** Seamless tileable 2D value noise in [0, 1] with integer period. */
function tileableNoise2D(x: number, y: number, period: number, seed: number): number {
  const p = Math.max(1, Math.round(period));
  const fx = ((x % p) + p) % p;
  const fy = ((y % p) + p) % p;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = (x0 + 1) % p;
  const y1 = (y0 + 1) % p;
  const tx = smoothstep01(fx - x0);
  const ty = smoothstep01(fy - y0);

  const v00 = hash2D(x0, y0, seed);
  const v10 = hash2D(x1, y0, seed);
  const v01 = hash2D(x0, y1, seed);
  const v11 = hash2D(x1, y1, seed);

  const a = v00 + (v10 - v00) * tx;
  const b = v01 + (v11 - v01) * tx;
  return a + (b - a) * ty;
}

function tileableFbm(
  u: number,
  v: number,
  baseFreq: number,
  octaves: number,
  seed: number
): number {
  let total = 0;
  let amp = 0.5;
  let norm = 0;
  let freq = Math.max(1, Math.round(baseFreq));

  for (let i = 0; i < octaves; i++) {
    total += tileableNoise2D(u * freq, v * freq, freq, seed + i * 97) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return total / norm;
}

/** Deterministic 3D smooth value noise in [-1, 1]. */
function noise3D(x: number, y: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const tx = smoothstep01(x - ix);
  const ty = smoothstep01(y - iy);
  const tz = smoothstep01(z - iz);

  const c000 = hash3D(ix, iy, iz, seed);
  const c100 = hash3D(ix + 1, iy, iz, seed);
  const c010 = hash3D(ix, iy + 1, iz, seed);
  const c110 = hash3D(ix + 1, iy + 1, iz, seed);
  const c001 = hash3D(ix, iy, iz + 1, seed);
  const c101 = hash3D(ix + 1, iy, iz + 1, seed);
  const c011 = hash3D(ix, iy + 1, iz + 1, seed);
  const c111 = hash3D(ix + 1, iy + 1, iz + 1, seed);

  const x00 = c000 + (c100 - c000) * tx;
  const x10 = c010 + (c110 - c010) * tx;
  const x01 = c001 + (c101 - c001) * tx;
  const x11 = c011 + (c111 - c011) * tx;

  const y0 = x00 + (x10 - x00) * ty;
  const y1 = x01 + (x11 - x01) * ty;

  return (y0 + (y1 - y0) * tz) * 2 - 1;
}

function fbm3D(x: number, y: number, z: number, octaves: number, seed: number): number {
  let total = 0;
  let amp = 0.5;
  let norm = 0;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    total += noise3D(x * freq, y * freq, z * freq, seed + i * 131) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return total / norm;
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

// ---------------------------------------------------------------------------
// CanvasTexture factory, 3x3 Sobel normal converter & caches (SSR-safe)
// ---------------------------------------------------------------------------

const pbrCache = new Map<string, PbrTextureSet>();
const riceCache: { value?: RiceGrainTextureSet } = {};
const noiseBumpCache = new Map<string, THREE.CanvasTexture>();
const noiseNormalCache = new Map<string, THREE.CanvasTexture>();

function createFallbackTexture(isColor: boolean): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(undefined as unknown as HTMLCanvasElement);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return tex;
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create 2D context for procedural texture');
  }
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Converts a scalar heightfield [0..1] into a seamless tileable tangent-space
 * RGB normal map using a 3x3 Sobel kernel.
 */
export function heightDataToNormalTexture(
  heightField: Float32Array,
  size: number,
  strength: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  if (typeof document === 'undefined') {
    return createFallbackTexture(false);
  }

  const [canvas, ctx] = makeCanvas(size);
  const img = ctx.createImageData(size, size);
  const data = img.data;

  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    const rowM = ym * size;
    const row0 = y * size;
    const rowP = yp * size;

    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;

      const tl = heightField[rowM + xm];
      const t = heightField[rowM + x];
      const tr = heightField[rowM + xp];
      const l = heightField[row0 + xm];
      const r = heightField[row0 + xp];
      const bl = heightField[rowP + xm];
      const b = heightField[rowP + x];
      const br = heightField[rowP + xp];

      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      // OpenGL tangent-space convention: +X right, +Y up (canvas y grows down)
      let nx = -dx * strength;
      let ny = dy * strength;
      let nz = 1.0;
      const invLen = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const idx = (row0 + x) * 4;
      data[idx] = clampByte((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = clampByte((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = clampByte((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  return finalizeTexture(canvas, false, repeatX, repeatY);
}

function createPixelPbrSet(
  size: number,
  normalStrength: number,
  pixelFn: (
    u: number,
    v: number,
    x: number,
    y: number
  ) => [r: number, g: number, b: number, height: number, rough: number],
  repeatX = 1,
  repeatY = 1
): { set: PbrTextureSet; heightField: Float32Array } {
  if (typeof document === 'undefined') {
    const empty = new Float32Array(0);
    return {
      set: {
        map: createFallbackTexture(true),
        bumpMap: createFallbackTexture(false),
        normalMap: createFallbackTexture(false),
        roughnessMap: createFallbackTexture(false),
      },
      heightField: empty,
    };
  }

  const [colorCanvas, colorCtx] = makeCanvas(size);
  const [bumpCanvas, bumpCtx] = makeCanvas(size);
  const [roughCanvas, roughCtx] = makeCanvas(size);

  const colorImg = colorCtx.createImageData(size, size);
  const bumpImg = bumpCtx.createImageData(size, size);
  const roughImg = roughCtx.createImageData(size, size);
  const heightField = new Float32Array(size * size);

  const cData = colorImg.data;
  const bData = bumpImg.data;
  const rData = roughImg.data;

  for (let y = 0; y < size; y++) {
    const v = y / size;
    const row = y * size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const [r, g, b, height, rough] = pixelFn(u, v, x, y);
      const hClamped = Math.max(0, Math.min(1, height));
      heightField[row + x] = hClamped;

      const idx = (row + x) * 4;
      cData[idx] = clampByte(r);
      cData[idx + 1] = clampByte(g);
      cData[idx + 2] = clampByte(b);
      cData[idx + 3] = 255;

      const bVal = clampByte(hClamped * 255);
      bData[idx] = bVal;
      bData[idx + 1] = bVal;
      bData[idx + 2] = bVal;
      bData[idx + 3] = 255;

      const rVal = clampByte(rough * 255);
      rData[idx] = rVal;
      rData[idx + 1] = rVal;
      rData[idx + 2] = rVal;
      rData[idx + 3] = 255;
    }
  }

  colorCtx.putImageData(colorImg, 0, 0);
  bumpCtx.putImageData(bumpImg, 0, 0);
  roughCtx.putImageData(roughImg, 0, 0);

  return {
    set: {
      map: finalizeTexture(colorCanvas, true, repeatX, repeatY),
      bumpMap: finalizeTexture(bumpCanvas, false, repeatX, repeatY),
      normalMap: heightDataToNormalTexture(heightField, size, normalStrength, repeatX, repeatY),
      roughnessMap: finalizeTexture(roughCanvas, false, repeatX, repeatY),
    },
    heightField,
  };
}

function extractHeightFromCanvas(canvas: HTMLCanvasElement, size: number): Float32Array {
  const ctx = canvas.getContext('2d');
  const field = new Float32Array(size * size);
  if (!ctx) return field;
  const data = ctx.getImageData(0, 0, size, size).data;
  for (let i = 0; i < size * size; i++) {
    field[i] = data[i * 4] / 255;
  }
  return field;
}

// ---------------------------------------------------------------------------
// 1. Stoneware Ceramic (512x512 matte speckled artisanal glaze + RGB normalMap)
// ---------------------------------------------------------------------------

export function getStonewareTextures(): PbrTextureSet {
  const key = 'stoneware';
  const cached = pbrCache.get(key);
  if (cached) return cached;

  const size = 512;
  if (typeof document === 'undefined') {
    const fb: PbrTextureSet = {
      map: createFallbackTexture(true),
      bumpMap: createFallbackTexture(false),
      normalMap: createFallbackTexture(false),
      roughnessMap: createFallbackTexture(false),
    };
    pbrCache.set(key, fb);
    return fb;
  }

  const { set } = createPixelPbrSet(
    size,
    1.8,
    (u, v) => {
      const throwBand = Math.sin(v * Math.PI * 36) * 0.5 + 0.5;
      const glazeVar = tileableFbm(u, v, 5, 4, 101);
      const microGrain = tileableFbm(u, v, 28, 2, 203);

      const baseR = 238 + (glazeVar - 0.5) * 16 + (throwBand - 0.5) * 4;
      const baseG = 231 + (glazeVar - 0.5) * 15 + (throwBand - 0.5) * 4;
      const baseB = 219 + (glazeVar - 0.5) * 14 + (throwBand - 0.5) * 3;

      const height = 0.5 + (throwBand - 0.5) * 0.14 + (microGrain - 0.5) * 0.28;
      const rough = 0.44 + (1 - glazeVar) * 0.22 + (microGrain - 0.5) * 0.08;

      return [baseR, baseG, baseB, height, rough];
    },
    2,
    2
  );

  // Add scattered artisanal iron-oxide stoneware speckles and recompute normalMap
  const colorCanvas = set.map.image as HTMLCanvasElement;
  const bumpCanvas = set.bumpMap.image as HTMLCanvasElement;
  const roughCanvas = set.roughnessMap.image as HTMLCanvasElement;
  const cCtx = colorCanvas.getContext('2d');
  const bCtx = bumpCanvas.getContext('2d');
  const rCtx = roughCanvas.getContext('2d');

  if (cCtx && bCtx && rCtx) {
    const rand = mulberry32(8421);
    for (let i = 0; i < 680; i++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const rad = 0.9 + rand() * 2.4;
      const dark = rand() > 0.35;
      cCtx.fillStyle = dark
        ? `rgba(88, 68, 52, ${0.22 + rand() * 0.42})`
        : `rgba(155, 132, 108, ${0.2 + rand() * 0.3})`;
      bCtx.fillStyle = `rgba(82, 82, 82, ${0.32 + rand() * 0.38})`;
      rCtx.fillStyle = `rgba(218, 218, 218, ${0.35 + rand() * 0.35})`;

      for (const ox of [-size, 0, size]) {
        for (const oy of [-size, 0, size]) {
          const px = cx + ox;
          const py = cy + oy;
          if (px < -6 || px > size + 6 || py < -6 || py > size + 6) continue;
          cCtx.beginPath();
          cCtx.arc(px, py, rad, 0, Math.PI * 2);
          cCtx.fill();

          bCtx.beginPath();
          bCtx.arc(px, py, rad * 0.9, 0, Math.PI * 2);
          bCtx.fill();

          rCtx.beginPath();
          rCtx.arc(px, py, rad * 1.1, 0, Math.PI * 2);
          rCtx.fill();
        }
      }
    }

    set.map.needsUpdate = true;
    set.bumpMap.needsUpdate = true;
    set.roughnessMap.needsUpdate = true;

    const updatedHeight = extractHeightFromCanvas(bumpCanvas, size);
    set.normalMap.dispose();
    set.normalMap = heightDataToNormalTexture(updatedHeight, size, 2.0, 2, 2);
  }

  pbrCache.set(key, set);
  return set;
}

// ---------------------------------------------------------------------------
// 2. Rice Grain Textures (512x512 crisp oval grain normalMap + glossy crowns)
// ---------------------------------------------------------------------------

export function getRiceGrainTextures(): RiceGrainTextureSet {
  if (riceCache.value) return riceCache.value;

  if (typeof document === 'undefined') {
    riceCache.value = {
      bumpMap: createFallbackTexture(false),
      normalMap: createFallbackTexture(false),
      roughnessMap: createFallbackTexture(false),
    };
    return riceCache.value;
  }

  const size = 512;
  const [bumpCanvas, bCtx] = makeCanvas(size);
  const [roughCanvas, rCtx] = makeCanvas(size);

  bCtx.fillStyle = '#1E1E1E';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#BDBDBD';
  rCtx.fillRect(0, 0, size, size);

  const rand = mulberry32(4919);
  const grainCount = 1450;

  for (let i = 0; i < grainCount; i++) {
    const gx = rand() * size;
    const gy = rand() * size;
    const rx = 8.4 + rand() * 5.2;
    const ry = 3.6 + rand() * 2.2;
    const angle = rand() * Math.PI;
    const peak = 215 + Math.floor(rand() * 40);
    const roughCrown = 42 + Math.floor(rand() * 38);

    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        const px = gx + ox;
        const py = gy + oy;
        if (px < -18 || px > size + 18 || py < -18 || py > size + 18) continue;

        bCtx.save();
        bCtx.translate(px, py);
        bCtx.rotate(angle);
        bCtx.scale(1, ry / rx);
        const grad = bCtx.createRadialGradient(-rx * 0.12, -rx * 0.08, rx * 0.06, 0, 0, rx);
        grad.addColorStop(0, `rgb(${peak},${peak},${peak})`);
        grad.addColorStop(
          0.6,
          `rgb(${Math.round(peak * 0.78)},${Math.round(peak * 0.78)},${Math.round(peak * 0.78)})`
        );
        grad.addColorStop(1, 'rgba(24,24,24,0)');
        bCtx.fillStyle = grad;
        bCtx.beginPath();
        bCtx.arc(0, 0, rx, 0, Math.PI * 2);
        bCtx.fill();
        bCtx.restore();

        rCtx.save();
        rCtx.translate(px, py);
        rCtx.rotate(angle);
        rCtx.scale(1, ry / rx);
        const rGrad = rCtx.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
        rGrad.addColorStop(0, `rgb(${roughCrown},${roughCrown},${roughCrown})`);
        rGrad.addColorStop(0.68, 'rgb(112,112,112)');
        rGrad.addColorStop(1, 'rgba(189,189,189,0)');
        rCtx.fillStyle = rGrad;
        rCtx.beginPath();
        rCtx.arc(0, 0, rx, 0, Math.PI * 2);
        rCtx.fill();
        rCtx.restore();
      }
    }
  }

  const heightField = extractHeightFromCanvas(bumpCanvas, size);

  riceCache.value = {
    bumpMap: finalizeTexture(bumpCanvas, false, 3, 3),
    normalMap: heightDataToNormalTexture(heightField, size, 3.4, 3, 3),
    roughnessMap: finalizeTexture(roughCanvas, false, 3, 3),
  };
  return riceCache.value;
}

// ---------------------------------------------------------------------------
// 3. Crispy Panko Crust / Blistered Baked Dough (512x512 + Sobel normalMap)
// ---------------------------------------------------------------------------

export function getPankoCrustTextures(): PbrTextureSet {
  const key = 'panko-crust';
  const cached = pbrCache.get(key);
  if (cached) return cached;

  const { set } = createPixelPbrSet(
    512,
    3.6,
    (u, v) => {
      const coarse = tileableFbm(u, v, 8, 3, 311);
      const crunch = tileableFbm(u, v, 24, 3, 419);
      const pores = tileableFbm(u, v, 56, 2, 521);

      const ridge = Math.abs(crunch - 0.5) * 2;
      const goldenMix = Math.min(1, Math.max(0, coarse * 0.55 + crunch * 0.45));
      const toastSpot = pores < 0.24 ? (0.24 - pores) * 2.4 : 0;

      const r = 186 + goldenMix * 56 - toastSpot * 82;
      const g = 114 + goldenMix * 58 - toastSpot * 62;
      const b = 42 + goldenMix * 38 - toastSpot * 28;

      const height = Math.min(1, Math.max(0, 0.25 + ridge * 0.55 + pores * 0.35 - toastSpot * 0.35));
      const oilGlint = pores > 0.78 ? 0.36 : 0;
      const rough = Math.min(0.95, Math.max(0.26, 0.76 + (1 - ridge) * 0.16 - oilGlint));

      return [r, g, b, height, rough];
    },
    3,
    3
  );

  pbrCache.set(key, set);
  return set;
}

// ---------------------------------------------------------------------------
// 4. Wood Grain Textures (512x512 Hinoki, Cedar, Walnut + Sobel normalMap)
// ---------------------------------------------------------------------------

const WOOD_PALETTES: Record<
  'hinoki' | 'cedar' | 'walnut',
  {
    light: [number, number, number];
    dark: [number, number, number];
    seed: number;
    baseRough: number;
  }
> = {
  hinoki: {
    light: [232, 206, 166],
    dark: [194, 158, 110],
    seed: 601,
    baseRough: 0.52,
  },
  cedar: {
    light: [204, 144, 98],
    dark: [142, 84, 48],
    seed: 709,
    baseRough: 0.58,
  },
  walnut: {
    light: [104, 70, 48],
    dark: [50, 32, 22],
    seed: 811,
    baseRough: 0.54,
  },
};

export function getWoodGrainTextures(variant: 'hinoki' | 'cedar' | 'walnut'): PbrTextureSet {
  const key = `wood-${variant}`;
  const cached = pbrCache.get(key);
  if (cached) return cached;

  const pal = WOOD_PALETTES[variant];

  const { set } = createPixelPbrSet(
    512,
    2.4,
    (u, v) => {
      const warp = tileableFbm(u, v, 3, 3, pal.seed) * 1.45;
      const ringPhase = (v * 9.5 + warp) * Math.PI * 2;
      const ring = Math.pow(0.5 + 0.5 * Math.sin(ringPhase), 1.45);
      const fineFiber = tileableFbm(u, v * 4, 16, 2, pal.seed + 37);
      const streak = tileableNoise2D(u * 8, v * 64, 64, pal.seed + 83);

      const mix = Math.min(1, Math.max(0, ring * 0.68 + fineFiber * 0.22 + streak * 0.1));
      const r = pal.dark[0] + (pal.light[0] - pal.dark[0]) * mix;
      const g = pal.dark[1] + (pal.light[1] - pal.dark[1]) * mix;
      const b = pal.dark[2] + (pal.light[2] - pal.dark[2]) * mix;

      const height = 0.45 + (ring - 0.5) * 0.28 + (streak - 0.5) * 0.24;
      const rough = Math.min(
        0.86,
        Math.max(0.32, pal.baseRough + (1 - ring) * 0.18 + (streak - 0.5) * 0.08)
      );

      return [r, g, b, height, rough];
    },
    1,
    1
  );

  pbrCache.set(key, set);
  return set;
}

// ---------------------------------------------------------------------------
// 5. Woven Bamboo Slats (512x512 + Sobel normalMap)
// ---------------------------------------------------------------------------

export function getBambooWeaveTextures(): PbrTextureSet {
  const key = 'bamboo-weave';
  const cached = pbrCache.get(key);
  if (cached) return cached;

  const { set } = createPixelPbrSet(
    512,
    3.2,
    (u, v) => {
      const cells = 8;
      const gx = u * cells;
      const gy = v * cells;
      const ix = Math.floor(gx);
      const iy = Math.floor(gy);
      const fx = gx - ix;
      const fy = gy - iy;

      const isHorizontal = (ix + iy) % 2 === 0;
      const along = isHorizontal ? fx : fy;
      const across = isHorizontal ? fy : fx;

      const acrossProfile = Math.sin(across * Math.PI);
      const alongArch = 0.72 + 0.28 * Math.sin(along * Math.PI);
      const seamGap = across < 0.055 || across > 0.945 ? 0.3 : 1.0;

      const fiber = tileableNoise2D(
        (isHorizontal ? u : v) * 8,
        (isHorizontal ? v : u) * 72,
        72,
        929
      );
      const tintNoise = hash2D(ix, iy, 953);

      const height = Math.pow(Math.max(0, acrossProfile), 0.55) * alongArch * seamGap;
      const shade = 0.62 + height * 0.38;

      const r = (212 + (tintNoise - 0.5) * 26 + (fiber - 0.5) * 14) * shade;
      const g = (176 + (tintNoise - 0.5) * 22 + (fiber - 0.5) * 12) * shade;
      const b = (114 + (tintNoise - 0.5) * 18 + (fiber - 0.5) * 10) * shade;

      const relief = Math.min(1, Math.max(0, height * 0.85 + (fiber - 0.5) * 0.15));
      const rough = Math.min(0.92, Math.max(0.36, 0.84 - height * 0.4 + (fiber - 0.5) * 0.08));

      return [r, g, b, relief, rough];
    },
    2,
    2
  );

  pbrCache.set(key, set);
  return set;
}

// ---------------------------------------------------------------------------
// 6. Dark Slate / Hand-Thrown Dark Stoneware Clay (512x512 + Sobel normalMap)
// ---------------------------------------------------------------------------

export function getSlateTextures(): PbrTextureSet {
  const key = 'slate';
  const cached = pbrCache.get(key);
  if (cached) return cached;

  const { set } = createPixelPbrSet(
    512,
    3.0,
    (u, v) => {
      const strata = tileableFbm(u, v * 2.0, 5, 4, 1103);
      const cleft = tileableFbm(u * 2.0, v, 10, 3, 1217);
      const grit = tileableFbm(u, v, 36, 2, 1307);

      const terrace = (Math.floor(strata * 5) / 5) * 0.3 + strata * 0.7;
      const base = 36 + terrace * 24 + (cleft - 0.5) * 12 + (grit - 0.5) * 10;

      const r = base * 1.03;
      const g = base * 1.0;
      const b = base * 0.99;

      const height = Math.min(1, Math.max(0, terrace * 0.58 + cleft * 0.24 + grit * 0.18));
      const mica = grit > 0.77 ? 0.24 : 0;
      const rough = Math.min(0.94, Math.max(0.42, 0.72 + (1 - terrace) * 0.2 - mica));

      return [r, g, b, height, rough];
    },
    2,
    2
  );

  pbrCache.set(key, set);
  return set;
}

// ---------------------------------------------------------------------------
// 7. Warm Woven Linen Fabric (512x512 + Sobel normalMap)
// ---------------------------------------------------------------------------

export function getLinenTextures(): PbrTextureSet {
  const key = 'linen';
  const cached = pbrCache.get(key);
  if (cached) return cached;

  const { set } = createPixelPbrSet(
    512,
    2.6,
    (u, v) => {
      const threads = 40;
      const warpPhase = Math.sin(u * threads * Math.PI * 2);
      const weftPhase = Math.sin(v * threads * Math.PI * 2);

      const slubU = tileableNoise2D(u * 6, v * 40, 40, 1423);
      const slubV = tileableNoise2D(u * 40, v * 6, 40, 1489);
      const fabricTone = tileableFbm(u, v, 4, 3, 1543);

      const warp = (0.5 + 0.5 * warpPhase) * (0.78 + slubU * 0.35);
      const weft = (0.5 + 0.5 * weftPhase) * (0.78 + slubV * 0.35);
      const weave = Math.max(warp, weft) * 0.72 + (warp + weft) * 0.14;

      const shade = 0.88 + weave * 0.14 + (fabricTone - 0.5) * 0.06;
      const r = 240 * shade;
      const g = 232 * shade;
      const b = 216 * shade;

      const height = Math.min(1, Math.max(0, weave * 0.85 + (fabricTone - 0.5) * 0.15));
      const rough = Math.min(0.96, Math.max(0.74, 0.88 - weave * 0.1));

      return [r, g, b, height, rough];
    },
    3,
    3
  );

  pbrCache.set(key, set);
  return set;
}

// ---------------------------------------------------------------------------
// 8. Generic Tileable Organic Noise Bump & RGB Normal Maps
// ---------------------------------------------------------------------------

export function getOrganicNoiseBump(seed = 42, scale = 8): THREE.CanvasTexture {
  const key = `${seed}:${scale}`;
  const cached = noiseBumpCache.get(key);
  if (cached) return cached;

  if (typeof document === 'undefined') {
    const fb = createFallbackTexture(false);
    noiseBumpCache.set(key, fb);
    return fb;
  }

  const size = 256;
  const [canvas, ctx] = makeCanvas(size);
  const img = ctx.createImageData(size, size);
  const data = img.data;
  const baseFreq = Math.max(2, Math.round(scale));

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const n = tileableFbm(u, v, baseFreq, 4, seed);
      const val = clampByte(n * 255);
      const idx = (y * size + x) * 4;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = finalizeTexture(canvas, false, 1, 1);
  noiseBumpCache.set(key, tex);
  return tex;
}

export function getOrganicNormalMap(
  seed = 42,
  scale = 8,
  strength = 2.4
): THREE.CanvasTexture {
  const key = `${seed}:${scale}:${strength}`;
  const cached = noiseNormalCache.get(key);
  if (cached) return cached;

  if (typeof document === 'undefined') {
    const fb = createFallbackTexture(false);
    noiseNormalCache.set(key, fb);
    return fb;
  }

  const size = 512;
  const field = new Float32Array(size * size);
  const baseFreq = Math.max(2, Math.round(scale));

  for (let y = 0; y < size; y++) {
    const v = y / size;
    const row = y * size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      field[row + x] = tileableFbm(u, v, baseFreq, 4, seed);
    }
  }

  const tex = heightDataToNormalTexture(field, size, strength, 1, 1);
  noiseNormalCache.set(key, tex);
  return tex;
}

// ---------------------------------------------------------------------------
// 9. Real PBR Studio-Reflecting Broth (MeshPhysicalMaterial + onBeforeCompile)
// ---------------------------------------------------------------------------

const PBR_BROTH_FRAG_HELPERS = /* glsl */ `
uniform float uTime;
uniform float uHighlight;
uniform vec3 uBrothBaseColor;
uniform vec3 uBrothOilColor;
uniform vec3 uBrothSheenColor;
uniform float uIsSpicy;

varying vec3 vBrothWorldPos;

float brothHash21( vec2 p ) {
  p = fract( p * vec2( 123.34, 456.21 ) );
  p += dot( p, p + 45.32 );
  return fract( p.x * p.y );
}

float brothNoise( vec2 p ) {
  vec2 i = floor( p );
  vec2 f = fract( p );
  f = f * f * ( 3.0 - 2.0 * f );
  float a = brothHash21( i );
  float b = brothHash21( i + vec2( 1.0, 0.0 ) );
  float c = brothHash21( i + vec2( 0.0, 1.0 ) );
  float d = brothHash21( i + vec2( 1.0, 1.0 ) );
  return mix( mix( a, b, f.x ), mix( c, d, f.x ), f.y );
}

float brothFbm( vec2 p ) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2( 0.8, 0.6, -0.6, 0.8 );
  for ( int i = 0; i < 4; i ++ ) {
    v += a * brothNoise( p );
    p = rot * p * 2.03;
    a *= 0.5;
  }
  return v;
}

float brothOilDroplets( vec2 p, float t ) {
  vec2 n = floor( p );
  vec2 f = fract( p );
  float minDist = 1.0;
  for ( int j = -1; j <= 1; j ++ ) {
    for ( int i = -1; i <= 1; i ++ ) {
      vec2 g = vec2( float( i ), float( j ) );
      float rnd = brothHash21( n + g );
      vec2 o = vec2(
        0.5 + 0.36 * sin( t * 0.45 + rnd * 6.2831 ),
        0.5 + 0.36 * cos( t * 0.38 + rnd * 12.566 )
      );
      vec2 r = g + o - f;
      float d = length( r ) / mix( 0.55, 1.15, rnd );
      minDist = min( minDist, d );
    }
  }
  return 1.0 - smoothstep( 0.17, 0.43, minDist );
}
`;

export function createPbrBrothMaterial(options: BrothShaderOptions): AnimatedBrothMaterial {
  const opacity = options.opacity ?? 0.9;
  const isSpicy = options.isSpicy ?? false;
  const transparent = opacity < 0.99;

  const uTime = { value: 0 };
  const uHighlight = { value: 0 };
  const uBrothBaseColor = { value: new THREE.Color(options.baseColor) };
  const uBrothOilColor = { value: new THREE.Color(options.oilColor) };
  const uBrothSheenColor = { value: new THREE.Color(options.sheenColor ?? '#FFF4D8') };
  const uIsSpicy = { value: isSpicy ? 1.0 : 0.0 };

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(options.baseColor),
    roughness: 0.14,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    reflectivity: 0.9,
    ior: 1.38,
    transparent,
    opacity,
    depthWrite: opacity >= 0.95,
    side: THREE.DoubleSide,
  }) as AnimatedBrothMaterial;

  material.userData = {
    uTime,
    uHighlight,
  };

  material.customProgramCacheKey = () =>
    `pbr-broth-v3-${isSpicy ? 'spicy' : 'mild'}-${transparent ? 'trans' : 'opaque'}`;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.uniforms.uHighlight = uHighlight;
    shader.uniforms.uBrothBaseColor = uBrothBaseColor;
    shader.uniforms.uBrothOilColor = uBrothOilColor;
    shader.uniforms.uBrothSheenColor = uBrothSheenColor;
    shader.uniforms.uIsSpicy = uIsSpicy;

    // --- Vertex Shader: world-XZ simmering displacement + vBrothWorldPos ---
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        uniform float uTime;
        uniform float uIsSpicy;
        varying vec3 vBrothWorldPos;
        `
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `
        #include <begin_vertex>
        vec4 brothBaseWorld = modelMatrix * vec4( transformed, 1.0 );
        float brothRadial = length( brothBaseWorld.xz );
        float brothEdgeDamp = 1.0 - smoothstep( 0.65, 1.35, brothRadial );
        float brothSpeed = mix( 1.35, 2.2, uIsSpicy );
        float brothAmp = mix( 0.0038, 0.0068, uIsSpicy ) * brothEdgeDamp;
        float brothWave = sin( brothBaseWorld.x * 7.5 + uTime * brothSpeed )
                        * cos( brothBaseWorld.z * 6.8 - uTime * brothSpeed * 0.85 )
                        + sin( ( brothBaseWorld.x - brothBaseWorld.z ) * 11.0 - uTime * brothSpeed * 1.35 ) * 0.5;
        transformed += objectNormal * ( brothWave * brothAmp );
        vBrothWorldPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
        `
      );

    // --- Fragment Shader: convective color, variable oil roughness & rippled PBR normals ---
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        ${PBR_BROTH_FRAG_HELPERS}
        `
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `
        #include <color_fragment>
        vec2 brothP = vBrothWorldPos.xz * 2.35;
        float brothT = uTime * mix( 0.28, 0.48, uIsSpicy );
        vec2 brothWarp = vec2(
          brothFbm( brothP * 1.15 + vec2( brothT * 0.6, -brothT * 0.4 ) ),
          brothFbm( brothP * 1.15 + vec2( -brothT * 0.5, brothT * 0.7 ) + 4.3 )
        );
        float brothConvection = brothFbm( brothP * 1.8 + brothWarp * 1.45 - vec2( 0.0, brothT * 0.35 ) );

        float brothOilScale = mix( 1.45, 1.85, uIsSpicy );
        float brothBigOil = brothOilDroplets( brothP * brothOilScale + brothWarp * 0.65, uTime );
        float brothFineOil = brothOilDroplets( brothP * 3.6 - brothWarp * 0.5 + vec2( 2.7, -1.9 ), uTime * 1.15 );
        float brothOilMask = smoothstep( 0.22, 0.78, clamp( brothBigOil * 0.85 + brothFineOil * 0.55, 0.0, 1.0 ) );

        float brothRad = clamp( length( vBrothWorldPos.xz ) * 0.85, 0.0, 1.0 );
        vec3 brothDeep = uBrothBaseColor * mix( 0.66, 1.14, brothConvection * 0.72 + brothRad * 0.28 );
        vec3 brothCol = mix( brothDeep, uBrothOilColor, brothOilMask * mix( 0.56, 0.80, uIsSpicy ) );

        if ( uIsSpicy > 0.5 ) {
          float chiliSpark = smoothstep( 0.76, 0.92, brothNoise( brothP * 11.0 + brothWarp * 2.2 ) );
          brothCol = mix( brothCol, uBrothOilColor * 1.32, chiliSpark * 0.34 );
        }

        float brothMeniscus = smoothstep( 0.78, 1.0, brothRad ) * 0.14;
        brothCol += uBrothSheenColor * brothMeniscus;
        brothCol = mix( brothCol, brothCol * 1.18 + uBrothSheenColor * 0.08, clamp( uHighlight, 0.0, 1.0 ) );

        diffuseColor.rgb = brothCol;
        diffuseColor.a = clamp( diffuseColor.a + brothOilMask * 0.07, 0.0, 1.0 );
        `
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `
        #include <roughnessmap_fragment>
        roughnessFactor = mix( 0.15, 0.035, brothOilMask );
        `
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `
        #include <normal_fragment_maps>
        float brothEps = 0.06;
        float brothH0 = brothConvection * 0.45 + brothOilMask * 0.55;
        float brothHx = brothFbm( ( brothP + vec2( brothEps, 0.0 ) ) * 1.8 + brothWarp * 1.45 - vec2( 0.0, brothT * 0.35 ) ) * 0.45
                      + brothOilDroplets( ( brothP + vec2( brothEps, 0.0 ) ) * brothOilScale + brothWarp * 0.65, uTime ) * 0.55;
        float brothHz = brothFbm( ( brothP + vec2( 0.0, brothEps ) ) * 1.8 + brothWarp * 1.45 - vec2( 0.0, brothT * 0.35 ) ) * 0.45
                      + brothOilDroplets( ( brothP + vec2( 0.0, brothEps ) ) * brothOilScale + brothWarp * 0.65, uTime ) * 0.55;
        vec3 brothPerturbWorld = vec3( ( brothH0 - brothHx ) * 0.85, 0.0, ( brothH0 - brothHz ) * 0.85 );
        vec3 brothPerturbView = ( viewMatrix * vec4( brothPerturbWorld, 0.0 ) ).xyz;
        normal = normalize( normal + brothPerturbView * 0.48 );
        `
      )
      .replace(
        '#include <clearcoat_normal_fragment_maps>',
        /* glsl */ `
        #include <clearcoat_normal_fragment_maps>
        #ifdef USE_CLEARCOAT
          clearcoatNormal = normalize( clearcoatNormal + brothPerturbView * 0.34 );
        #endif
        `
      );
  };

  return material;
}

export function updateBrothMaterial(
  mat: AnimatedBrothMaterial,
  elapsedTime: number,
  highlighted = false
): void {
  if (!mat?.userData?.uTime) return;
  mat.userData.uTime.value = elapsedTime;
  if (mat.userData.uHighlight) {
    const target = highlighted ? 1 : 0;
    mat.userData.uHighlight.value += (target - mat.userData.uHighlight.value) * 0.14;
  }
}

// Backwards-compatible v2 ShaderMaterial export (preserved so existing imports never break)
const LEGACY_BROTH_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uIsSpicy;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  void main() {
    vec4 baseWorld = modelMatrix * vec4(position, 1.0);
    float edgeDamp = 1.0 - smoothstep(0.65, 1.35, length(baseWorld.xz));
    float speed = mix(1.35, 2.2, uIsSpicy);
    float amp = mix(0.004, 0.007, uIsSpicy) * edgeDamp;
    float w = sin(baseWorld.x * 7.5 + uTime * speed) * cos(baseWorld.z * 6.8 - uTime * speed * 0.85);
    vec4 worldPosition = modelMatrix * vec4(position + normal * (w * amp), 1.0);
    vWorldPos = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const LEGACY_BROTH_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec3 uBaseColor;
  uniform vec3 uOilColor;
  uniform vec3 uSheenColor;
  uniform float uIsSpicy;
  uniform float uOpacity;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y); }
  void main() {
    vec2 p = vWorldPos.xz * 2.4;
    float n = noise(p * 2.2 + vec2(uTime * 0.25, -uTime * 0.2));
    vec3 col = mix(uBaseColor * 0.85, uOilColor, smoothstep(0.45, 0.78, n) * 0.65);
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    gl_FragColor = vec4(col + uSheenColor * fresnel * 0.35, uOpacity);
  }
`;

export function createBrothShaderMaterial(options: BrothShaderOptions): THREE.ShaderMaterial {
  const opacity = options.opacity ?? 0.9;
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBaseColor: { value: new THREE.Color(options.baseColor) },
      uOilColor: { value: new THREE.Color(options.oilColor) },
      uSheenColor: { value: new THREE.Color(options.sheenColor ?? '#FFF4D8') },
      uIsSpicy: { value: options.isSpicy ? 1.0 : 0.0 },
      uOpacity: { value: opacity },
    },
    vertexShader: LEGACY_BROTH_VERTEX_SHADER,
    fragmentShader: LEGACY_BROTH_FRAGMENT_SHADER,
    transparent: opacity < 0.99,
    depthWrite: opacity >= 0.95,
    side: THREE.DoubleSide,
  });
}

// ---------------------------------------------------------------------------
// 10. Real Food Subsurface Scattering (wrap-diffuse + backlit translucency)
// ---------------------------------------------------------------------------

export function applyFoodSSS<
  T extends THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
>(material: T, options: FoodSSSOptions): T {
  const sssColor = new THREE.Color(options.color);
  const intensity = options.intensity ?? 0.42;
  const power = options.power ?? 2.6;
  const scale = options.scale ?? 1.15;

  const prevOnBeforeCompile = material.onBeforeCompile;
  const prevCacheKey = material.customProgramCacheKey?.bind(material);
  const sssKey = `food-sss-${options.color}-${intensity.toFixed(2)}-${power.toFixed(2)}-${scale.toFixed(2)}`;

  material.customProgramCacheKey = () => {
    const base = prevCacheKey ? prevCacheKey() : '';
    return base ? `${base}|${sssKey}` : sssKey;
  };

  material.onBeforeCompile = (shader, renderer) => {
    if (prevOnBeforeCompile) {
      prevOnBeforeCompile.call(material, shader, renderer);
    }

    shader.uniforms.uSssColor = { value: sssColor };
    shader.uniforms.uSssIntensity = { value: intensity };
    shader.uniforms.uSssPower = { value: power };
    shader.uniforms.uSssScale = { value: scale };

    if (!shader.fragmentShader.includes('uniform vec3 uSssColor;')) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        uniform vec3 uSssColor;
        uniform float uSssIntensity;
        uniform float uSssPower;
        uniform float uSssScale;
        `
      );
    }

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      /* glsl */ `
      #include <lights_fragment_end>
      {
        // Transform studio key & back-rim light directions into view space
        vec3 sssKeyDir = normalize( ( viewMatrix * vec4( 3.8, 6.2, 2.2, 0.0 ) ).xyz );
        vec3 sssBackDir = normalize( ( viewMatrix * vec4( -3.2, 3.6, -3.8, 0.0 ) ).xyz );

        // Soft wrap-diffuse illumination around food silhouette
        float sssWrap = clamp( ( dot( geometryNormal, sssKeyDir ) + 0.55 ) / 1.55, 0.0, 1.0 );

        // View-dependent backlit scatter (GDC fast subsurface approximation)
        vec3 sssBackHalf = normalize( sssBackDir + geometryNormal * 0.45 );
        float sssBackScatter = pow( clamp( dot( geometryViewDir, -sssBackHalf ), 0.0, 1.0 ), uSssPower ) * uSssScale;

        // Grazing Fresnel edge thickness glow
        float sssEdge = pow( 1.0 - clamp( dot( geometryNormal, geometryViewDir ), 0.0, 1.0 ), 2.2 ) * 0.42;

        reflectedLight.directDiffuse += uSssColor * ( sssWrap * 0.34 + sssBackScatter + sssEdge * ( 0.35 + 0.65 * sssWrap ) ) * uSssIntensity;
      }
      `
    );
  };

  material.needsUpdate = true;
  return material;
}

// ---------------------------------------------------------------------------
// 11. Phase 2 Geometry Sculpting & Wetness Helpers
// ---------------------------------------------------------------------------

/**
 * Applies deterministic 3D multi-octave organic displacement to a BufferGeometry
 * with watertight seam preservation and optional bottom flattening.
 */
export function displaceGeometryOrganic(
  geometry: THREE.BufferGeometry,
  options: DisplaceOrganicOptions
): THREE.BufferGeometry {
  const {
    amplitude,
    frequency,
    seed = 77,
    flattenBottomY,
    preserveSeam = true,
  } = options;

  const posAttr = geometry.attributes.position;
  if (!posAttr) return geometry;

  if (!geometry.attributes.normal) {
    geometry.computeVertexNormals();
  }
  const normAttr = geometry.attributes.normal;
  const count = posAttr.count;

  // Average normals across coincident seam vertices so UV/Lathe seams stay watertight
  const averagedNormals = new Float32Array(count * 3);
  if (preserveSeam && normAttr) {
    const accum = new Map<string, [number, number, number]>();
    const keys: string[] = new Array(count);

    for (let i = 0; i < count; i++) {
      const k = `${Math.round(posAttr.getX(i) * 10000)}_${Math.round(posAttr.getY(i) * 10000)}_${Math.round(posAttr.getZ(i) * 10000)}`;
      keys[i] = k;
      const nx = normAttr.getX(i);
      const ny = normAttr.getY(i);
      const nz = normAttr.getZ(i);
      const existing = accum.get(k);
      if (existing) {
        existing[0] += nx;
        existing[1] += ny;
        existing[2] += nz;
      } else {
        accum.set(k, [nx, ny, nz]);
      }
    }

    for (let i = 0; i < count; i++) {
      const sum = accum.get(keys[i]);
      if (sum) {
        const len = Math.hypot(sum[0], sum[1], sum[2]) || 1;
        averagedNormals[i * 3] = sum[0] / len;
        averagedNormals[i * 3 + 1] = sum[1] / len;
        averagedNormals[i * 3 + 2] = sum[2] / len;
      }
    }
  } else if (normAttr) {
    for (let i = 0; i < count; i++) {
      averagedNormals[i * 3] = normAttr.getX(i);
      averagedNormals[i * 3 + 1] = normAttr.getY(i);
      averagedNormals[i * 3 + 2] = normAttr.getZ(i);
    }
  }

  for (let i = 0; i < count; i++) {
    const px = posAttr.getX(i);
    const py = posAttr.getY(i);
    const pz = posAttr.getZ(i);

    let factor = 1;
    if (flattenBottomY !== undefined) {
      const distAboveBottom = py - flattenBottomY;
      factor = smoothstep01(distAboveBottom / Math.max(0.08, Math.abs(amplitude) * 4));
    }

    const n = fbm3D(px * frequency, py * frequency, pz * frequency, 3, seed);
    const disp = n * amplitude * factor;

    const nx = averagedNormals[i * 3];
    const ny = averagedNormals[i * 3 + 1];
    const nz = averagedNormals[i * 3 + 2];

    let nextY = py + ny * disp;
    if (flattenBottomY !== undefined && nextY < flattenBottomY) {
      nextY = flattenBottomY;
    }

    posAttr.setXYZ(i, px + nx * disp, nextY, pz + nz * disp);
  }

  posAttr.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Adds a smooth vertical vertex-color gradient darkening solid geometry where
 * it meets broth or sauce (set `vertexColors: true` on the target material).
 */
export function applyWetnessVertexColors(
  geometry: THREE.BufferGeometry,
  options: WetnessVertexColorOptions
): THREE.BufferGeometry {
  const { wetY, bandHeight, dryColor, wetColor } = options;
  const posAttr = geometry.attributes.position;
  if (!posAttr) return geometry;

  const dryC = new THREE.Color(dryColor);
  const wetC = new THREE.Color(wetColor);
  const blended = new THREE.Color();

  const count = posAttr.count;
  const colors = new Float32Array(count * 3);
  const safeBand = Math.max(1e-4, bandHeight);

  for (let i = 0; i < count; i++) {
    const y = posAttr.getY(i);
    const t = smoothstep01((y - wetY) / safeBand);
    blended.lerpColors(wetC, dryC, t);
    colors[i * 3] = blended.r;
    colors[i * 3 + 1] = blended.g;
    colors[i * 3 + 2] = blended.b;
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

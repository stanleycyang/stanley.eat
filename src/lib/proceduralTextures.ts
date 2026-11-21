'use client';

import * as THREE from 'three';

export interface PbrTextureSet {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

export interface BrothShaderOptions {
  baseColor: string;
  oilColor: string;
  sheenColor?: string;
  isSpicy?: boolean;
  opacity?: number;
}

// ---------------------------------------------------------------------------
// Deterministic PRNG & seamless 2D noise helpers
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

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Seamless tileable 2D value noise in [0, 1] with period `period`. */
function tileableNoise2D(x: number, y: number, period: number, seed: number): number {
  const p = Math.max(1, Math.round(period));
  const fx = ((x % p) + p) % p;
  const fy = ((y % p) + p) % p;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = (x0 + 1) % p;
  const y1 = (y0 + 1) % p;
  const tx = smoothstep(fx - x0);
  const ty = smoothstep(fy - y0);

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

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

// ---------------------------------------------------------------------------
// CanvasTexture factory & cache (SSR-safe)
// ---------------------------------------------------------------------------

const pbrCache = new Map<string, PbrTextureSet>();
const riceCache: { value?: { bumpMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } } = {};
const noiseBumpCache = new Map<string, THREE.CanvasTexture>();

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

function createPixelPbrSet(
  size: number,
  pixelFn: (
    u: number,
    v: number,
    x: number,
    y: number
  ) => [r: number, g: number, b: number, bump: number, rough: number],
  repeatX = 1,
  repeatY = 1
): PbrTextureSet {
  if (typeof document === 'undefined') {
    return {
      map: createFallbackTexture(true),
      bumpMap: createFallbackTexture(false),
      roughnessMap: createFallbackTexture(false),
    };
  }

  const [colorCanvas, colorCtx] = makeCanvas(size);
  const [bumpCanvas, bumpCtx] = makeCanvas(size);
  const [roughCanvas, roughCtx] = makeCanvas(size);

  const colorImg = colorCtx.createImageData(size, size);
  const bumpImg = bumpCtx.createImageData(size, size);
  const roughImg = roughCtx.createImageData(size, size);

  const cData = colorImg.data;
  const bData = bumpImg.data;
  const rData = roughImg.data;

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const [r, g, b, bump, rough] = pixelFn(u, v, x, y);
      const idx = (y * size + x) * 4;

      cData[idx] = clampByte(r);
      cData[idx + 1] = clampByte(g);
      cData[idx + 2] = clampByte(b);
      cData[idx + 3] = 255;

      const bVal = clampByte(bump * 255);
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
    map: finalizeTexture(colorCanvas, true, repeatX, repeatY),
    bumpMap: finalizeTexture(bumpCanvas, false, repeatX, repeatY),
    roughnessMap: finalizeTexture(roughCanvas, false, repeatX, repeatY),
  };
}

// ---------------------------------------------------------------------------
// 1. Stoneware Ceramic (matte speckled artisanal glaze)
// ---------------------------------------------------------------------------

export function getStonewareTextures(): PbrTextureSet {
  const key = 'stoneware';
  const cached = pbrCache.get(key);
  if (cached) return cached;

  const size = 256;
  if (typeof document === 'undefined') {
    const fb = {
      map: createFallbackTexture(true),
      bumpMap: createFallbackTexture(false),
      roughnessMap: createFallbackTexture(false),
    };
    pbrCache.set(key, fb);
    return fb;
  }

  const set = createPixelPbrSet(
    size,
    (u, v) => {
      // Subtle wheel-thrown horizontal bands + fine glaze grain
      const throwBand = Math.sin(v * Math.PI * 26) * 0.5 + 0.5;
      const glazeVar = tileableFbm(u, v, 5, 4, 101);
      const microGrain = tileableFbm(u, v, 24, 2, 203);

      const baseR = 238 + (glazeVar - 0.5) * 16 + (throwBand - 0.5) * 4;
      const baseG = 231 + (glazeVar - 0.5) * 15 + (throwBand - 0.5) * 4;
      const baseB = 219 + (glazeVar - 0.5) * 14 + (throwBand - 0.5) * 3;

      const bump = 0.5 + (throwBand - 0.5) * 0.14 + (microGrain - 0.5) * 0.28;
      const rough = 0.44 + (1 - glazeVar) * 0.22 + (microGrain - 0.5) * 0.08;

      return [baseR, baseG, baseB, bump, rough];
    },
    2,
    2
  );

  // Add scattered artisanal iron-oxide stoneware speckles onto the canvases
  const colorCanvas = set.map.image as HTMLCanvasElement;
  const bumpCanvas = set.bumpMap.image as HTMLCanvasElement;
  const roughCanvas = set.roughnessMap.image as HTMLCanvasElement;
  const cCtx = colorCanvas.getContext('2d');
  const bCtx = bumpCanvas.getContext('2d');
  const rCtx = roughCanvas.getContext('2d');

  if (cCtx && bCtx && rCtx) {
    const rand = mulberry32(8421);
    for (let i = 0; i < 420; i++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const rad = 0.5 + rand() * 1.45;
      const dark = rand() > 0.35;
      cCtx.fillStyle = dark
        ? `rgba(88, 68, 52, ${0.22 + rand() * 0.42})`
        : `rgba(155, 132, 108, ${0.2 + rand() * 0.3})`;
      bCtx.fillStyle = `rgba(92, 92, 92, ${0.28 + rand() * 0.35})`;
      rCtx.fillStyle = `rgba(215, 215, 215, ${0.35 + rand() * 0.35})`;

      // Wrap speckles across edges for seamless tiling
      for (const ox of [-size, 0, size]) {
        for (const oy of [-size, 0, size]) {
          const px = cx + ox;
          const py = cy + oy;
          if (px < -4 || px > size + 4 || py < -4 || py > size + 4) continue;
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
  }

  pbrCache.set(key, set);
  return set;
}

// ---------------------------------------------------------------------------
// 2. Rice Grain Textures (micro oval stippling bump + glistening roughness)
// ---------------------------------------------------------------------------

export function getRiceGrainTextures(): {
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  if (riceCache.value) return riceCache.value;

  if (typeof document === 'undefined') {
    riceCache.value = {
      bumpMap: createFallbackTexture(false),
      roughnessMap: createFallbackTexture(false),
    };
    return riceCache.value;
  }

  const size = 256;
  const [bumpCanvas, bCtx] = makeCanvas(size);
  const [roughCanvas, rCtx] = makeCanvas(size);

  // Dark crevices in bump, matte crevices in roughness
  bCtx.fillStyle = '#242424';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#B8B8B8';
  rCtx.fillRect(0, 0, size, size);

  const rand = mulberry32(4919);
  const grainCount = 920;

  for (let i = 0; i < grainCount; i++) {
    const gx = rand() * size;
    const gy = rand() * size;
    const rx = 4.6 + rand() * 3.1;
    const ry = 2.0 + rand() * 1.25;
    const angle = rand() * Math.PI;
    const peak = 210 + Math.floor(rand() * 45);
    const roughCrown = 48 + Math.floor(rand() * 42); // glossy steamed starch crown

    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        const px = gx + ox;
        const py = gy + oy;
        if (px < -12 || px > size + 12 || py < -12 || py > size + 12) continue;

        // Soft pillowy bump dome per rice grain
        bCtx.save();
        bCtx.translate(px, py);
        bCtx.rotate(angle);
        bCtx.scale(1, ry / rx);
        const grad = bCtx.createRadialGradient(-rx * 0.12, -rx * 0.08, rx * 0.08, 0, 0, rx);
        grad.addColorStop(0, `rgb(${peak},${peak},${peak})`);
        grad.addColorStop(0.62, `rgb(${Math.round(peak * 0.78)},${Math.round(peak * 0.78)},${Math.round(peak * 0.78)})`);
        grad.addColorStop(1, 'rgba(30,30,30,0)');
        bCtx.fillStyle = grad;
        bCtx.beginPath();
        bCtx.arc(0, 0, rx, 0, Math.PI * 2);
        bCtx.fill();
        bCtx.restore();

        // Matching glossy crown roughness
        rCtx.save();
        rCtx.translate(px, py);
        rCtx.rotate(angle);
        rCtx.scale(1, ry / rx);
        const rGrad = rCtx.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
        rGrad.addColorStop(0, `rgb(${roughCrown},${roughCrown},${roughCrown})`);
        rGrad.addColorStop(0.7, 'rgb(115,115,115)');
        rGrad.addColorStop(1, 'rgba(184,184,184,0)');
        rCtx.fillStyle = rGrad;
        rCtx.beginPath();
        rCtx.arc(0, 0, rx, 0, Math.PI * 2);
        rCtx.fill();
        rCtx.restore();
      }
    }
  }

  riceCache.value = {
    bumpMap: finalizeTexture(bumpCanvas, false, 3, 3),
    roughnessMap: finalizeTexture(roughCanvas, false, 3, 3),
  };
  return riceCache.value;
}

// ---------------------------------------------------------------------------
// 3. Crispy Panko Crust / Blistered Baked Dough
// ---------------------------------------------------------------------------

export function getPankoCrustTextures(): PbrTextureSet {
  const key = 'panko-crust';
  const cached = pbrCache.get(key);
  if (cached) return cached;

  const set = createPixelPbrSet(
    256,
    (u, v) => {
      const coarse = tileableFbm(u, v, 8, 3, 311);
      const crunch = tileableFbm(u, v, 24, 3, 419);
      const pores = tileableFbm(u, v, 48, 2, 521);

      // Sharp jagged flake ridges
      const ridge = Math.abs(crunch - 0.5) * 2;
      const goldenMix = Math.min(1, Math.max(0, coarse * 0.55 + crunch * 0.45));
      const toastSpot = pores < 0.24 ? (0.24 - pores) * 2.4 : 0;

      const r = 186 + goldenMix * 56 - toastSpot * 82;
      const g = 114 + goldenMix * 58 - toastSpot * 62;
      const b = 42 + goldenMix * 38 - toastSpot * 28;

      const bump = Math.min(1, Math.max(0, 0.25 + ridge * 0.55 + pores * 0.35 - toastSpot * 0.35));
      // Crispy high-roughness flakes with occasional tiny glistening oil pores
      const oilGlint = pores > 0.78 ? 0.34 : 0;
      const rough = Math.min(0.95, Math.max(0.28, 0.76 + (1 - ridge) * 0.16 - oilGlint));

      return [r, g, b, bump, rough];
    },
    3,
    3
  );

  pbrCache.set(key, set);
  return set;
}

// ---------------------------------------------------------------------------
// 4. Wood Grain Textures (Hinoki, Cedar, Walnut)
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

  const set = createPixelPbrSet(
    256,
    (u, v) => {
      // Undulating longitudinal growth rings along U, compressed along V
      const warp = tileableFbm(u, v, 3, 3, pal.seed) * 1.45;
      const ringPhase = (v * 9.5 + warp) * Math.PI * 2;
      const ring = Math.pow(0.5 + 0.5 * Math.sin(ringPhase), 1.45);
      const fineFiber = tileableFbm(u * 1, v * 4, 16, 2, pal.seed + 37);
      const streak = tileableNoise2D(u * 8, v * 48, 48, pal.seed + 83);

      const mix = Math.min(1, Math.max(0, ring * 0.68 + fineFiber * 0.22 + streak * 0.1));
      const r = pal.dark[0] + (pal.light[0] - pal.dark[0]) * mix;
      const g = pal.dark[1] + (pal.light[1] - pal.dark[1]) * mix;
      const b = pal.dark[2] + (pal.light[2] - pal.dark[2]) * mix;

      const bump = 0.45 + (ring - 0.5) * 0.26 + (streak - 0.5) * 0.22;
      const rough = Math.min(0.86, Math.max(0.32, pal.baseRough + (1 - ring) * 0.18 + (streak - 0.5) * 0.08));

      return [r, g, b, bump, rough];
    },
    1,
    1
  );

  pbrCache.set(key, set);
  return set;
}

// ---------------------------------------------------------------------------
// 5. Woven Bamboo Slats
// ---------------------------------------------------------------------------

export function getBambooWeaveTextures(): PbrTextureSet {
  const key = 'bamboo-weave';
  const cached = pbrCache.get(key);
  if (cached) return cached;

  const set = createPixelPbrSet(
    256,
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

      // Soft arched profile across strip width + gentle weave dive at intersections
      const acrossProfile = Math.sin(across * Math.PI);
      const alongArch = 0.72 + 0.28 * Math.sin(along * Math.PI);
      const seamGap = across < 0.06 || across > 0.94 ? 0.35 : 1.0;

      // Fine longitudinal bamboo vascular fibers
      const fiber = tileableNoise2D(
        (isHorizontal ? u : v) * 8,
        (isHorizontal ? v : u) * 64,
        64,
        929
      );
      const tintNoise = hash2D(ix, iy, 953);

      const height = Math.pow(Math.max(0, acrossProfile), 0.55) * alongArch * seamGap;
      const shade = 0.62 + height * 0.38;

      const r = (212 + (tintNoise - 0.5) * 26 + (fiber - 0.5) * 14) * shade;
      const g = (176 + (tintNoise - 0.5) * 22 + (fiber - 0.5) * 12) * shade;
      const b = (114 + (tintNoise - 0.5) * 18 + (fiber - 0.5) * 10) * shade;

      const bump = Math.min(1, Math.max(0, height * 0.85 + (fiber - 0.5) * 0.15));
      // Natural waxy bamboo epidermis on crowns, matte inside weave seams
      const rough = Math.min(0.92, Math.max(0.36, 0.84 - height * 0.4 + (fiber - 0.5) * 0.08));

      return [r, g, b, bump, rough];
    },
    2,
    2
  );

  pbrCache.set(key, set);
  return set;
}

// ---------------------------------------------------------------------------
// 6. Dark Slate / Hand-Thrown Dark Stoneware Clay
// ---------------------------------------------------------------------------

export function getSlateTextures(): PbrTextureSet {
  const key = 'slate';
  const cached = pbrCache.get(key);
  if (cached) return cached;

  const set = createPixelPbrSet(
    256,
    (u, v) => {
      const strata = tileableFbm(u, v * 2.0, 5, 4, 1103);
      const cleft = tileableFbm(u * 2.0, v, 10, 3, 1217);
      const grit = tileableFbm(u, v, 32, 2, 1307);

      // Stepped natural mineral fracture feel
      const terrace = Math.floor(strata * 5) / 5 * 0.3 + strata * 0.7;
      const base = 36 + terrace * 24 + (cleft - 0.5) * 12 + (grit - 0.5) * 10;

      const r = base * 1.03;
      const g = base * 1.0;
      const b = base * 0.99;

      const bump = Math.min(1, Math.max(0, terrace * 0.58 + cleft * 0.24 + grit * 0.18));
      // Subtle mineral mica sheen flecks amidst matte dark slate
      const mica = grit > 0.77 ? 0.24 : 0;
      const rough = Math.min(0.94, Math.max(0.42, 0.72 + (1 - terrace) * 0.2 - mica));

      return [r, g, b, bump, rough];
    },
    2,
    2
  );

  pbrCache.set(key, set);
  return set;
}

// ---------------------------------------------------------------------------
// 7. Warm Woven Linen Fabric
// ---------------------------------------------------------------------------

export function getLinenTextures(): PbrTextureSet {
  const key = 'linen';
  const cached = pbrCache.get(key);
  if (cached) return cached;

  const set = createPixelPbrSet(
    256,
    (u, v) => {
      const threads = 32;
      const warpPhase = Math.sin(u * threads * Math.PI * 2);
      const weftPhase = Math.sin(v * threads * Math.PI * 2);

      // Slubbed natural thread thickness variation
      const slubU = tileableNoise2D(u * 6, v * 32, 32, 1423);
      const slubV = tileableNoise2D(u * 32, v * 6, 32, 1489);
      const fabricTone = tileableFbm(u, v, 4, 3, 1543);

      const warp = (0.5 + 0.5 * warpPhase) * (0.78 + slubU * 0.35);
      const weft = (0.5 + 0.5 * weftPhase) * (0.78 + slubV * 0.35);
      const weave = Math.max(warp, weft) * 0.72 + (warp + weft) * 0.14;

      const shade = 0.88 + weave * 0.14 + (fabricTone - 0.5) * 0.06;
      const r = 240 * shade;
      const g = 232 * shade;
      const b = 216 * shade;

      const bump = Math.min(1, Math.max(0, weave * 0.85 + (fabricTone - 0.5) * 0.15));
      const rough = Math.min(0.96, Math.max(0.74, 0.88 - weave * 0.1));

      return [r, g, b, bump, rough];
    },
    3,
    3
  );

  pbrCache.set(key, set);
  return set;
}

// ---------------------------------------------------------------------------
// 8. Generic Tileable Organic Noise Bump Map
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

// ---------------------------------------------------------------------------
// 9. Custom GLSL Simmering Broth & Floating Oil Slick ShaderMaterial
// ---------------------------------------------------------------------------

const BROTH_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uIsSpicy;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  void main() {
    vUv = uv;

    // Compute world XZ first so ripples work cleanly for Cylinder, Circle, and rotated ExtrudeGeometry
    vec4 baseWorld = modelMatrix * vec4(position, 1.0);
    float radial = length(baseWorld.xz);
    float edgeDamp = 1.0 - smoothstep(0.65, 1.35, radial);
    float speed = mix(1.35, 2.2, uIsSpicy);
    float amp = mix(0.004, 0.007, uIsSpicy) * edgeDamp;

    float wave1 = sin(baseWorld.x * 7.5 + uTime * speed) * cos(baseWorld.z * 6.8 - uTime * speed * 0.85);
    float wave2 = sin((baseWorld.x - baseWorld.z) * 11.0 - uTime * speed * 1.35) * 0.5;
    vec3 displaced = position + normal * ((wave1 + wave2) * amp);

    vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
    vWorldPos = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const BROTH_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec3 uBaseColor;
  uniform vec3 uOilColor;
  uniform vec3 uSheenColor;
  uniform float uIsSpicy;
  uniform float uOpacity;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
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
      p = rot * p * 2.03;
      a *= 0.5;
    }
    return v;
  }

  // Cellular floating oil-droplet field (returns smooth droplet mask in [0,1])
  float oilDroplets(vec2 p, float t) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    float minDist = 1.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        float rnd = hash21(n + g);
        vec2 o = vec2(
          0.5 + 0.36 * sin(t * 0.45 + rnd * 6.2831),
          0.5 + 0.36 * cos(t * 0.38 + rnd * 12.566)
        );
        vec2 r = g + o - f;
        float d = length(r) / mix(0.55, 1.15, rnd);
        minDist = min(minDist, d);
      }
    }
    return 1.0 - smoothstep(0.18, 0.44, minDist);
  }

  void main() {
    // World XZ keeps orientation consistent across Cylinder, Circle, and rotated ExtrudeGeometry
    vec2 p = vWorldPos.xz * 2.35;
    float t = uTime * mix(0.28, 0.48, uIsSpicy);

    // Swirling convective domain warp
    vec2 warp = vec2(
      fbm(p * 1.15 + vec2(t * 0.6, -t * 0.4)),
      fbm(p * 1.15 + vec2(-t * 0.5, t * 0.7) + 4.3)
    );
    float convection = fbm(p * 1.8 + warp * 1.45 - vec2(0.0, t * 0.35));

    // Two scales of floating glossy oil slicks (marrow droplets or chili-oil pools)
    float bigOil = oilDroplets(p * mix(1.45, 1.85, uIsSpicy) + warp * 0.65, uTime);
    float fineOil = oilDroplets(p * 3.6 - warp * 0.5 + vec2(2.7, -1.9), uTime * 1.15);
    float oilMask = clamp(bigOil * 0.85 + fineOil * 0.55, 0.0, 1.0);
    oilMask = smoothstep(0.22, 0.78, oilMask);

    // Subtle simmering surface ripples & finite-difference micro-normal
    float eps = 0.06;
    float h0 = convection * 0.5 + oilMask * 0.5;
    float hx = fbm((p + vec2(eps, 0.0)) * 1.8 + warp * 1.45 - vec2(0.0, t * 0.35)) * 0.5
             + oilDroplets((p + vec2(eps, 0.0)) * mix(1.45, 1.85, uIsSpicy) + warp * 0.65, uTime) * 0.5;
    float hz = fbm((p + vec2(0.0, eps)) * 1.8 + warp * 1.45 - vec2(0.0, t * 0.35)) * 0.5
             + oilDroplets((p + vec2(0.0, eps)) * mix(1.45, 1.85, uIsSpicy) + warp * 0.65, uTime) * 0.5;

    vec3 N = normalize(vWorldNormal + vec3((h0 - hx) * 1.35, 0.0, (h0 - hz) * 1.35));
    vec3 V = normalize(cameraPosition - vWorldPos);

    // Depth shading: richer/darker broth toward bowl center, warmer amber toward meniscus
    float radial = clamp(length(vWorldPos.xz) * 0.85, 0.0, 1.0);
    vec3 deepBroth = uBaseColor * mix(0.68, 1.12, convection * 0.7 + radial * 0.3);

    // Blend floating glossy oil pools onto the broth surface
    vec3 surfaceColor = mix(deepBroth, uOilColor, oilMask * mix(0.55, 0.78, uIsSpicy));

    // Optional fiery chili-flake micro-sparks inside spicy mala/doubanjiang broths
    if (uIsSpicy > 0.5) {
      float spark = smoothstep(0.76, 0.92, noise(p * 11.0 + warp * 2.2));
      surfaceColor = mix(surfaceColor, uOilColor * 1.32, spark * 0.35);
    }

    // Studio key light + soft fill + crisp oil specular glint
    vec3 L1 = normalize(vec3(4.5, 7.5, 4.5));
    vec3 L2 = normalize(vec3(-4.0, 4.5, -3.5));
    vec3 H1 = normalize(L1 + V);
    vec3 H2 = normalize(L2 + V);

    float diff = 0.58 + 0.42 * max(dot(N, L1), 0.0);
    float specPower = mix(42.0, 110.0, oilMask);
    float spec1 = pow(max(dot(N, H1), 0.0), specPower) * mix(0.32, 0.82, oilMask);
    float spec2 = pow(max(dot(N, H2), 0.0), 36.0) * 0.18;

    // Grazing Fresnel rim sheen (iridescent liquid surface reflection)
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);

    vec3 color = surfaceColor * diff
               + uSheenColor * (spec1 + spec2)
               + mix(uOilColor, uSheenColor, 0.65) * fresnel * mix(0.28, 0.46, oilMask);

    // Subtle meniscus highlight right at outer bowl contact
    float meniscus = smoothstep(0.78, 1.0, radial) * 0.12;
    color += uSheenColor * meniscus;

    float finalAlpha = clamp(uOpacity + oilMask * 0.08 + fresnel * 0.06, 0.0, 1.0);
    gl_FragColor = vec4(color, finalAlpha);
  }
`;

export function createBrothShaderMaterial(options: BrothShaderOptions): THREE.ShaderMaterial {
  const opacity = options.opacity ?? 0.9;
  const isSpicy = options.isSpicy ?? false;

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBaseColor: { value: new THREE.Color(options.baseColor) },
      uOilColor: { value: new THREE.Color(options.oilColor) },
      uSheenColor: { value: new THREE.Color(options.sheenColor ?? '#FFF4D8') },
      uIsSpicy: { value: isSpicy ? 1.0 : 0.0 },
      uOpacity: { value: opacity },
    },
    vertexShader: BROTH_VERTEX_SHADER,
    fragmentShader: BROTH_FRAGMENT_SHADER,
    transparent: opacity < 0.99,
    depthWrite: opacity >= 0.95,
    side: THREE.DoubleSide,
  });
}

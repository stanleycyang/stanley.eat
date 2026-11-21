'use client';

import React, {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Environment,
  Lightformer,
  OrbitControls,
} from '@react-three/drei';
import { Layers, RotateCcw, RotateCw, X } from 'lucide-react';
import * as THREE from 'three';

import type { DishAtmosphere, DishId, DishPart, DishRecipe } from '@/types/dish';
import { SteamParticles } from './SteamParticles';
import { TableSurface } from './TableSurface';
import { CurryModel } from './foods/CurryModel';
import { PizzaModel } from './foods/PizzaModel';
import { SushiModel } from './foods/SushiModel';
import { PhoModel } from './foods/PhoModel';
import { HotPotModel } from './foods/HotPotModel';
import { MapoTofuModel } from './foods/MapoTofuModel';
import { DimSumModel } from './foods/DimSumModel';

export interface SceneStageProps {
  dish: DishRecipe;
  exploded: boolean;
  onToggleExplode: () => void;
  highlightedPart: string | null;
  focusedPart?: string | null;
  transitionDirection?: 1 | -1;
  onSelectPart: (partId: string | null) => void;
}

const DEFAULT_CAMERA_POSITION: [number, number, number] = [0, 3.2, 4.8];
const DEFAULT_CAMERA_TARGET: [number, number, number] = [0, 0.08, 0];

const STEAM_CONFIG: Record<DishId, { baseY: number; spread: number }> = {
  curry: { baseY: 0.18, spread: 0.65 },
  pizza: { baseY: 0.14, spread: 0.72 },
  sushi: { baseY: 0.15, spread: 0.5 },
  pho: { baseY: 0.34, spread: 0.62 },
  'hot-pot': { baseY: 0.32, spread: 0.78 },
  'mapo-tofu': { baseY: 0.28, spread: 0.6 },
  xiaolongbao: { baseY: 0.36, spread: 0.56 },
};

const noopRaycast = (): void => {};

// Deterministic cached soft radial contact-shadow texture (zero per-frame FBO overrides)
let cachedContactShadowTex: THREE.CanvasTexture | null = null;

function getSoftContactShadowTexture(): THREE.CanvasTexture {
  if (cachedContactShadowTex) return cachedContactShadowTex;

  if (typeof document === 'undefined') {
    cachedContactShadowTex = new THREE.CanvasTexture(undefined as unknown as HTMLCanvasElement);
    return cachedContactShadowTex;
  }

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    // Warm espresso (#2A1C12) Gaussian-like falloff — soft core, invisible perimeter
    grad.addColorStop(0.0, 'rgba(42, 28, 18, 0.96)');
    grad.addColorStop(0.32, 'rgba(42, 28, 18, 0.82)');
    grad.addColorStop(0.56, 'rgba(42, 28, 18, 0.44)');
    grad.addColorStop(0.78, 'rgba(42, 28, 18, 0.14)');
    grad.addColorStop(1.0, 'rgba(42, 28, 18, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedContactShadowTex = tex;
  return tex;
}

function BakedContactShadow({ exploded }: { exploded: boolean }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const shadowTex = useMemo(() => getSoftContactShadowTexture(), []);

  useFrame((_, delta) => {
    if (!matRef.current) return;
    const dt = Math.min(delta, 0.05);
    const factor = 1 - Math.exp(-6.5 * dt);
    const targetOpacity = exploded ? 0.22 : 0.42;
    matRef.current.opacity = THREE.MathUtils.lerp(
      matRef.current.opacity,
      targetOpacity,
      factor
    );
  });

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.536, 0]}
      raycast={noopRaycast}
      renderOrder={1}
    >
      <circleGeometry args={[1.75, 48]} />
      <meshBasicMaterial
        ref={matRef}
        map={shadowTex}
        transparent
        opacity={exploded ? 0.22 : 0.42}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  );
}

interface BoundaryProps {
  children: React.ReactNode;
}

interface BoundaryState {
  hasError: boolean;
}

class CanvasFeatureErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

interface AtmosphereLightsProps {
  atmosphere: DishAtmosphere;
}

function AtmosphereLights({ atmosphere }: AtmosphereLightsProps) {
  const keyLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight>(null);

  const targetKeyColor = useMemo(() => new THREE.Color(), []);
  const targetAmbientColor = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const factor = 1 - Math.exp(-5.5 * dt);

    if (keyLightRef.current) {
      targetKeyColor.set(atmosphere.keyLightColor);
      keyLightRef.current.color.lerp(targetKeyColor, factor);
      keyLightRef.current.intensity = THREE.MathUtils.lerp(
        keyLightRef.current.intensity,
        atmosphere.keyLightIntensity,
        factor
      );
    }

    if (ambientLightRef.current) {
      targetAmbientColor.set(atmosphere.ambientTint);
      ambientLightRef.current.color.lerp(targetAmbientColor, factor);
    }

    if (hemiLightRef.current) {
      targetAmbientColor.set(atmosphere.ambientTint);
      hemiLightRef.current.color.lerp(targetAmbientColor, factor);
    }
  });

  return (
    <>
      {/* Restrained ambient & hemisphere fill so sculptural shadows keep editorial depth */}
      <ambientLight
        ref={ambientLightRef}
        intensity={0.09}
        color={atmosphere.ambientTint}
      />
      <hemisphereLight
        ref={hemiLightRef}
        args={[atmosphere.ambientTint, '#A89480', 0.16]}
      />

      {/* Sculptural 3/4 side-key with tight 2048px soft PCF shadows */}
      <directionalLight
        ref={keyLightRef}
        castShadow
        position={[3.8, 6.2, 2.2]}
        intensity={atmosphere.keyLightIntensity}
        color={atmosphere.keyLightColor}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.028}
        shadow-camera-near={1}
        shadow-camera-far={18}
        shadow-camera-left={-2.4}
        shadow-camera-right={2.4}
        shadow-camera-top={2.4}
        shadow-camera-bottom={-2.4}
      />

      {/* Warm back-rim directional light to ignite SSS backlit glow & wet edges */}
      <directionalLight
        position={[-3.2, 3.6, -3.8]}
        intensity={0.75}
        color="#FFE6C8"
      />
    </>
  );
}

/** Procedural Food Photography Softbox & Negative-Fill Studio Rig (zero external HDRI fetch). */
function FoodStudioEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      {/* Overhead warm diffused softbox */}
      <Lightformer
        form="rect"
        intensity={2.2}
        color="#FFF9EE"
        position={[0, 6.5, 0.4]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[7.2, 5.2, 1]}
      />

      {/* 3/4 Back-left warm rim strip — makes wet chili oil, broth & translucent edges gleam */}
      <Lightformer
        form="rect"
        intensity={3.4}
        color="#FFEAD0"
        position={[-5.2, 3.6, -4.4]}
        target={[0, 0, 0]}
        scale={[2.6, 5.8, 1]}
      />

      {/* Soft cool right fill card */}
      <Lightformer
        form="rect"
        intensity={0.85}
        color="#E8F0FF"
        position={[5.8, 2.8, 1.4]}
        target={[0, 0, 0]}
        scale={[4.8, 3.8, 1]}
      />

      {/* Dark negative-fill cards on front-left & right-rear for crisp specular contrast */}
      <Lightformer
        form="rect"
        intensity={0.12}
        color="#14100E"
        position={[-5.0, 1.8, 3.6]}
        target={[0, 0, 0]}
        scale={[5.6, 4.4, 1]}
      />
      <Lightformer
        form="rect"
        intensity={0.12}
        color="#14100E"
        position={[4.6, 2.2, -4.6]}
        target={[0, 0, 0]}
        scale={[5.6, 4.4, 1]}
      />
    </Environment>
  );
}

interface DishShowcaseProps {
  dishId: DishId;
  isHot: boolean;
  exploded: boolean;
  highlightedPart: string | null;
  transitionDirection: 1 | -1;
  onSelectPart: (partId: string | null) => void;
}

function DishShowcase({
  dishId,
  isHot,
  exploded,
  highlightedPart,
  transitionDirection,
  onSelectPart,
}: DishShowcaseProps) {
  const wrapperRef = useRef<THREE.Group>(null);
  const prevDishIdRef = useRef<DishId | null>(null);
  const settlingRef = useRef(false);

  // Directional chef's-counter glide whenever the active dish changes
  useEffect(() => {
    const group = wrapperRef.current;
    if (!group) return;
    if (prevDishIdRef.current === dishId) return;

    const isInitial = prevDishIdRef.current === null;
    prevDishIdRef.current = dishId;

    if (isInitial) {
      group.position.set(0, -0.06, 0);
      group.scale.setScalar(0.92);
      group.rotation.y = -0.14;
      settlingRef.current = true;
      return;
    }

    group.position.set(transitionDirection * 1.15, -0.06, 0);
    group.scale.setScalar(0.9);
    group.rotation.y = -transitionDirection * 0.28;
    settlingRef.current = true;
  }, [dishId, transitionDirection]);

  useFrame((_, delta) => {
    const group = wrapperRef.current;
    if (!group || !settlingRef.current) return;

    const dt = Math.min(delta, 0.05);
    const factor = 1 - Math.exp(-8.5 * dt);

    group.position.x = THREE.MathUtils.lerp(group.position.x, 0, factor);
    group.position.y = THREE.MathUtils.lerp(group.position.y, 0, factor);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, 0, factor);
    const nextScale = THREE.MathUtils.lerp(group.scale.x, 1, factor);
    group.scale.setScalar(nextScale);

    if (
      Math.abs(group.position.x) < 0.002 &&
      Math.abs(group.position.y) < 0.002 &&
      Math.abs(group.rotation.y) < 0.002 &&
      Math.abs(1 - nextScale) < 0.001
    ) {
      group.position.set(0, 0, 0);
      group.rotation.y = 0;
      group.scale.setScalar(1);
      settlingRef.current = false;
    }
  });

  const steamCfg = STEAM_CONFIG[dishId];

  const renderDishModel = () => {
    const modelProps = { exploded, highlightedPart, onSelectPart };
    switch (dishId) {
      case 'curry':
        return <CurryModel {...modelProps} />;
      case 'pizza':
        return <PizzaModel {...modelProps} />;
      case 'sushi':
        return <SushiModel {...modelProps} />;
      case 'pho':
        return <PhoModel {...modelProps} />;
      case 'hot-pot':
        return <HotPotModel {...modelProps} />;
      case 'mapo-tofu':
        return <MapoTofuModel {...modelProps} />;
      case 'xiaolongbao':
        return <DimSumModel {...modelProps} />;
      default:
        return <CurryModel {...modelProps} />;
    }
  };

  return (
    <group ref={wrapperRef}>
      {renderDishModel()}
      <SteamParticles
        active={isHot}
        baseY={steamCfg.baseY}
        spread={steamCfg.spread}
        exploded={exploded}
      />
    </group>
  );
}

interface CameraRigProps {
  autoRotate: boolean;
  resetSignal: number;
  dishId: DishId;
  focusedPartData: DishPart | null;
  exploded: boolean;
  onUserInteract: () => void;
}

function CameraRig({
  autoRotate,
  resetSignal,
  dishId,
  focusedPartData,
  exploded,
  onUserInteract,
}: CameraRigProps) {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera } = useThree();

  const isGlidingRef = useRef(false);
  const hadFocusRef = useRef(false);
  const prevDishRef = useRef<DishId>(dishId);

  const desiredPos = useMemo(() => new THREE.Vector3(...DEFAULT_CAMERA_POSITION), []);
  const desiredTarget = useMemo(() => new THREE.Vector3(...DEFAULT_CAMERA_TARGET), []);

  // Glide back to canonical framing on explicit Reset View
  useEffect(() => {
    if (resetSignal > 0) {
      desiredPos.set(...DEFAULT_CAMERA_POSITION);
      desiredTarget.set(...DEFAULT_CAMERA_TARGET);
      isGlidingRef.current = true;
    }
  }, [resetSignal, desiredPos, desiredTarget]);

  // Glide smoothly when focusedPart changes or dish switches
  useEffect(() => {
    const dishChanged = prevDishRef.current !== dishId;
    prevDishRef.current = dishId;

    if (focusedPartData?.cameraFocus) {
      const { position, target } = focusedPartData.cameraFocus;
      const explodeYTarget = exploded ? 0.36 : 0;
      const explodeYCam = exploded ? 0.48 : 0;
      const explodePullback = exploded ? 1.08 : 1;

      desiredTarget.set(target[0], target[1] + explodeYTarget, target[2]);
      desiredPos.set(
        position[0] * explodePullback,
        position[1] + explodeYCam,
        position[2] * explodePullback
      );
      isGlidingRef.current = true;
      hadFocusRef.current = true;
    } else if (hadFocusRef.current || dishChanged) {
      desiredPos.set(...DEFAULT_CAMERA_POSITION);
      desiredTarget.set(...DEFAULT_CAMERA_TARGET);
      isGlidingRef.current = true;
      hadFocusRef.current = false;
    }
  }, [dishId, focusedPartData, exploded, desiredPos, desiredTarget]);

  useFrame((_, delta) => {
    if (!isGlidingRef.current) return;
    const controls = controlsRef.current;
    if (!controls) return;

    const dt = Math.min(delta, 0.05);
    const factor = 1 - Math.exp(-6.2 * dt);

    camera.position.lerp(desiredPos, factor);
    controls.target.lerp(desiredTarget, factor);
    controls.update();

    if (
      camera.position.distanceTo(desiredPos) < 0.015 &&
      controls.target.distanceTo(desiredTarget) < 0.015
    ) {
      camera.position.copy(desiredPos);
      controls.target.copy(desiredTarget);
      controls.update();
      isGlidingRef.current = false;
    }
  });

  const effectiveAutoRotate = autoRotate && !focusedPartData;

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={DEFAULT_CAMERA_TARGET}
      enableDamping
      dampingFactor={0.07}
      enablePan={false}
      minDistance={2.2}
      maxDistance={8.5}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2.1}
      autoRotate={effectiveAutoRotate}
      autoRotateSpeed={0.85}
      onStart={() => {
        // Immediately yield control so camera never fights manual orbiting
        isGlidingRef.current = false;
        onUserInteract();
      }}
    />
  );
}

export function SceneStage({
  dish,
  exploded,
  onToggleExplode,
  highlightedPart,
  focusedPart = null,
  transitionDirection = 1,
  onSelectPart,
}: SceneStageProps) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);

  const activePart = useMemo(() => {
    const id = highlightedPart ?? focusedPart;
    return id ? dish.parts.find((part) => part.id === id) ?? null : null;
  }, [dish.parts, highlightedPart, focusedPart]);

  const focusedPartData = useMemo(
    () => (focusedPart ? dish.parts.find((part) => part.id === focusedPart) ?? null : null),
    [dish.parts, focusedPart]
  );

  const handleResetView = useCallback(() => {
    onSelectPart(null);
    setResetSignal((n) => n + 1);
  }, [onSelectPart]);

  const handleToggleAutoRotate = useCallback(() => {
    setAutoRotate((prev) => !prev);
  }, []);

  const handleUserInteract = useCallback(() => {
    setHasInteracted(true);
  }, []);

  const backdropInner = dish.atmosphere?.backdropInner ?? '#FFFDF9';
  const backdropOuter = dish.atmosphere?.backdropOuter ?? '#EFE8DC';

  return (
    <div
      className="relative h-full w-full overflow-hidden select-none bg-[#FAF7F2] transition-[background-image] duration-500"
      style={{
        backgroundImage: `radial-gradient(ellipse 76% 66% at 50% 48%, ${backdropInner} 0%, ${backdropOuter} 100%)`,
      }}
    >
      {/* Subtle warm tabletop glow behind the focal dish */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 60%, rgba(217, 56, 30, 0.03) 0%, rgba(250, 247, 242, 0) 58%)',
        }}
      />

      {/* Native hardware MSAA + ACESFilmicToneMapping (zero postprocessing FBO flicker) */}
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        camera={{ position: DEFAULT_CAMERA_POSITION, fov: 36 }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.06,
        }}
        onPointerMissed={() => onSelectPart(null)}
        className="h-full w-full cursor-grab active:cursor-grabbing"
      >
        <CanvasFeatureErrorBoundary>
          <Suspense fallback={null}>
            <FoodStudioEnvironment />
          </Suspense>
        </CanvasFeatureErrorBoundary>

        <AtmosphereLights atmosphere={dish.atmosphere} />

        <TableSurface surface={dish.atmosphere.surface} />

        <BakedContactShadow exploded={exploded} />

        <DishShowcase
          dishId={dish.id}
          isHot={dish.isHot}
          exploded={exploded}
          highlightedPart={highlightedPart}
          transitionDirection={transitionDirection}
          onSelectPart={onSelectPart}
        />

        <CameraRig
          autoRotate={autoRotate}
          resetSignal={resetSignal}
          dishId={dish.id}
          focusedPartData={focusedPartData}
          exploded={exploded}
          onUserInteract={handleUserInteract}
        />
      </Canvas>

      {/* Whisper-soft pure CSS editorial vignette framing the 3D studio */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background:
            'radial-gradient(ellipse 84% 80% at 50% 50%, rgba(28, 25, 23, 0) 58%, rgba(42, 28, 18, 0.11) 100%)',
        }}
      />

      {/* Active highlighted/focused layer pill (cleanly clear of upgraded top-left masthead & tagline) */}
      {activePart && (
        <div className="pointer-events-none absolute top-[62px] left-3 z-10 max-w-[65%] sm:top-[88px] sm:left-6">
          <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#D9381E]/30 bg-[#FFFDF9]/95 py-1 pr-1.5 pl-3 text-xs text-[#1C1917] shadow-[0_6px_18px_rgba(217,56,30,0.14)] backdrop-blur-md transition-all">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#D9381E]" />
            <span className="truncate font-semibold tracking-[-0.01em]">{activePart.label}</span>
            <button
              type="button"
              onClick={() => onSelectPart(null)}
              aria-label={`Clear ${activePart.label} highlight`}
              className="ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#6B6258] transition-colors hover:bg-[#EFE8DC] hover:text-[#1C1917] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Single unified top-right studio capsule: Explode Dish + divider + Auto-Rotate & Reset View */}
      <div className="absolute top-3.5 right-3 z-20 sm:top-5 sm:right-6">
        <div className="inline-flex items-center gap-1 rounded-full border border-[#E6DDD0]/90 bg-[#FFFDF9]/88 p-1 shadow-[0_6px_22px_-6px_rgba(28,25,23,0.12)] backdrop-blur-md">
          <button
            type="button"
            onClick={onToggleExplode}
            aria-pressed={exploded}
            className={[
              'group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold tracking-[0.01em] transition-all duration-200 cursor-pointer sm:px-3.5 sm:text-[12.5px]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]/60',
              exploded
                ? 'bg-[#D9381E] text-[#FAF7F2] shadow-[0_4px_14px_rgba(217,56,30,0.3)] hover:bg-[#C33119]'
                : 'text-[#1C1917] hover:bg-[#EFE8DC]/75',
            ].join(' ')}
          >
            <Layers
              className={[
                'h-3.5 w-3.5 transition-transform duration-200',
                exploded ? 'scale-105 text-[#FAF7F2]' : 'text-[#D9381E] group-hover:scale-105',
              ].join(' ')}
            />
            <span>{exploded ? 'Assemble' : 'Explode'}</span>
          </button>

          <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-[#E6DDD0]" />

          <button
            type="button"
            onClick={handleToggleAutoRotate}
            aria-pressed={autoRotate}
            aria-label={autoRotate ? 'Pause auto-rotate' : 'Enable auto-rotate'}
            title={autoRotate ? 'Pause Auto-Rotate' : 'Auto-Rotate'}
            className={[
              'inline-flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 cursor-pointer sm:h-8 sm:w-8',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]/60',
              autoRotate
                ? 'bg-[#D9381E]/10 text-[#D9381E] hover:bg-[#D9381E]/18'
                : 'text-[#6B6258] hover:bg-[#EFE8DC]/75 hover:text-[#1C1917]',
            ].join(' ')}
          >
            <RotateCw
              className={[
                'h-3.5 w-3.5 transition-transform duration-300',
                autoRotate ? 'animate-[spin_9s_linear_infinite]' : '',
              ].join(' ')}
            />
          </button>

          <button
            type="button"
            onClick={handleResetView}
            aria-label="Reset 3D camera view"
            title="Reset View"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#6B6258] transition-all duration-200 hover:bg-[#EFE8DC]/75 hover:text-[#1C1917] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]/60 cursor-pointer sm:h-8 sm:w-8"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Auto-fading gallery interaction whisper — fades out smoothly once the user orbits */}
      <div
        aria-hidden={hasInteracted}
        className={[
          'pointer-events-none absolute bottom-3.5 left-3 z-10 transition-opacity duration-500 sm:bottom-4 sm:left-6 lg:bottom-[6.25rem] lg:left-1/2 lg:-translate-x-1/2 xl:bottom-[7.5rem]',
          hasInteracted ? 'opacity-0' : 'opacity-100',
        ].join(' ')}
      >
        <p className="inline-flex items-center gap-1.5 rounded-full border border-[#E6DDD0]/70 bg-[#FFFDF9]/72 px-3 py-1 text-[11px] font-medium tracking-[0.02em] text-[#786E63] backdrop-blur-sm">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9381E]/80" />
          <span>Drag to orbit &middot; Scroll to zoom</span>
        </p>
      </div>
    </div>
  );
}

export default SceneStage;

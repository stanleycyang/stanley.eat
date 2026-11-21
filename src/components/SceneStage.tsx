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
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei';
import { Layers, RotateCcw, RotateCw, X } from 'lucide-react';
import * as THREE from 'three';

import type { DishId, DishRecipe } from '@/types/dish';
import { SteamParticles } from './SteamParticles';
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

interface BoundaryProps {
  children: React.ReactNode;
}

interface BoundaryState {
  hasError: boolean;
}

class EnvironmentErrorBoundary extends Component<BoundaryProps, BoundaryState> {
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

interface DishShowcaseProps {
  dishId: DishId;
  isHot: boolean;
  exploded: boolean;
  highlightedPart: string | null;
  onSelectPart: (partId: string | null) => void;
}

function DishShowcase({
  dishId,
  isHot,
  exploded,
  highlightedPart,
  onSelectPart,
}: DishShowcaseProps) {
  const wrapperRef = useRef<THREE.Group>(null);
  const entranceRef = useRef(0);

  // Trigger a gentle tactile entrance whenever the active dish changes
  useEffect(() => {
    entranceRef.current = 0;
    const group = wrapperRef.current;
    if (group) {
      group.scale.setScalar(0.84);
      group.position.y = -0.14;
      group.rotation.y = -0.22;
    }
  }, [dishId]);

  useFrame((_, delta) => {
    const group = wrapperRef.current;
    if (!group) return;

    const dt = Math.min(delta, 0.05);
    const lerpFactor = 1 - Math.exp(-7.5 * dt);

    if (entranceRef.current < 0.999) {
      entranceRef.current = THREE.MathUtils.lerp(entranceRef.current, 1, lerpFactor);
      const t = entranceRef.current;
      group.scale.setScalar(THREE.MathUtils.lerp(0.84, 1, t));
      group.position.y = THREE.MathUtils.lerp(-0.14, 0, t);
      group.rotation.y = THREE.MathUtils.lerp(-0.22, 0, t);
    } else if (group.scale.x !== 1 || group.position.y !== 0 || group.rotation.y !== 0) {
      group.scale.setScalar(1);
      group.position.y = 0;
      group.rotation.y = 0;
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
}

function CameraRig({ autoRotate, resetSignal }: CameraRigProps) {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera } = useThree();
  const isResettingRef = useRef(false);
  const targetPos = useMemo(() => new THREE.Vector3(...DEFAULT_CAMERA_POSITION), []);
  const targetLookAt = useMemo(() => new THREE.Vector3(...DEFAULT_CAMERA_TARGET), []);

  useEffect(() => {
    if (resetSignal > 0) {
      isResettingRef.current = true;
    }
  }, [resetSignal]);

  useFrame((_, delta) => {
    if (!isResettingRef.current) return;
    const controls = controlsRef.current;
    if (!controls) return;

    const dt = Math.min(delta, 0.05);
    const factor = 1 - Math.exp(-7 * dt);

    camera.position.lerp(targetPos, factor);
    controls.target.lerp(targetLookAt, factor);
    controls.update();

    if (
      camera.position.distanceTo(targetPos) < 0.015 &&
      controls.target.distanceTo(targetLookAt) < 0.015
    ) {
      camera.position.copy(targetPos);
      controls.target.copy(targetLookAt);
      controls.update();
      isResettingRef.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={DEFAULT_CAMERA_TARGET}
      enableDamping
      dampingFactor={0.07}
      enablePan={false}
      minDistance={2.8}
      maxDistance={8.5}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2.1}
      autoRotate={autoRotate}
      autoRotateSpeed={0.85}
      onStart={() => {
        isResettingRef.current = false;
      }}
    />
  );
}

export function SceneStage({
  dish,
  exploded,
  onToggleExplode,
  highlightedPart,
  onSelectPart,
}: SceneStageProps) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);

  const activePart = useMemo(
    () =>
      highlightedPart
        ? dish.parts.find((part) => part.id === highlightedPart) ?? null
        : null,
    [dish.parts, highlightedPart]
  );

  const handleResetView = useCallback(() => {
    setResetSignal((n) => n + 1);
  }, []);

  const handleToggleAutoRotate = useCallback(() => {
    setAutoRotate((prev) => !prev);
  }, []);

  return (
    <div
      className="relative h-full w-full overflow-hidden select-none bg-[#FAF7F2]"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 75% 65% at 50% 48%, #FFFDF9 0%, #FAF7F2 56%, #EFE8DC 100%)',
      }}
    >
      {/* Subtle studio tabletop vignette halo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 62%, rgba(217, 56, 30, 0.035) 0%, rgba(250, 247, 242, 0) 58%)',
        }}
      />

      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: DEFAULT_CAMERA_POSITION, fov: 36 }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        onPointerMissed={() => onSelectPart(null)}
        className="h-full w-full cursor-grab active:cursor-grabbing"
      >
        <EnvironmentErrorBoundary>
          <Suspense fallback={null}>
            <Environment preset="studio" />
          </Suspense>
        </EnvironmentErrorBoundary>

        {/* Warm studio lighting rig (also looks balanced offline if Environment fails) */}
        <ambientLight intensity={0.38} color="#FFF8EE" />
        <hemisphereLight args={['#FFFDF9', '#D6C4AE', 0.72]} />
        <directionalLight
          castShadow
          position={[4.5, 7.5, 4.5]}
          intensity={1.7}
          color="#FFF5E6"
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0004}
          shadow-camera-near={1}
          shadow-camera-far={20}
          shadow-camera-left={-3.5}
          shadow-camera-right={3.5}
          shadow-camera-top={3.5}
          shadow-camera-bottom={-3.5}
        />
        <directionalLight
          position={[-4.2, 4.0, -3.5]}
          intensity={0.65}
          color="#EAF1FF"
        />
        <directionalLight
          position={[2.0, 1.8, -4.5]}
          intensity={0.35}
          color="#FFE1C6"
        />

        <DishShowcase
          dishId={dish.id}
          isHot={dish.isHot}
          exploded={exploded}
          highlightedPart={highlightedPart}
          onSelectPart={onSelectPart}
        />

        <ContactShadows
          position={[0, -0.55, 0]}
          opacity={0.38}
          scale={7.5}
          blur={2.4}
          far={3.5}
          color="#4A3828"
        />

        <CameraRig autoRotate={autoRotate} resetSignal={resetSignal} />
      </Canvas>

      {/* Top-left floating HUD: subtle interaction hint + active layer pill (offset cleanly below masthead) */}
      <div className="pointer-events-none absolute top-14 left-4 z-10 flex max-w-[58%] flex-col items-start gap-2 sm:top-[66px] sm:left-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#E6DDD0]/90 bg-[#FFFDF9]/88 px-3 py-1 text-[11px] font-medium tracking-[0.02em] text-[#6B6258] shadow-[0_2px_10px_rgba(28,25,23,0.05)] backdrop-blur-md">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9381E]" />
          <span className="truncate">Interactive 3D &bull; Drag to Orbit</span>
        </div>

        {activePart && (
          <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#D9381E]/30 bg-[#FFFDF9]/95 py-1 pr-1.5 pl-3 text-xs text-[#1C1917] shadow-[0_6px_18px_rgba(217,56,30,0.14)] backdrop-blur-md transition-all">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#D9381E]" />
            <span className="font-semibold tracking-[-0.01em]">{activePart.label}</span>
            <button
              type="button"
              onClick={() => onSelectPart(null)}
              aria-label={`Clear ${activePart.label} highlight`}
              className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[#6B6258] transition-colors hover:bg-[#EFE8DC] hover:text-[#1C1917] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Top-right floating HUD: Prominent Explode Dish toggle */}
      <div className="absolute top-3.5 right-4 z-10 sm:top-4 sm:right-5">
        <button
          type="button"
          onClick={onToggleExplode}
          aria-pressed={exploded}
          className={[
            'group inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold tracking-[0.01em] transition-all duration-200 cursor-pointer sm:px-4 sm:py-2.5 sm:text-[13px]',
            'backdrop-blur-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]/60',
            exploded
              ? 'border-[#B92D17] bg-[#D9381E] text-[#FAF7F2] shadow-[0_8px_22px_rgba(217,56,30,0.32)] hover:bg-[#C33119]'
              : 'border-[#E6DDD0] bg-[#FFFDF9]/92 text-[#1C1917] shadow-[0_6px_18px_rgba(28,25,23,0.09)] hover:border-[#D9381E]/50 hover:bg-[#FFFDF9]',
          ].join(' ')}
        >
          <Layers
            className={[
              'h-4 w-4 transition-transform duration-200',
              exploded ? 'scale-105 text-[#FAF7F2]' : 'text-[#D9381E] group-hover:scale-105',
            ].join(' ')}
          />
          <span>{exploded ? 'Assemble Dish' : 'Explode Dish'}</span>
        </button>
      </div>

      {/* Secondary stage controls: bottom-right on mobile, stacked cleanly under Explode Dish on lg+ to stay clear of DishDock */}
      <div className="absolute right-4 bottom-4 z-10 flex items-center gap-1.5 sm:right-5 sm:bottom-5 lg:top-[66px] lg:right-5 lg:bottom-auto">
        <button
          type="button"
          onClick={handleToggleAutoRotate}
          aria-pressed={autoRotate}
          aria-label={autoRotate ? 'Pause auto-rotate' : 'Enable auto-rotate'}
          title={autoRotate ? 'Pause Auto-Rotate' : 'Auto-Rotate'}
          className={[
            'inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-all duration-200 backdrop-blur-md cursor-pointer sm:h-9 sm:px-3',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]/60',
            autoRotate
              ? 'border-[#D9381E]/35 bg-[#FFFDF9]/92 text-[#D9381E] shadow-[0_4px_12px_rgba(217,56,30,0.1)]'
              : 'border-[#E6DDD0] bg-[#FFFDF9]/85 text-[#6B6258] shadow-[0_4px_12px_rgba(28,25,23,0.06)] hover:text-[#1C1917]',
          ].join(' ')}
        >
          <RotateCw
            className={[
              'h-3.5 w-3.5 transition-transform duration-300',
              autoRotate ? 'animate-[spin_9s_linear_infinite]' : '',
            ].join(' ')}
          />
          <span className="hidden sm:inline">Rotate</span>
        </button>

        <button
          type="button"
          onClick={handleResetView}
          aria-label="Reset 3D camera view"
          title="Reset View"
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#E6DDD0] bg-[#FFFDF9]/85 px-2.5 text-[11px] font-medium text-[#6B6258] shadow-[0_4px_12px_rgba(28,25,23,0.06)] backdrop-blur-md transition-all duration-200 hover:border-[#D9381E]/40 hover:bg-[#FFFDF9] hover:text-[#1C1917] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]/60 cursor-pointer sm:h-9 sm:px-3"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </div>
  );
}

export default SceneStage;

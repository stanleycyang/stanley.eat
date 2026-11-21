'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { RECIPES, getDishById } from '@/data/recipes';
import type { DishId } from '@/types/dish';
import { SceneStageLoader } from './SceneStageLoader';
import { RecipePanel, type ScaleFactor } from './RecipePanel';
import { DishDock } from './DishDock';
import { CookModeModal } from './CookModeModal';
import { TastingMenuModal } from './TastingMenuModal';
import { AboutStanleyModal } from './AboutStanleyModal';

function fallbackCopyText(text: string): boolean {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function computeShortestDirection(
  fromIndex: number,
  toIndex: number,
  total: number
): 1 | -1 {
  if (fromIndex === toIndex || total <= 1) return 1;
  const forward = (toIndex - fromIndex + total) % total;
  const backward = (fromIndex - toIndex + total) % total;
  return forward <= backward ? 1 : -1;
}

export function StanleyEatApp() {
  const searchParams = useSearchParams();
  const initialDish = getDishById(searchParams.get('dish'));

  const [activeDishId, setActiveDishId] = useState<DishId>(initialDish.id);
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1);
  const [exploded, setExploded] = useState(false);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const [cookModeOpen, setCookModeOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  // Lifted per-dish recipe progress so RecipePanel, CookModeModal, DishDock & TastingMenuModal stay in sync
  const [scaleByDish, setScaleByDish] = useState<
    Partial<Record<DishId, ScaleFactor>>
  >({});
  const [checkedByDish, setCheckedByDish] = useState<
    Partial<Record<DishId, Record<string, boolean>>>
  >({});

  const shareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recipeScrollRef = useRef<HTMLDivElement | null>(null);

  const activeDishIndex = useMemo(() => {
    const idx = RECIPES.findIndex((item) => item.id === activeDishId);
    return idx >= 0 ? idx : 0;
  }, [activeDishId]);

  const activeDish = RECIPES[activeDishIndex] ?? RECIPES[0];
  const prevDish =
    RECIPES[(activeDishIndex - 1 + RECIPES.length) % RECIPES.length] ??
    activeDish;
  const nextDish =
    RECIPES[(activeDishIndex + 1) % RECIPES.length] ?? activeDish;
  const highlightedPart = hoveredPart ?? selectedPart;

  const activeScale: ScaleFactor = scaleByDish[activeDish.id] ?? 1;
  const activeCheckedMap = useMemo(
    () => checkedByDish[activeDish.id] ?? {},
    [checkedByDish, activeDish.id]
  );

  const checkedCountsByDish = useMemo(() => {
    const counts: Partial<Record<DishId, number>> = {};
    for (const recipe of RECIPES) {
      const map = checkedByDish[recipe.id];
      if (!map) continue;
      let count = 0;
      for (const ing of recipe.ingredients) {
        if (map[ing.id]) count += 1;
      }
      if (count > 0) {
        counts[recipe.id] = count;
      }
    }
    return counts;
  }, [checkedByDish]);

  // Sync if the URL query param changes externally (e.g., browser navigation)
  useEffect(() => {
    const paramDish = searchParams.get('dish');
    if (paramDish) {
      const resolved = getDishById(paramDish);
      setActiveDishId((prev) => (prev === resolved.id ? prev : resolved.id));
    }
  }, [searchParams]);

  // Clean up share feedback timeout on unmount
  useEffect(() => {
    return () => {
      if (shareTimerRef.current) {
        clearTimeout(shareTimerRef.current);
      }
    };
  }, []);

  const handleSelectDish = useCallback(
    (nextId: DishId, explicitDirection?: 1 | -1) => {
      if (nextId === activeDishId) return;

      const targetIndex = RECIPES.findIndex((item) => item.id === nextId);
      const direction =
        explicitDirection ??
        computeShortestDirection(
          activeDishIndex,
          targetIndex >= 0 ? targetIndex : 0,
          RECIPES.length
        );

      setTransitionDirection(direction);
      setActiveDishId(nextId);
      setExploded(false);
      setSelectedPart(null);
      setHoveredPart(null);

      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('dish', nextId);
        window.history.replaceState(
          null,
          '',
          `${url.pathname}${url.search}${url.hash}`
        );
      }

      if (recipeScrollRef.current) {
        recipeScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [activeDishId, activeDishIndex]
  );

  const handleToggleExplode = useCallback(() => {
    setExploded((prev) => !prev);
  }, []);

  const handleSelectPart = useCallback((partId: string | null) => {
    setSelectedPart((prev) => {
      if (partId === null) return null;
      return prev === partId ? null : partId;
    });
  }, []);

  const handleChangeScale = useCallback(
    (nextScale: ScaleFactor) => {
      setScaleByDish((prev) => ({
        ...prev,
        [activeDish.id]: nextScale,
      }));
    },
    [activeDish.id]
  );

  const handleToggleIngredient = useCallback(
    (ingredientId: string) => {
      setCheckedByDish((prev) => {
        const currentDishMap = prev[activeDish.id] ?? {};
        return {
          ...prev,
          [activeDish.id]: {
            ...currentDishMap,
            [ingredientId]: !currentDishMap[ingredientId],
          },
        };
      });
    },
    [activeDish.id]
  );

  const handleResetChecked = useCallback(() => {
    setCheckedByDish((prev) => ({
      ...prev,
      [activeDish.id]: {},
    }));
  }, [activeDish.id]);

  const handleShare = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?dish=${activeDish.id}`;

    let copied = false;
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        copied = true;
      } catch {
        copied = fallbackCopyText(shareUrl);
      }
    } else {
      copied = fallbackCopyText(shareUrl);
    }

    if (copied) {
      setShareCopied(true);
      if (shareTimerRef.current) {
        clearTimeout(shareTimerRef.current);
      }
      shareTimerRef.current = setTimeout(() => {
        setShareCopied(false);
      }, 2000);
    }
  }, [activeDish.id]);

  const handleOpenCookMode = useCallback(() => {
    setMenuOpen(false);
    setAboutOpen(false);
    setCookModeOpen(true);
  }, []);

  const handleCloseCookMode = useCallback(() => {
    setCookModeOpen(false);
  }, []);

  const handleOpenMenu = useCallback(() => {
    setCookModeOpen(false);
    setAboutOpen(false);
    setMenuOpen(true);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const handleOpenAbout = useCallback(() => {
    setCookModeOpen(false);
    setMenuOpen(false);
    setAboutOpen(true);
  }, []);

  const handleCloseAbout = useCallback(() => {
    setAboutOpen(false);
  }, []);

  const anyModalOpen = cookModeOpen || menuOpen || aboutOpen;

  // Global keyboard shortcuts (paused whenever any modal is open)
  useEffect(() => {
    if (anyModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextIndex = (activeDishIndex + 1) % RECIPES.length;
        handleSelectDish(RECIPES[nextIndex].id, 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const prevIndex =
          (activeDishIndex - 1 + RECIPES.length) % RECIPES.length;
        handleSelectDish(RECIPES[prevIndex].id, -1);
      } else if (event.key === 'e' || event.key === 'E') {
        event.preventDefault();
        handleToggleExplode();
      } else if (event.key === 'c' || event.key === 'C') {
        event.preventDefault();
        setCookModeOpen(true);
      } else if (event.key === 'm' || event.key === 'M') {
        event.preventDefault();
        setMenuOpen(true);
      } else if (event.key === 'i' || event.key === 'I') {
        event.preventDefault();
        setAboutOpen(true);
      } else if (event.key === 'Escape') {
        setSelectedPart(null);
        setHoveredPart(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [anyModalOpen, activeDishIndex, handleSelectDish, handleToggleExplode]);

  return (
    <div className="min-h-screen w-full bg-[#FAF7F2] text-[#1C1917] lg:flex lg:h-screen lg:overflow-hidden">
      {/* LEFT STAGE COLUMN (55% full-bleed on desktop, 45vh stacked top on mobile) */}
      <section
        aria-label="Interactive 3D food gallery"
        className="relative h-[45vh] min-h-[320px] w-full shrink-0 bg-[#FAF7F2] lg:h-full lg:w-[55%]"
      >
        {/* Full-bleed 3D Interactive Canvas */}
        <div className="h-full w-full">
          <SceneStageLoader
            dish={activeDish}
            exploded={exploded}
            onToggleExplode={handleToggleExplode}
            highlightedPart={highlightedPart}
            focusedPart={selectedPart}
            transitionDirection={transitionDirection}
            onSelectPart={handleSelectPart}
          />
        </div>

        {/* Upgraded Top-Left Editorial Brand Masthead */}
        <header className="pointer-events-none absolute top-3.5 left-3 z-20 flex flex-col items-start sm:top-5 sm:left-6">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleOpenMenu}
              aria-label="stanley.eat — open 7-course tasting menu"
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#E6DDD0]/90 bg-[#FFFDF9]/90 py-1 pr-2.5 pl-1.5 backdrop-blur-md shadow-[0_6px_18px_-8px_rgba(28,25,23,0.14)] transition-all hover:border-[#D9381E]/40 hover:bg-[#FFFDF9] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] sm:gap-2 sm:py-1 sm:pr-3.5 sm:pl-1.5"
            >
              <Image
                src="/logo-mark.png"
                alt=""
                width={28}
                height={28}
                priority
                className="h-6 w-6 shrink-0 sm:h-7 sm:w-7"
              />
              <span className="font-serif text-[16px] sm:text-[21px] font-semibold leading-none tracking-[-0.03em] text-[#1C1917]">
                stanley<span className="text-[#D9381E]">.eat</span>
              </span>
            </button>

            <button
              type="button"
              onClick={handleOpenAbout}
              title="About Stanley Yang"
              aria-label="About Stanley Yang and this vault"
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#E6DDD0]/90 bg-[#FFFDF9]/88 p-0.5 text-[11.5px] font-medium text-[#443E37] backdrop-blur-md shadow-[0_6px_18px_-8px_rgba(28,25,23,0.12)] transition-all hover:border-[#D9381E]/40 hover:bg-[#FFFDF9] hover:text-[#1C1917] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] sm:py-1 sm:pr-3 sm:pl-1"
            >
              <Image
                src="/stanley-avatar.jpg"
                alt="Stanley Yang"
                width={24}
                height={24}
                priority
                className="h-6 w-6 shrink-0 rounded-full object-cover object-[56%_22%] ring-1 ring-[#E6DDD0]"
              />
              <span className="hidden sm:inline">by Stanley Yang</span>
            </button>
          </div>

          <p className="mt-1.5 hidden pl-1 text-[11.5px] font-medium tracking-[0.01em] text-[#6B6258]/90 sm:block">
            My 7 favorite dishes — in 3D &amp; in the kitchen.
          </p>
        </header>

        {/* Desktop Floating Bottom Tasting Counter Stepper */}
        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 hidden flex-col items-center gap-2 px-5 lg:flex">
          <div className="pointer-events-auto">
            <DishDock
              dishes={RECIPES}
              activeDishId={activeDish.id}
              onSelectDish={handleSelectDish}
              onOpenMenu={handleOpenMenu}
              checkedCountsByDish={checkedCountsByDish}
            />
          </div>
          <p className="hidden xl:block font-mono text-[10.5px] tracking-[0.04em] text-[#8A7E71]/90">
            ← → Switch · M Menu · E Explode · C Cook · I About
          </p>
        </div>
      </section>

      {/* RIGHT EDITORIAL RECIPE COLUMN (45% independently scrollable on desktop, flowing card on mobile) */}
      <main
        ref={recipeScrollRef}
        aria-label="Recipe details"
        className="relative flex-1 rounded-t-[28px] border-t border-[#E6DDD0] bg-[#FFFDF9] pb-24 shadow-[0_-10px_32px_-16px_rgba(28,25,23,0.1)] lg:h-full lg:w-[45%] lg:overflow-y-auto lg:rounded-none lg:border-t-0 lg:border-l lg:pb-10 lg:shadow-none"
      >
        <RecipePanel
          dish={activeDish}
          nextDish={nextDish}
          prevDish={prevDish}
          activeDishIndex={activeDishIndex}
          totalDishes={RECIPES.length}
          highlightedPart={highlightedPart}
          onHoverPart={setHoveredPart}
          onSelectPart={handleSelectPart}
          onSelectDish={handleSelectDish}
          onShare={handleShare}
          shareCopied={shareCopied}
          scale={activeScale}
          onChangeScale={handleChangeScale}
          checkedMap={activeCheckedMap}
          onToggleIngredient={handleToggleIngredient}
          onResetChecked={handleResetChecked}
          onOpenCookMode={handleOpenCookMode}
          onOpenMenu={handleOpenMenu}
          onOpenAbout={handleOpenAbout}
        />
      </main>

      {/* Mobile Fixed Bottom Tasting Counter Stepper */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="pointer-events-auto flex w-full justify-center">
          <DishDock
            dishes={RECIPES}
            activeDishId={activeDish.id}
            onSelectDish={handleSelectDish}
            onOpenMenu={handleOpenMenu}
            checkedCountsByDish={checkedCountsByDish}
          />
        </div>
      </div>

      {/* 7-Course Tasting Menu Overlay */}
      <TastingMenuModal
        dishes={RECIPES}
        activeDishId={activeDish.id}
        isOpen={menuOpen}
        onClose={handleCloseMenu}
        onSelectDish={handleSelectDish}
        onOpenAbout={handleOpenAbout}
        checkedCountsByDish={checkedCountsByDish}
      />

      {/* Boutique Cookbook Dust-Jacket "About Stanley" Modal */}
      <AboutStanleyModal
        dishes={RECIPES}
        activeDishId={activeDish.id}
        isOpen={aboutOpen}
        onClose={handleCloseAbout}
        onSelectDish={handleSelectDish}
        onOpenMenu={handleOpenMenu}
      />

      {/* Hands-Free Kitchen Counter Cook Mode Overlay */}
      <CookModeModal
        dish={activeDish}
        isOpen={cookModeOpen}
        onClose={handleCloseCookMode}
        scale={activeScale}
        onChangeScale={handleChangeScale}
        checkedMap={activeCheckedMap}
        onToggleIngredient={handleToggleIngredient}
        onResetChecked={handleResetChecked}
      />
    </div>
  );
}

export default StanleyEatApp;

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RECIPES, getDishById } from '@/data/recipes';
import type { DishId } from '@/types/dish';
import { SceneStageLoader } from './SceneStageLoader';
import { RecipePanel } from './RecipePanel';
import { DishDock } from './DishDock';

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

export function StanleyEatApp() {
  const searchParams = useSearchParams();
  const initialDish = getDishById(searchParams.get('dish'));

  const [activeDishId, setActiveDishId] = useState<DishId>(initialDish.id);
  const [exploded, setExploded] = useState(false);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const shareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recipeScrollRef = useRef<HTMLDivElement | null>(null);

  const activeDishIndex = useMemo(() => {
    const idx = RECIPES.findIndex((item) => item.id === activeDishId);
    return idx >= 0 ? idx : 0;
  }, [activeDishId]);

  const activeDish = RECIPES[activeDishIndex] ?? RECIPES[0];
  const highlightedPart = hoveredPart ?? selectedPart;

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

  const handleSelectDish = useCallback((nextId: DishId) => {
    setActiveDishId(nextId);
    setExploded(false);
    setSelectedPart(null);
    setHoveredPart(null);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('dish', nextId);
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }

    if (recipeScrollRef.current) {
      recipeScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleToggleExplode = useCallback(() => {
    setExploded((prev) => !prev);
  }, []);

  const handleSelectPart = useCallback((partId: string | null) => {
    setSelectedPart((prev) => {
      if (partId === null) return null;
      return prev === partId ? null : partId;
    });
  }, []);

  const handleShare = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?dish=${activeDish.id}`;

    let copied = false;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
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

  // Keyboard shortcuts: Left/Right arrows switch dishes, E toggles Explode, Escape clears selection
  useEffect(() => {
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
        handleSelectDish(RECIPES[nextIndex].id);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const prevIndex = (activeDishIndex - 1 + RECIPES.length) % RECIPES.length;
        handleSelectDish(RECIPES[prevIndex].id);
      } else if (event.key === 'e' || event.key === 'E') {
        event.preventDefault();
        handleToggleExplode();
      } else if (event.key === 'Escape') {
        setSelectedPart(null);
        setHoveredPart(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDishIndex, handleSelectDish, handleToggleExplode]);

  const dishCounter = `${String(activeDishIndex + 1).padStart(2, '0')} / ${String(
    RECIPES.length
  ).padStart(2, '0')}`;

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
            onSelectPart={handleSelectPart}
          />
        </div>

        {/* Floating Editorial Brand Masthead (top-left, cleanly aligned above SceneStage HUD) */}
        <header className="pointer-events-none absolute top-3.5 left-4 z-20 flex items-center gap-2.5 sm:top-4 sm:left-6">
          <button
            type="button"
            onClick={() => handleSelectDish(RECIPES[0].id)}
            aria-label="stanley.eat — return to first dish"
            className="pointer-events-auto inline-flex items-baseline gap-2 rounded-full border border-[#E6DDD0]/85 bg-[#FFFDF9]/85 px-3.5 py-1.5 backdrop-blur-md shadow-[0_4px_16px_-6px_rgba(28,25,23,0.12)] transition-all hover:bg-[#FFFDF9] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
          >
            <span className="font-serif text-[19px] sm:text-[22px] font-semibold leading-none tracking-[-0.03em] text-[#1C1917]">
              stanley<span className="text-[#D9381E]">.eat</span>
            </span>
            <span className="hidden sm:inline-block font-mono text-[10.5px] font-medium tracking-[0.04em] text-[#786E63]">
              {dishCounter}
            </span>
          </button>
        </header>

        {/* Desktop Floating Bottom Dish-Switcher Dock */}
        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 hidden flex-col items-center gap-2 px-5 lg:flex">
          <div className="pointer-events-auto max-w-full">
            <DishDock
              dishes={RECIPES}
              activeDishId={activeDish.id}
              onSelectDish={handleSelectDish}
            />
          </div>
          <p className="hidden xl:block font-mono text-[10.5px] tracking-[0.04em] text-[#8A7E71]/90">
            ← → Switch Dish · E Explode Layers · Drag to Orbit
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
          highlightedPart={highlightedPart}
          onHoverPart={setHoveredPart}
          onSelectPart={handleSelectPart}
          onShare={handleShare}
          shareCopied={shareCopied}
        />
      </main>

      {/* Mobile Fixed Bottom Dish-Switcher Dock */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="pointer-events-auto max-w-full">
          <DishDock
            dishes={RECIPES}
            activeDishId={activeDish.id}
            onSelectDish={handleSelectDish}
          />
        </div>
      </div>
    </div>
  );
}

export default StanleyEatApp;

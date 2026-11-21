'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ChefHat,
  Clock,
  ExternalLink,
  Flame,
  Layers,
  LayoutGrid,
  Link2,
  MapPin,
  MessageSquareShare,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  Timer,
  Users,
} from 'lucide-react';
import type { DishId, DishRecipe } from '@/types/dish';

export type ScaleFactor = 1 | 2 | 4;

export const SCALE_OPTIONS: readonly ScaleFactor[] = [1, 2, 4];

const SPICE_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Mild',
  2: 'Gentle',
  3: 'Medium',
  4: 'Fiery',
  5: 'Sichuan Fire',
};

const CULINARY_FRACTIONS: ReadonlyArray<readonly [number, string]> = [
  [0, ''],
  [0.125, '⅛'],
  [0.25, '¼'],
  [1 / 3, '⅓'],
  [0.375, '⅜'],
  [0.5, '½'],
  [0.625, '⅝'],
  [2 / 3, '⅔'],
  [0.75, '¾'],
  [0.875, '⅞'],
  [1, ''],
];

export function formatCulinaryAmount(
  amount: number | null,
  scale: ScaleFactor
): string {
  if (amount === null) return '';

  const scaled = amount * scale;
  if (scaled <= 0) return '';

  const whole = Math.floor(scaled);
  const remainder = scaled - whole;

  for (const [value, symbol] of CULINARY_FRACTIONS) {
    if (Math.abs(remainder - value) < 0.03) {
      if (value === 1) {
        return String(whole + 1);
      }
      if (whole === 0) {
        return symbol || '0';
      }
      return symbol ? `${whole}${symbol}` : String(whole);
    }
  }

  return Number(scaled.toFixed(1)).toString();
}

export interface RecipePanelProps {
  dish: DishRecipe;
  nextDish: DishRecipe;
  prevDish: DishRecipe;
  activeDishIndex: number;
  totalDishes: number;
  highlightedPart: string | null;
  onHoverPart: (partId: string | null) => void;
  onSelectPart: (partId: string | null) => void;
  onSelectDish: (id: DishId, direction?: 1 | -1) => void;
  onShare: () => void;
  onNativeShare?: () => void;
  shareCopied: boolean;
  scale: ScaleFactor;
  onChangeScale: (scale: ScaleFactor) => void;
  checkedMap: Record<string, boolean>;
  onToggleIngredient: (ingredientId: string) => void;
  onResetChecked: () => void;
  onOpenCookMode: () => void;
  onOpenMenu: () => void;
  onOpenAbout: () => void;
}

export function RecipePanel({
  dish,
  nextDish,
  prevDish,
  activeDishIndex,
  totalDishes,
  highlightedPart,
  onHoverPart,
  onSelectPart,
  onSelectDish,
  onShare,
  onNativeShare,
  shareCopied,
  scale,
  onChangeScale,
  checkedMap,
  onToggleIngredient,
  onResetChecked,
  onOpenCookMode,
  onOpenMenu,
  onOpenAbout,
}: RecipePanelProps) {
  const [sharePopoverOpen, setSharePopoverOpen] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const sharePopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== 'undefined' && typeof navigator.share === 'function'
    );
  }, []);

  // Close share popover when switching dishes
  useEffect(() => {
    setSharePopoverOpen(false);
  }, [dish.id]);

  // Close share popover on outside click or Escape
  useEffect(() => {
    if (!sharePopoverOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        sharePopoverRef.current &&
        !sharePopoverRef.current.contains(event.target as Node)
      ) {
        setSharePopoverOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setSharePopoverOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [sharePopoverOpen]);

  const canonicalDishUrl = `https://www.stanley.eat/dish/${dish.id}`;
  const xShareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `Checking out ${dish.name} in interactive 3D on stanley.eat by @stanleycyang`
  )}&url=${encodeURIComponent(canonicalDishUrl)}`;
  const linkedInShareHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    canonicalDishUrl
  )}`;
  const partLookup = useMemo(() => {
    const map: Record<string, string> = {};
    for (const part of dish.parts) {
      map[part.id] = part.label;
    }
    return map;
  }, [dish.parts]);

  const activePart = useMemo(
    () => dish.parts.find((part) => part.id === highlightedPart) ?? null,
    [dish.parts, highlightedPart]
  );

  const checkedCount = useMemo(
    () => dish.ingredients.filter((item) => Boolean(checkedMap[item.id])).length,
    [dish.ingredients, checkedMap]
  );

  const totalIngredients = dish.ingredients.length;
  const prepPercent =
    totalIngredients > 0 ? Math.round((checkedCount / totalIngredients) * 100) : 0;
  const isAllPrepped = totalIngredients > 0 && checkedCount === totalIngredients;

  const totalServings = dish.baseServings * scale;
  const courseNum = String(activeDishIndex + 1).padStart(2, '0');
  const totalNum = String(totalDishes).padStart(2, '0');
  const nextCourseNum = String(((activeDishIndex + 1) % totalDishes) + 1).padStart(
    2,
    '0'
  );

  return (
    <div className="w-full">
      {/* Sleek Sticky Editorial Utility Ribbon */}
      <div className="sticky top-0 z-20 rounded-t-[28px] border-b border-[#E6DDD0]/85 bg-[#FFFDF9]/92 backdrop-blur-md lg:rounded-none">
        <div className="mx-auto flex h-12 w-full max-w-[640px] items-center justify-between gap-2 px-5 sm:px-8 lg:px-10">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label={`Course ${courseNum} of ${totalNum}: ${dish.shortLabel}. Open tasting menu`}
            className="group flex min-w-0 items-center gap-2 rounded-full py-1 pr-2 text-left transition-colors hover:text-[#D9381E] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
          >
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#E6DDD0] bg-[#FAF7F2] px-2 py-0.5 font-mono text-[10.5px] font-semibold text-[#575049] transition-colors group-hover:border-[#D9381E]/40 group-hover:bg-[#FFF5F0] group-hover:text-[#D9381E]">
              <LayoutGrid className="h-3 w-3 text-[#D9381E]" aria-hidden="true" />
              <span>
                Course {courseNum} of {totalNum}
              </span>
            </span>
            <span className="truncate font-serif text-[13.5px] font-semibold text-[#1C1917] group-hover:text-[#D9381E] transition-colors">
              {dish.shortLabel}
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenCookMode}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#C63018] bg-[#D9381E] px-3 py-1 text-[11.5px] font-semibold text-[#FFFDF9] shadow-[0_3px_10px_-3px_rgba(217,56,30,0.45)] transition-all hover:bg-[#C33119] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
            >
              <Play className="h-3 w-3 fill-current" aria-hidden="true" />
              <span>Cook</span>
            </button>

            <div ref={sharePopoverRef} className="relative">
              <button
                type="button"
                onClick={() => setSharePopoverOpen((prev) => !prev)}
                aria-expanded={sharePopoverOpen}
                aria-haspopup="menu"
                aria-label={
                  shareCopied
                    ? 'Recipe link copied to clipboard'
                    : `Share ${dish.name}`
                }
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] ${
                  shareCopied || sharePopoverOpen
                    ? 'border-[#D9381E] bg-[#FFF5F0] text-[#D9381E]'
                    : 'border-[#E6DDD0] bg-[#FAF7F2] text-[#3F3A34] hover:border-[#D6C8B6] hover:bg-[#EFE8DC]/70'
                }`}
              >
                {shareCopied ? (
                  <>
                    <Check className="h-3 w-3" aria-hidden="true" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3 w-3 text-[#6B6258]" aria-hidden="true" />
                    <span className="hidden sm:inline">Share</span>
                  </>
                )}
              </button>

              {sharePopoverOpen && (
                <div
                  role="menu"
                  aria-label={`Share ${dish.name}`}
                  className="absolute top-full right-0 z-30 mt-2 w-64 origin-top-right rounded-2xl border border-[#E6DDD0] bg-[#FFFDF9]/98 p-2 text-[#1C1917] shadow-[0_18px_44px_-12px_rgba(28,25,23,0.24)] backdrop-blur-md"
                >
                  <div className="mb-1.5 border-b border-[#EFE8DC] px-2.5 pt-1 pb-2">
                    <p className="font-serif text-[13px] font-semibold text-[#1C1917]">
                      Share {dish.shortLabel}
                    </p>
                    <p className="truncate font-mono text-[10.5px] text-[#8A7E71]">
                      stanley.eat/dish/{dish.id}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={onShare}
                      className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-[#1C1917] transition-colors hover:bg-[#FAF7F2] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
                    >
                      <span className="flex items-center gap-2">
                        {shareCopied ? (
                          <Check
                            className="h-3.5 w-3.5 text-[#D9381E]"
                            aria-hidden="true"
                          />
                        ) : (
                          <Link2
                            className="h-3.5 w-3.5 text-[#6B6258]"
                            aria-hidden="true"
                          />
                        )}
                        <span>{shareCopied ? 'Copied!' : 'Copy Dish Link'}</span>
                      </span>
                      {shareCopied && (
                        <span className="font-mono text-[10px] font-semibold text-[#D9381E]">
                          Ready
                        </span>
                      )}
                    </button>

                    <a
                      role="menuitem"
                      href={xShareHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setSharePopoverOpen(false)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-[#1C1917] transition-colors hover:bg-[#FAF7F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="flex h-3.5 w-3.5 items-center justify-center font-mono text-[11px] font-bold text-[#1C1917]"
                        >
                          𝕏
                        </span>
                        <span>Share on X</span>
                      </span>
                      <ExternalLink
                        className="h-3 w-3 text-[#9B8E80]"
                        aria-hidden="true"
                      />
                    </a>

                    <a
                      role="menuitem"
                      href={linkedInShareHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setSharePopoverOpen(false)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-[#1C1917] transition-colors hover:bg-[#FAF7F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="flex h-3.5 w-3.5 items-center justify-center rounded-[3px] bg-[#6B6258]/15 font-sans text-[9.5px] font-bold text-[#3F3A34]"
                        >
                          in
                        </span>
                        <span>Share on LinkedIn</span>
                      </span>
                      <ExternalLink
                        className="h-3 w-3 text-[#9B8E80]"
                        aria-hidden="true"
                      />
                    </a>

                    {canNativeShare && onNativeShare && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setSharePopoverOpen(false);
                          onNativeShare();
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-xl border-t border-[#EFE8DC] mt-1 pt-2 px-2.5 py-2 text-left text-xs font-medium text-[#D9381E] transition-colors hover:bg-[#FFF5F0] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
                      >
                        <span className="flex items-center gap-2">
                          <MessageSquareShare
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          <span>More / iMessage…</span>
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <article className="mx-auto w-full max-w-[640px] px-5 pt-6 pb-8 sm:px-8 sm:pt-7 sm:pb-10 lg:px-10 lg:pt-8 lg:pb-10">
        {/* Top Editorial Meta Row: Cuisine + Vibe Tag + Served Hot */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E6DDD0] bg-[#FAF7F2] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6258]">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: dish.accentColor }}
              />
              {dish.cuisine}
            </span>

            {dish.vibeTag && (
              <span className="inline-flex items-center rounded-full border border-[#E4D9C8] bg-[#EFE8DC]/75 px-2.5 py-1 text-[11px] font-medium tracking-[0.01em] text-[#575049]">
                {dish.vibeTag}
              </span>
            )}

            {dish.isHot && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#F0D9CE] bg-[#FFF5F0] px-2.5 py-1 text-[11px] font-medium text-[#B8321B]">
                <Flame className="h-3 w-3" aria-hidden="true" />
                Served Hot
              </span>
            )}
          </div>

          {/* Dish Title, Subtitle & Description */}
          <div className="space-y-2">
            <h1 className="font-serif text-[32px] sm:text-[38px] font-semibold tracking-[-0.025em] leading-[1.1] text-[#1C1917]">
              {dish.name}
            </h1>
            <p className="font-serif text-[16px] sm:text-[17px] italic text-[#6B6258] leading-snug">
              {dish.subtitle}
            </p>
          </div>

          <p className="text-[15px] leading-[1.7] text-[#443E37]">
            {dish.description}
          </p>

          {/* Stanley's Field Note */}
          {dish.fieldNote && (
            <blockquote className="rounded-r-xl border-l-2 border-[#D9381E]/60 bg-[#FAF7F2]/85 px-4 py-3">
              <span className="mb-1 block font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#8A7E71]">
                Stanley&apos;s Field Note
              </span>
              <p className="font-serif text-[14.5px] italic leading-[1.62] text-[#3F3730]">
                &ldquo;{dish.fieldNote}&rdquo;
              </p>
            </blockquote>
          )}
        </header>

        {/* Cookbook Spec Strip: Prep, Cook, Servings, Spice Level */}
        <section
          aria-label="Recipe overview"
          className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-[#E6DDD0] bg-[#FAF7F2] p-4 sm:grid-cols-4"
        >
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#6B6258]">
              <Clock className="h-3.5 w-3.5 text-[#8A7E71]" aria-hidden="true" />
              Prep
            </span>
            <span className="font-mono text-[13px] font-medium text-[#1C1917]">
              {dish.prepTime}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#6B6258]">
              <Timer className="h-3.5 w-3.5 text-[#8A7E71]" aria-hidden="true" />
              Cook
            </span>
            <span className="font-mono text-[13px] font-medium text-[#1C1917]">
              {dish.cookTime}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#6B6258]">
              <Users className="h-3.5 w-3.5 text-[#8A7E71]" aria-hidden="true" />
              Servings
            </span>
            <span className="font-mono text-[13px] font-medium text-[#1C1917]">
              <span className={scale > 1 ? 'text-[#D9381E] font-semibold' : ''}>
                {totalServings}
              </span>{' '}
              {totalServings === 1 ? 'serving' : 'servings'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#6B6258]">
              Spice · {SPICE_LABELS[dish.spiceLevel]}
            </span>
            <div
              className="flex items-center gap-0.5 pt-0.5"
              aria-label={`Spice level ${dish.spiceLevel} out of 5 (${SPICE_LABELS[dish.spiceLevel]})`}
              role="img"
            >
              {([1, 2, 3, 4, 5] as const).map((level) => {
                const active = level <= dish.spiceLevel;
                return (
                  <Flame
                    key={level}
                    aria-hidden="true"
                    className={`h-4 w-4 transition-colors ${
                      active
                        ? 'fill-[#D9381E] text-[#D9381E]'
                        : 'fill-transparent text-[#DDD3C5]'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </section>

        {/* Prominent Hands-Free Cook Mode CTA */}
        <div className="mt-4">
          <button
            type="button"
            onClick={onOpenCookMode}
            className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-[#C63018] bg-[#D9381E] px-4 py-3 text-left text-[#FFFDF9] shadow-[0_8px_22px_-8px_rgba(217,56,30,0.5),inset_0_1px_1px_rgba(255,255,255,0.24)] transition-all duration-200 hover:bg-[#C73119] active:scale-[0.995] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF9]"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFFDF9]/18 transition-transform duration-200 group-hover:scale-105">
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              </span>
              <span className="flex flex-col">
                <span className="text-[14px] font-semibold tracking-[-0.01em] leading-tight">
                  Start Cooking
                </span>
                <span className="text-[11.5px] text-[#FFE8E0]/90">
                  Hands-free counter view · auto timers &amp; screen awake
                </span>
              </span>
            </span>
            <span className="hidden sm:inline-flex shrink-0 items-center rounded-md border border-[#FFFDF9]/25 bg-[#FFFDF9]/12 px-2 py-0.5 font-mono text-[11px] font-medium text-[#FFFDF9]">
              C
            </span>
          </button>
        </div>

        {/* Interactive 3D Component Legend / Layer Chips */}
        <section aria-label="3D dish layers" className="mt-7">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6258]">
              <Layers className="h-3.5 w-3.5 text-[#D9381E]" aria-hidden="true" />
              3D Dish Anatomy
            </h2>
            <span className="text-[11px] text-[#8C8175]">
              Hover to pulse · click to focus camera
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {dish.parts.map((part) => {
              const isHighlighted = highlightedPart === part.id;
              return (
                <button
                  key={part.id}
                  type="button"
                  onMouseEnter={() => onHoverPart(part.id)}
                  onMouseLeave={() => onHoverPart(null)}
                  onFocus={() => onHoverPart(part.id)}
                  onBlur={() => onHoverPart(null)}
                  onClick={() => onSelectPart(part.id)}
                  aria-pressed={isHighlighted}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] focus-visible:ring-offset-1 focus-visible:ring-offset-[#FFFDF9] ${
                    isHighlighted
                      ? 'border-[#D9381E] bg-[#D9381E] text-[#FFFDF9] shadow-[0_4px_12px_-3px_rgba(217,56,30,0.42)]'
                      : 'border-[#E6DDD0] bg-[#FAF7F2] text-[#3F3A34] hover:border-[#D9381E]/45 hover:bg-[#FFF5F0] hover:text-[#1C1917]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                      isHighlighted ? 'bg-[#FFFDF9]' : 'bg-[#D9381E]/75'
                    }`}
                  />
                  {part.label}
                </button>
              );
            })}
          </div>

          {activePart && (
            <div className="mt-2.5 flex items-start justify-between gap-3 rounded-xl border border-[#F0D5C8] bg-[#FFF6F1] px-3.5 py-2.5 text-xs leading-relaxed text-[#4E392F]">
              <p>
                <span className="font-semibold text-[#B8321B]">
                  {activePart.label}:{' '}
                </span>
                {activePart.description}
              </p>
              <button
                type="button"
                onClick={() => {
                  onHoverPart(null);
                  onSelectPart(null);
                }}
                className="shrink-0 font-medium text-[#8C6D60] hover:text-[#D9381E] cursor-pointer"
                aria-label="Clear highlighted 3D layer"
              >
                Clear
              </button>
            </div>
          )}
        </section>

        <hr className="my-8 border-[#E6DDD0]" />

        {/* Ingredients Section + Prep Progress Bar + 1x / 2x / 4x Scaler */}
        <section aria-labelledby="ingredients-heading">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2
                id="ingredients-heading"
                className="font-serif text-[23px] font-semibold tracking-[-0.02em] text-[#1C1917]"
              >
                Ingredients
              </h2>

              <span
                className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium transition-colors ${
                  isAllPrepped
                    ? 'bg-[#E8F5E9] text-[#26612A]'
                    : checkedCount > 0
                      ? 'bg-[#FFF0EA] text-[#C63018]'
                      : 'bg-[#F3ECE1] text-[#786E63]'
                }`}
              >
                {isAllPrepped
                  ? 'All prepped!'
                  : `${checkedCount} / ${totalIngredients} prepped`}
              </span>

              {checkedCount > 0 && (
                <button
                  type="button"
                  onClick={onResetChecked}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-[#6B6258] transition-colors hover:bg-[#EFE8DC] hover:text-[#D9381E] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  Reset
                </button>
              )}
            </div>

            {/* Segmented Serving Scaler */}
            <div
              role="group"
              aria-label="Scale recipe servings"
              className="inline-flex items-center rounded-full border border-[#E6DDD0] bg-[#FAF7F2] p-0.5"
            >
              {SCALE_OPTIONS.map((option) => {
                const isSelected = scale === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onChangeScale(option)}
                    aria-pressed={isSelected}
                    className={`rounded-full px-3 py-1 font-mono text-xs font-semibold transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] ${
                      isSelected
                        ? 'bg-[#D9381E] text-[#FFFDF9] shadow-[0_2px_8px_-2px_rgba(217,56,30,0.45)]'
                        : 'text-[#6B6258] hover:text-[#1C1917]'
                    }`}
                  >
                    {option}x
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sleek Prep Progress Bar */}
          <div
            role="progressbar"
            aria-label="Ingredient preparation progress"
            aria-valuenow={checkedCount}
            aria-valuemin={0}
            aria-valuemax={totalIngredients}
            className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-[#EFE8DC]"
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${
                isAllPrepped ? 'bg-[#2E7D32]' : 'bg-[#D9381E]'
              }`}
              style={{ width: `${prepPercent}%` }}
            />
          </div>

          <ul className="space-y-1.5">
            {dish.ingredients.map((ingredient) => {
              const isChecked = Boolean(checkedMap[ingredient.id]);
              const formattedAmount = formatCulinaryAmount(ingredient.amount, scale);
              const hasPart = Boolean(ingredient.partId);
              const isPartHighlighted =
                Boolean(ingredient.partId) && highlightedPart === ingredient.partId;
              const linkedPartLabel = ingredient.partId
                ? partLookup[ingredient.partId]
                : undefined;

              const measurementText = [formattedAmount, ingredient.unit]
                .filter(Boolean)
                .join(' ');

              return (
                <li
                  key={ingredient.id}
                  onMouseEnter={() => {
                    if (ingredient.partId) {
                      onHoverPart(ingredient.partId);
                    }
                  }}
                  onMouseLeave={() => {
                    if (ingredient.partId) {
                      onHoverPart(null);
                    }
                  }}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isChecked}
                    onClick={() => onToggleIngredient(ingredient.id)}
                    className={`group flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] ${
                      isPartHighlighted
                        ? 'border-[#D9381E]/40 bg-[#FFF5F0] shadow-[0_2px_10px_-4px_rgba(217,56,30,0.18)]'
                        : 'border-transparent hover:border-[#E6DDD0] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    {/* Custom Tactile Checkbox */}
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-all duration-150 ${
                        isChecked
                          ? 'border-[#D9381E] bg-[#D9381E] text-[#FFFDF9]'
                          : 'border-[#CFC4B4] bg-[#FFFDF9] group-hover:border-[#D9381E]/70'
                      }`}
                    >
                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                    </span>

                    {/* Ingredient Measurement + Name + Note */}
                    <span className="flex-1 text-[14.5px] leading-[1.45]">
                      {measurementText && (
                        <span
                          className={`mr-1.5 font-mono text-[13px] font-semibold ${
                            isChecked
                              ? 'text-[#A69C90] line-through'
                              : scale > 1 && ingredient.amount !== null
                                ? 'text-[#D9381E]'
                                : 'text-[#1C1917]'
                          }`}
                        >
                          {measurementText}
                        </span>
                      )}
                      <span
                        className={`font-medium transition-colors ${
                          isChecked ? 'text-[#A69C90] line-through' : 'text-[#292524]'
                        }`}
                      >
                        {ingredient.name}
                      </span>
                      {ingredient.note && (
                        <span
                          className={`ml-1.5 text-[13px] ${
                            isChecked ? 'text-[#B5ACA1] line-through' : 'text-[#786E63]'
                          }`}
                        >
                          — {ingredient.note}
                        </span>
                      )}
                    </span>

                    {/* Subtle 3D Part Link Dot / Tag */}
                    {hasPart && (
                      <span
                        title={
                          linkedPartLabel
                            ? `Linked to 3D layer: ${linkedPartLabel}`
                            : 'Linked to 3D model layer'
                        }
                        className={`mt-1 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] transition-all duration-150 ${
                          isPartHighlighted
                            ? 'bg-[#D9381E] text-[#FFFDF9]'
                            : 'bg-[#F2EAE0] text-[#8A7E71] group-hover:bg-[#FFE8DF] group-hover:text-[#D9381E]'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`h-1.5 w-1.5 rounded-full ${
                            isPartHighlighted ? 'bg-[#FFFDF9]' : 'bg-[#D9381E]/70'
                          }`}
                        />
                        3D
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Pantry Specs: Compact Scannable Go-To Brands */}
        {dish.pantrySpecs && dish.pantrySpecs.length > 0 && (
          <section
            aria-labelledby="pantry-specs-heading"
            className="mt-7 rounded-2xl border border-[#E6DDD0] bg-[#FAF7F2] p-4 sm:p-5"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3
                id="pantry-specs-heading"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6258]"
              >
                <Bookmark className="h-3.5 w-3.5 text-[#D9381E]" aria-hidden="true" />
                Pantry Specs
              </h3>
              <span className="font-mono text-[10.5px] text-[#8A7E71]">
                Exact brands in my kitchen
              </span>
            </div>

            <dl className="divide-y divide-[#E6DDD0]/80">
              {dish.pantrySpecs.map((spec) => (
                <div
                  key={`${spec.item}-${spec.brand}`}
                  className="py-2.5 first:pt-0.5 last:pb-0.5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-[#786E63]">
                      {spec.item}
                    </dt>
                    <dd className="text-[13.5px] font-semibold text-[#1C1917]">
                      {spec.brand}
                    </dd>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-[1.55] text-[#5C534A]">
                    {spec.why}
                  </p>
                </div>
              ))}
            </dl>
          </section>
        )}

        <hr className="my-8 border-[#E6DDD0]" />

        {/* Clean Numbered Cooking Steps */}
        <section aria-labelledby="steps-heading">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-baseline gap-2.5">
              <h2
                id="steps-heading"
                className="font-serif text-[23px] font-semibold tracking-[-0.02em] text-[#1C1917]"
              >
                Method
              </h2>
              <span className="font-mono text-xs text-[#8A7E71]">
                {dish.steps.length} {dish.steps.length === 1 ? 'step' : 'steps'}
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenCookMode}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E6DDD0] bg-[#FAF7F2] px-3 py-1 text-xs font-semibold text-[#1C1917] transition-all hover:border-[#D9381E]/50 hover:bg-[#FFF5F0] hover:text-[#D9381E] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
            >
              <Play className="h-3 w-3 fill-current text-[#D9381E]" aria-hidden="true" />
              Cook Mode
            </button>
          </div>

          <ol className="space-y-5">
            {dish.steps.map((step, index) => (
              <li key={index} className="group flex items-start gap-3.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#E6DDD0] bg-[#FAF7F2] font-mono text-xs font-semibold text-[#D9381E] transition-colors group-hover:border-[#D9381E]/40 group-hover:bg-[#FFF5F0]"
                >
                  {index + 1}
                </span>
                <p className="flex-1 text-[15px] leading-[1.72] text-[#292524]">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Stanley's Tip Callout Box */}
        <aside
          aria-label="Stanley's Tip"
          className="mt-9 rounded-2xl border border-[#E6D8C6] border-l-4 border-l-[#D9381E] bg-[#F7EFE4] p-5 shadow-[0_6px_20px_-10px_rgba(68,48,28,0.12)]"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#D9381E]/12 text-[#D9381E]">
              <ChefHat className="h-4 w-4" aria-hidden="true" />
            </span>
            <h3 className="font-serif text-[16px] font-semibold tracking-[-0.01em] text-[#1C1917]">
              Stanley&apos;s Tip
            </h3>
            <Sparkles className="ml-auto h-4 w-4 text-[#D9381E]/75" aria-hidden="true" />
          </div>
          <p className="text-[14.5px] leading-[1.68] text-[#3F3730]">
            {dish.stanleysTip}
          </p>
        </aside>

        {/* Too Lazy to Cook? Bay Area Go-To Spots */}
        {dish.localSpots && dish.localSpots.length > 0 && (
          <section
            aria-labelledby="local-spots-heading"
            className="mt-5 rounded-2xl border border-[#E6DDD0] bg-[#FAF7F2] p-5"
          >
            <div className="mb-3.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EFE8DC] text-[#D9381E]">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <div>
                  <h3
                    id="local-spots-heading"
                    className="font-serif text-[15.5px] font-semibold leading-tight text-[#1C1917]"
                  >
                    Too Lazy to Cook?
                  </h3>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#8A7E71]">
                    Bay Area Go-To Spots
                  </p>
                </div>
              </div>
            </div>

            <ul className="space-y-3">
              {dish.localSpots.map((spot) => (
                <li
                  key={`${spot.name}-${spot.area}`}
                  className="rounded-xl border border-[#E8DFD2] bg-[#FFFDF9] px-3.5 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[14px] font-semibold text-[#1C1917]">
                      {spot.name}
                    </span>
                    <span className="rounded-full border border-[#E6DDD0] bg-[#FAF7F2] px-2.5 py-0.5 font-mono text-[10.5px] font-medium text-[#6B6258]">
                      {spot.area}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] leading-[1.55] text-[#5C534A]">
                    {spot.note}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Editorial "Next Course ->" Cookbook Page-Turn Block */}
        <section aria-label="Turn to next course" className="mt-8 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onSelectDish(prevDish.id, -1)}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-[#6B6258] transition-colors hover:bg-[#FAF7F2] hover:text-[#1C1917] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{prevDish.shortLabel}</span>
            </button>

            <button
              type="button"
              onClick={onOpenMenu}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium text-[#786E63] transition-colors hover:bg-[#FAF7F2] hover:text-[#D9381E] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
            >
              <LayoutGrid className="h-3 w-3" aria-hidden="true" />
              <span>All {totalDishes} Courses</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onSelectDish(nextDish.id, 1)}
            className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-[#E6DDD0] bg-[#FAF7F2] p-5 text-left transition-all duration-200 hover:border-[#D9381E]/45 hover:bg-[#FFF7F3] hover:shadow-[0_12px_28px_-14px_rgba(217,56,30,0.22)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: nextDish.accentColor }}
                />
                <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#D9381E]">
                  Next Course · {nextCourseNum} / {totalNum}
                </span>
              </div>
              <p className="font-serif text-xl sm:text-[22px] font-semibold tracking-[-0.02em] text-[#1C1917] group-hover:text-[#D9381E] transition-colors">
                {nextDish.name}
              </p>
              <p className="line-clamp-1 text-[13px] text-[#6B6258]">
                {nextDish.subtitle}
              </p>
            </div>

            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E2D4C4] bg-[#FFFDF9] text-[#D9381E] shadow-xs transition-all duration-200 group-hover:border-[#D9381E] group-hover:bg-[#D9381E] group-hover:text-[#FFFDF9]">
              <ArrowRight
                className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </button>
        </section>

        {/* Minimal Editorial Colophon Footer */}
        <footer className="mt-10 border-t border-[#E6DDD0] pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[11.5px] font-medium text-[#1C1917]">
              Stanley Yang
            </p>
            <div className="flex flex-wrap items-center gap-4 text-[12px] font-medium text-[#6B6258]">
              <button
                type="button"
                onClick={onOpenAbout}
                className="font-semibold text-[#1C1917] transition-colors hover:text-[#D9381E] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] rounded-sm"
              >
                About
              </button>
              <a
                href="https://stanleycyang.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 transition-colors hover:text-[#D9381E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] rounded-sm"
              >
                stanleycyang.com
                <ExternalLink className="h-3 w-3 opacity-65" aria-hidden="true" />
              </a>
              <a
                href="https://github.com/stanleycyang"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 transition-colors hover:text-[#D9381E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] rounded-sm"
              >
                GitHub
                <ExternalLink className="h-3 w-3 opacity-65" aria-hidden="true" />
              </a>
              <a
                href="https://x.com/stanleycyang"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 transition-colors hover:text-[#D9381E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] rounded-sm"
              >
                X
                <ExternalLink className="h-3 w-3 opacity-65" aria-hidden="true" />
              </a>
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}

export default RecipePanel;

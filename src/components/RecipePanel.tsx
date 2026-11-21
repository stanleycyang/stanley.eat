'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  ChefHat,
  Clock,
  Flame,
  Layers,
  RotateCcw,
  Share2,
  Sparkles,
  Timer,
  Users,
} from 'lucide-react';
import type { DishId, DishRecipe } from '@/types/dish';

export interface RecipePanelProps {
  dish: DishRecipe;
  highlightedPart: string | null;
  onHoverPart: (partId: string | null) => void;
  onSelectPart: (partId: string | null) => void;
  onShare: () => void;
  shareCopied: boolean;
}

type ScaleFactor = 1 | 2 | 4;

const SCALE_OPTIONS: readonly ScaleFactor[] = [1, 2, 4];

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

function formatCulinaryAmount(amount: number | null, scale: ScaleFactor): string {
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

export function RecipePanel({
  dish,
  highlightedPart,
  onHoverPart,
  onSelectPart,
  onShare,
  shareCopied,
}: RecipePanelProps) {
  const [scaleByDish, setScaleByDish] = useState<Partial<Record<DishId, ScaleFactor>>>({});
  const [checkedByDish, setCheckedByDish] = useState<
    Partial<Record<DishId, Record<string, boolean>>>
  >({});

  const scale: ScaleFactor = scaleByDish[dish.id] ?? 1;
  const checkedMap = useMemo(
    () => checkedByDish[dish.id] ?? {},
    [checkedByDish, dish.id]
  );

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

  const totalServings = dish.baseServings * scale;

  const handleSetScale = (nextScale: ScaleFactor) => {
    setScaleByDish((prev) => ({
      ...prev,
      [dish.id]: nextScale,
    }));
  };

  const handleToggleIngredient = (ingredientId: string) => {
    setCheckedByDish((prev) => {
      const currentDishMap = prev[dish.id] ?? {};
      return {
        ...prev,
        [dish.id]: {
          ...currentDishMap,
          [ingredientId]: !currentDishMap[ingredientId],
        },
      };
    });
  };

  const handleResetChecked = () => {
    setCheckedByDish((prev) => ({
      ...prev,
      [dish.id]: {},
    }));
  };

  return (
    <article className="mx-auto w-full max-w-[640px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
      {/* Top Editorial Meta Row: Cuisine Tag + Share Button */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E6DDD0] bg-[#FAF7F2] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6258]">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-[#D9381E]"
              />
              {dish.cuisine}
            </span>
            {dish.isHot && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#F0D9CE] bg-[#FFF5F0] px-2.5 py-1 text-[11px] font-medium text-[#B8321B]">
                <Flame className="h-3 w-3" aria-hidden="true" />
                Served Hot
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onShare}
            aria-label={shareCopied ? 'Recipe link copied to clipboard' : `Share ${dish.name} recipe link`}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF9] ${
              shareCopied
                ? 'border-[#D9381E] bg-[#D9381E] text-[#FFFDF9] shadow-[0_4px_12px_-3px_rgba(217,56,30,0.45)]'
                : 'border-[#E6DDD0] bg-[#FAF7F2] text-[#1C1917] hover:border-[#D6C8B6] hover:bg-[#EFE8DC]/70 clay-pill'
            }`}
          >
            {shareCopied ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 text-[#6B6258]" aria-hidden="true" />
                <span>Share</span>
              </>
            )}
          </button>
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

      {/* Interactive 3D Component Legend / Layer Chips */}
      <section aria-label="3D dish layers" className="mt-7">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <h2 className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6258]">
            <Layers className="h-3.5 w-3.5 text-[#D9381E]" aria-hidden="true" />
            3D Dish Anatomy
          </h2>
          <span className="text-[11px] text-[#8C8175]">
            Hover or click to highlight
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
              <span className="font-semibold text-[#B8321B]">{activePart.label}: </span>
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

      {/* Ingredients Section + 1x / 2x / 4x Scaler */}
      <section aria-labelledby="ingredients-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2
              id="ingredients-heading"
              className="font-serif text-[23px] font-semibold tracking-[-0.02em] text-[#1C1917]"
            >
              Ingredients
            </h2>

            {checkedCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-[#EFE8DC] px-2 py-0.5 font-mono text-[11px] font-medium text-[#575049]">
                  {checkedCount}/{dish.ingredients.length}
                </span>
                <button
                  type="button"
                  onClick={handleResetChecked}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-[#6B6258] transition-colors hover:bg-[#EFE8DC] hover:text-[#D9381E] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  Reset
                </button>
              </div>
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
                  onClick={() => handleSetScale(option)}
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
                  onClick={() => handleToggleIngredient(ingredient.id)}
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

      <hr className="my-8 border-[#E6DDD0]" />

      {/* Clean Numbered Cooking Steps */}
      <section aria-labelledby="steps-heading">
        <div className="mb-5 flex items-baseline justify-between gap-2">
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
    </article>
  );
}

export default RecipePanel;

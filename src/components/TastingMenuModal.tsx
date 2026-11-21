'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { ArrowRight, Clock, Flame, X } from 'lucide-react';
import type { DishId, DishRecipe } from '@/types/dish';

export interface TastingMenuModalProps {
  dishes: DishRecipe[];
  activeDishId: DishId;
  isOpen: boolean;
  onClose: () => void;
  onSelectDish: (id: DishId, direction?: 1 | -1) => void;
  onOpenAbout: () => void;
  checkedCountsByDish: Partial<Record<DishId, number>>;
}

function getShortestDirection(
  fromIndex: number,
  toIndex: number,
  total: number
): 1 | -1 {
  if (fromIndex === toIndex || total <= 1) return 1;
  const forward = (toIndex - fromIndex + total) % total;
  const backward = (fromIndex - toIndex + total) % total;
  return forward <= backward ? 1 : -1;
}

export function TastingMenuModal({
  dishes,
  activeDishId,
  isOpen,
  onClose,
  onSelectDish,
  onOpenAbout,
  checkedCountsByDish,
}: TastingMenuModalProps) {
  // Lock body scroll and handle Escape while open
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeIndex = Math.max(
    0,
    dishes.findIndex((dish) => dish.id === activeDishId)
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tasting-menu-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/38 p-3 sm:p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-[#E6DDD0] bg-[#FAF7F2] text-[#1C1917] shadow-[0_28px_80px_-20px_rgba(28,25,23,0.38)]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Editorial Tasting Menu Header */}
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#E6DDD0] bg-[#FFFDF9]/95 px-5 py-4 sm:px-7 sm:py-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Image
                src="/logo-mark.png"
                alt=""
                width={20}
                height={20}
                className="h-5 w-5 shrink-0"
              />
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#D9381E]">
                stanley.eat · 7-Course Tasting Menu
              </p>
            </div>
            <h2
              id="tasting-menu-title"
              className="font-serif text-2xl sm:text-[28px] font-semibold tracking-[-0.025em] text-[#1C1917]"
            >
              Stanley&apos;s Tasting Menu
            </h2>
            <p className="max-w-xl text-[13.5px] sm:text-sm leading-relaxed text-[#6B6258]">
              The 7 dishes I cook on repeat, obsess over, and chase around the Bay Area.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onOpenAbout}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#E6DDD0] bg-[#FAF7F2] px-3.5 py-1.5 text-xs font-semibold text-[#1C1917] transition-all hover:border-[#D9381E]/45 hover:bg-[#FFF5F0] hover:text-[#D9381E] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
            >
              <span>About Stanley</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close tasting menu"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E6DDD0] bg-[#FAF7F2] text-[#575049] transition-colors hover:border-[#D9381E]/40 hover:bg-[#FFF5F0] hover:text-[#1C1917] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Responsive 7-Course Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            {dishes.map((dish, idx) => {
              const isActive = dish.id === activeDishId;
              const courseNum = String(idx + 1).padStart(2, '0');
              const preppedCount = checkedCountsByDish[dish.id] ?? 0;

              return (
                <button
                  key={dish.id}
                  type="button"
                  onClick={() => {
                    onSelectDish(
                      dish.id,
                      getShortestDirection(activeIndex, idx, dishes.length)
                    );
                    onClose();
                  }}
                  className={`group flex flex-col justify-between gap-3 rounded-2xl border p-4 sm:p-5 text-left transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] ${
                    isActive
                      ? 'border-[#D9381E]/60 bg-[#FFFDF9] ring-1 ring-[#D9381E]/20 shadow-[0_12px_28px_-14px_rgba(217,56,30,0.28)]'
                      : 'border-[#E6DDD0] bg-[#FFFDF9] hover:border-[#D9381E]/40 hover:bg-[#FFFDFB] hover:shadow-[0_12px_28px_-14px_rgba(28,25,23,0.18)]'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Top Course Number + Accent Dot + Status Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold tracking-[0.06em] text-[#8A7E71]">
                          {courseNum}
                        </span>
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 rounded-full ring-2 ring-[#FAF7F2]"
                          style={{ backgroundColor: dish.accentColor }}
                        />
                        <span aria-hidden="true" className="text-lg leading-none">
                          {dish.emoji}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {preppedCount > 0 && (
                          <span className="rounded-full border border-[#E2D6C5] bg-[#FAF7F2] px-2 py-0.5 font-mono text-[10.5px] font-medium text-[#575049]">
                            {preppedCount}/{dish.ingredients.length} prepped
                          </span>
                        )}
                        {isActive && (
                          <span className="rounded-full bg-[#D9381E] px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#FFFDF9]">
                            Now Viewing
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dish Name & Tags */}
                    <div>
                      <h3 className="font-serif text-[19px] font-semibold tracking-[-0.015em] text-[#1C1917] transition-colors group-hover:text-[#D9381E]">
                        {dish.name}
                      </h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full border border-[#E6DDD0] bg-[#FAF7F2] px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#6B6258]">
                          {dish.cuisine}
                        </span>
                        {dish.vibeTag && (
                          <span className="rounded-full bg-[#EFE8DC]/80 px-2 py-0.5 text-[10.5px] font-medium text-[#575049]">
                            {dish.vibeTag}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 1-line Field Note Teaser */}
                    {dish.fieldNote && (
                      <p className="line-clamp-2 font-serif text-[12.5px] italic leading-relaxed text-[#5C534A]">
                        &ldquo;{dish.fieldNote}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Bottom Meta Row: Time + Spice Flames */}
                  <div className="flex items-center justify-between gap-3 border-t border-[#F0E8DC] pt-2.5">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#786E63]">
                      <Clock className="h-3.5 w-3.5 text-[#9B8E80]" aria-hidden="true" />
                      {dish.prepTime} prep · {dish.cookTime} cook
                    </span>

                    <div
                      className="flex items-center gap-0.5"
                      aria-label={`Spice level ${dish.spiceLevel} out of 5`}
                    >
                      {([1, 2, 3, 4, 5] as const).map((level) => (
                        <Flame
                          key={level}
                          aria-hidden="true"
                          className={`h-3.5 w-3.5 ${
                            level <= dish.spiceLevel
                              ? 'fill-[#D9381E] text-[#D9381E]'
                              : 'fill-transparent text-[#DDD3C5]'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Subtle Footer Bar */}
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#E6DDD0] bg-[#FFFDF9]/90 px-5 py-3 sm:px-7">
          <button
            type="button"
            onClick={onOpenAbout}
            className="sm:hidden inline-flex items-center gap-1 text-xs font-semibold text-[#D9381E] cursor-pointer"
          >
            <span>About Stanley</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <p className="font-mono text-[11px] text-[#8A7E71]">
            Click any course to slide it onto the 3D table
          </p>
          <p className="hidden sm:block font-mono text-[11px] text-[#8A7E71]">
            M Menu · ← → Switch · Esc Close
          </p>
        </footer>
      </div>
    </div>
  );
}

export default TastingMenuModal;

'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import type { DishId, DishRecipe } from '@/types/dish';

export interface DishDockProps {
  dishes: DishRecipe[];
  activeDishId: DishId;
  onSelectDish: (id: DishId, direction?: 1 | -1) => void;
  onOpenMenu: () => void;
  checkedCountsByDish?: Partial<Record<DishId, number>>;
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

export function DishDock({
  dishes,
  activeDishId,
  onSelectDish,
  onOpenMenu,
  checkedCountsByDish,
}: DishDockProps) {
  const [hoveredDotId, setHoveredDotId] = useState<DishId | null>(null);
  const [hoveredNav, setHoveredNav] = useState<'prev' | 'next' | null>(null);

  const total = dishes.length;
  const activeIndex = Math.max(
    0,
    dishes.findIndex((dish) => dish.id === activeDishId)
  );
  const activeDish = dishes[activeIndex] ?? dishes[0];
  const prevDish = dishes[(activeIndex - 1 + total) % total] ?? activeDish;
  const nextDish = dishes[(activeIndex + 1) % total] ?? activeDish;

  const courseNumber = String(activeIndex + 1).padStart(2, '0');
  const totalNumber = String(total).padStart(2, '0');

  return (
    <nav
      aria-label="Tasting course navigator"
      className="relative flex w-full max-w-[440px] sm:w-auto sm:min-w-[390px] items-center justify-between gap-2 rounded-full border border-[#E6DDD0] bg-[#FFFDF9]/92 p-1.5 backdrop-blur-md shadow-[0_14px_34px_-12px_rgba(28,25,23,0.18),0_2px_8px_-2px_rgba(28,25,23,0.08),inset_0_1px_0_rgba(255,255,255,0.92)]"
    >
      {/* Left Prev Dish Button */}
      <div className="relative shrink-0">
        {hoveredNav === 'prev' && (
          <div
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-0 mb-2.5 hidden sm:flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#E6DDD0] bg-[#FFFDF9]/96 px-3 py-1 text-[11.5px] font-medium text-[#1C1917] shadow-[0_10px_24px_-8px_rgba(28,25,23,0.2)] backdrop-blur-md"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#8A7E71]">
              Prev
            </span>
            <span aria-hidden="true">{prevDish.emoji}</span>
            <span>{prevDish.shortLabel}</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => onSelectDish(prevDish.id, -1)}
          onMouseEnter={() => setHoveredNav('prev')}
          onMouseLeave={() => setHoveredNav(null)}
          onFocus={() => setHoveredNav('prev')}
          onBlur={() => setHoveredNav(null)}
          aria-label={`Previous dish: ${prevDish.name}`}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EAE1D5] bg-[#FAF7F2] text-[#3F3A34] transition-all duration-150 hover:border-[#D9381E]/40 hover:bg-[#FFF5F0] hover:text-[#D9381E] active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
        >
          <ChevronLeft className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
      </div>

      {/* Center Course Navigator + 7 Interactive Course Dots */}
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 px-1">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label={`Open full 7-course tasting menu (currently ${activeDish.name})`}
          className="group flex max-w-full items-center gap-2 rounded-full px-2.5 py-0.5 transition-colors hover:bg-[#F3ECE1]/85 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
        >
          <span className="shrink-0 font-mono text-[11px] font-semibold tracking-[0.04em] text-[#D9381E]">
            {courseNumber}
            <span className="text-[#9E9284]">/{totalNumber}</span>
          </span>
          <span
            aria-hidden="true"
            className="h-1 w-1 shrink-0 rounded-full bg-[#CFC4B4]"
          />
          <span className="truncate font-serif text-[14.5px] font-semibold tracking-[-0.015em] text-[#1C1917] group-hover:text-[#D9381E] transition-colors">
            {activeDish.shortLabel}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#E6DDD0] bg-[#FAF7F2] px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[#6B6258] transition-colors group-hover:border-[#D9381E]/35 group-hover:bg-[#FFF5F0] group-hover:text-[#D9381E]">
            <LayoutGrid className="h-3 w-3" aria-hidden="true" />
            <span>Menu</span>
          </span>
        </button>

        {/* 7 Tactile Course Indicator Dots with Floating Preview Tooltips */}
        <div
          role="tablist"
          aria-label="Jump to course"
          className="flex items-center justify-center gap-1.5"
        >
          {dishes.map((dish, idx) => {
            const isActive = dish.id === activeDishId;
            const isHovered = hoveredDotId === dish.id;
            const preppedCount = checkedCountsByDish?.[dish.id] ?? 0;
            const dotCourseNum = String(idx + 1).padStart(2, '0');

            return (
              <div key={dish.id} className="relative flex items-center">
                {isHovered && (
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-3 hidden -translate-x-1/2 sm:flex items-center gap-2 whitespace-nowrap rounded-full border border-[#E6DDD0] bg-[#FFFDF9]/98 px-3 py-1.5 text-xs shadow-[0_12px_28px_-10px_rgba(28,25,23,0.24)] backdrop-blur-md"
                  >
                    <span className="font-mono text-[10.5px] font-semibold text-[#D9381E]">
                      {dotCourseNum}
                    </span>
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: dish.accentColor }}
                    />
                    <span className="font-serif font-semibold text-[#1C1917]">
                      {dish.name}
                    </span>
                    <span className="text-[11px] text-[#786E63]">
                      — {dish.cuisine}
                    </span>
                    {preppedCount > 0 && (
                      <span className="rounded-full bg-[#EFE8DC] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#575049]">
                        {preppedCount}/{dish.ingredients.length}
                      </span>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Course ${dotCourseNum}: ${dish.name} (${dish.cuisine})`}
                  onClick={() =>
                    onSelectDish(
                      dish.id,
                      getShortestDirection(activeIndex, idx, total)
                    )
                  }
                  onMouseEnter={() => setHoveredDotId(dish.id)}
                  onMouseLeave={() => setHoveredDotId(null)}
                  onFocus={() => setHoveredDotId(dish.id)}
                  onBlur={() => setHoveredDotId(null)}
                  className="group flex h-4 items-center justify-center px-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] rounded-full"
                >
                  <span
                    className={`block rounded-full transition-all duration-200 ${
                      isActive
                        ? 'h-2 w-7 bg-[#D9381E] shadow-[0_2px_8px_-1px_rgba(217,56,30,0.55)]'
                        : preppedCount > 0
                          ? 'h-2 w-2 bg-[#D9381E]/45 group-hover:scale-125 group-hover:bg-[#D9381E]/80'
                          : 'h-2 w-2 bg-[#D5C9B7] group-hover:scale-125 group-hover:bg-[#8A7E71]'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Next Dish Button */}
      <div className="relative shrink-0">
        {hoveredNav === 'next' && (
          <div
            role="tooltip"
            className="pointer-events-none absolute bottom-full right-0 mb-2.5 hidden sm:flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#E6DDD0] bg-[#FFFDF9]/96 px-3 py-1 text-[11.5px] font-medium text-[#1C1917] shadow-[0_10px_24px_-8px_rgba(28,25,23,0.2)] backdrop-blur-md"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#8A7E71]">
              Next
            </span>
            <span aria-hidden="true">{nextDish.emoji}</span>
            <span>{nextDish.shortLabel}</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => onSelectDish(nextDish.id, 1)}
          onMouseEnter={() => setHoveredNav('next')}
          onMouseLeave={() => setHoveredNav(null)}
          onFocus={() => setHoveredNav('next')}
          onBlur={() => setHoveredNav(null)}
          aria-label={`Next dish: ${nextDish.name}`}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EAE1D5] bg-[#FAF7F2] text-[#3F3A34] transition-all duration-150 hover:border-[#D9381E]/40 hover:bg-[#FFF5F0] hover:text-[#D9381E] active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
        >
          <ChevronRight className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

export default DishDock;

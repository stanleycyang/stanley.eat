'use client';

import { useEffect, useRef } from 'react';
import type { DishId, DishRecipe } from '@/types/dish';

export interface DishDockProps {
  dishes: DishRecipe[];
  activeDishId: DishId;
  onSelectDish: (id: DishId) => void;
}

export function DishDock({ dishes, activeDishId, onSelectDish }: DishDockProps) {
  const buttonRefs = useRef<Partial<Record<DishId, HTMLButtonElement | null>>>({});

  useEffect(() => {
    const activeButton = buttonRefs.current[activeDishId];
    if (activeButton) {
      activeButton.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeDishId]);

  return (
    <nav
      aria-label="Dish switcher"
      className="max-w-full rounded-full border border-[#E6DDD0] bg-[#FFFDF9]/90 p-1.5 backdrop-blur-md shadow-[0_12px_32px_-12px_rgba(28,25,23,0.18),0_2px_8px_-2px_rgba(28,25,23,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]"
    >
      <div
        role="tablist"
        aria-label="Choose a 3D dish"
        className="flex items-center gap-1 overflow-x-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-0.5"
      >
        {dishes.map((dish) => {
          const isActive = dish.id === activeDishId;
          return (
            <button
              key={dish.id}
              ref={(el) => {
                buttonRefs.current[dish.id] = el;
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`${dish.name} (${dish.cuisine})`}
              onClick={() => onSelectDish(dish.id)}
              className={`group relative flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium whitespace-nowrap transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF9] ${
                isActive
                  ? 'bg-[#D9381E] text-[#FFFDF9] shadow-[0_4px_14px_-3px_rgba(217,56,30,0.45),inset_0_1px_1px_rgba(255,255,255,0.28)]'
                  : 'text-[#575049] hover:bg-[#EFE8DC]/80 hover:text-[#1C1917]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`text-base leading-none transition-transform duration-200 ${
                  isActive ? 'scale-110' : 'group-hover:scale-110'
                }`}
              >
                {dish.emoji}
              </span>
              <span className="tracking-[-0.01em]">{dish.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default DishDock;

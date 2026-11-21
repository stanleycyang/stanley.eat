'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import {
  Compass,
  ExternalLink,
  Layers,
  LayoutGrid,
  Timer,
  X,
} from 'lucide-react';
import type { DishId, DishRecipe } from '@/types/dish';

export interface AboutStanleyModalProps {
  dishes: DishRecipe[];
  activeDishId: DishId;
  isOpen: boolean;
  onClose: () => void;
  onSelectDish: (id: DishId, direction?: 1 | -1) => void;
  onOpenMenu: () => void;
}

const STANLEY_LINKS = [
  {
    label: 'stanleycyang.com',
    href: 'https://stanleycyang.com',
    description: 'Personal site',
  },
  {
    label: 'GitHub',
    href: 'https://github.com/stanleycyang',
    description: '@stanleycyang',
  },
  {
    label: 'X',
    href: 'https://x.com/stanleycyang',
    description: '@stanleycyang',
  },
] as const;

export function AboutStanleyModal({
  dishes,
  activeDishId,
  isOpen,
  onClose,
  onSelectDish,
  onOpenMenu,
}: AboutStanleyModalProps) {
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-stanley-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/38 p-3 sm:p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-[#E6DDD0] bg-[#FAF7F2] text-[#1C1917] shadow-[0_28px_80px_-20px_rgba(28,25,23,0.38)]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Cookbook Dust-Jacket Header */}
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#E6DDD0] bg-[#FFFDF9] px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3.5">
            <Image
              src="/stanley-avatar.jpg"
              alt="Stanley Yang"
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-full object-cover object-[56%_22%] ring-2 ring-[#E6DDD0] shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <Image
                  src="/logo-mark.png"
                  alt=""
                  width={24}
                  height={24}
                  className="h-5.5 w-5.5 shrink-0"
                />
                <h2
                  id="about-stanley-title"
                  className="font-serif text-2xl sm:text-[26px] font-semibold leading-tight tracking-[-0.03em] text-[#1C1917]"
                >
                  stanley<span className="text-[#D9381E]">.eat</span>
                </h2>
              </div>
              <p className="mt-0.5 font-serif text-sm italic text-[#6B6258]">
                A personal vault of my 7 favorite foods
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close About Stanley dialog"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E6DDD0] bg-[#FAF7F2] text-[#575049] transition-colors hover:border-[#D9381E]/40 hover:bg-[#FFF5F0] hover:text-[#1C1917] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        {/* Dust-Jacket Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-7">
          {/* Personal Note */}
          <section className="rounded-2xl border border-[#E6DDD0] border-l-4 border-l-[#D9381E] bg-[#FFFDF9] p-5">
            <p className="font-serif text-[17px] sm:text-[18px] leading-[1.6] text-[#1C1917]">
              My name is Stanley Yang. Here are the 7 dishes I keep coming back to.
            </p>
          </section>

          {/* How to Explore This Vault */}
          <section aria-labelledby="explore-vault-heading" className="space-y-2.5">
            <h3
              id="explore-vault-heading"
              className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#786E63]"
            >
              How to explore this vault
            </h3>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#E6DDD0] bg-[#FFFDF9] p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FAF7F2] text-[#D9381E]">
                    <Compass className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-[10px] text-[#8A7E71]">Drag</span>
                </div>
                <p className="text-[13px] font-semibold text-[#1C1917]">
                  Orbit &amp; Inspect
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-[#6B6258]">
                  Drag any 3D dish, click a layer to focus the camera
                </p>
              </div>

              <div className="rounded-2xl border border-[#E6DDD0] bg-[#FFFDF9] p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FAF7F2] text-[#D9381E]">
                    <Layers className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <kbd className="rounded border border-[#E6DDD0] bg-[#FAF7F2] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#575049]">
                    E
                  </kbd>
                </div>
                <p className="text-[13px] font-semibold text-[#1C1917]">
                  Explode Dish
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-[#6B6258]">
                  Lift every ingredient layer apart to see how it&apos;s built
                </p>
              </div>

              <div className="rounded-2xl border border-[#E6DDD0] bg-[#FFFDF9] p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FAF7F2] text-[#D9381E]">
                    <Timer className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <kbd className="rounded border border-[#E6DDD0] bg-[#FAF7F2] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#575049]">
                    C
                  </kbd>
                </div>
                <p className="text-[13px] font-semibold text-[#1C1917]">
                  Cook Mode
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-[#6B6258]">
                  Full-screen kitchen counter view with tap-to-start timers
                </p>
              </div>
            </div>
          </section>

          {/* Connect with Stanley */}
          <section aria-labelledby="connect-stanley-heading" className="space-y-2.5">
            <h3
              id="connect-stanley-heading"
              className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#786E63]"
            >
              Connect with Stanley
            </h3>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {STANLEY_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col justify-between gap-2 rounded-2xl border border-[#E6DDD0] bg-[#FFFDF9] p-3.5 transition-all hover:border-[#D9381E]/45 hover:bg-[#FFF8F5] hover:shadow-[0_8px_20px_-12px_rgba(217,56,30,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13.5px] font-semibold text-[#1C1917] group-hover:text-[#D9381E] transition-colors">
                      {link.label}
                    </span>
                    <ExternalLink
                      className="h-3.5 w-3.5 shrink-0 text-[#8A7E71] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#D9381E]"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="text-[11.5px] leading-snug text-[#6B6258]">
                    {link.description}
                  </p>
                </a>
              ))}
            </div>
          </section>

          {/* Bottom Quick-Jump 7-Dish Pill Strip */}
          <section aria-label="Jump to a dish" className="space-y-2.5 border-t border-[#E6DDD0] pt-5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#786E63]">
                Jump back into the vault
              </span>
              <button
                type="button"
                onClick={onOpenMenu}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#D9381E] hover:underline cursor-pointer"
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Full Tasting Menu</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {dishes.map((dish) => {
                const isActive = dish.id === activeDishId;
                return (
                  <button
                    key={dish.id}
                    type="button"
                    onClick={() => {
                      onSelectDish(dish.id);
                      onClose();
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] ${
                      isActive
                        ? 'border-[#D9381E] bg-[#D9381E] text-[#FFFDF9] shadow-[0_4px_12px_-3px_rgba(217,56,30,0.45)]'
                        : 'border-[#E6DDD0] bg-[#FFFDF9] text-[#3F3A34] hover:border-[#D9381E]/40 hover:bg-[#FFF5F0] hover:text-[#1C1917]'
                    }`}
                  >
                    <span aria-hidden="true">{dish.emoji}</span>
                    <span>{dish.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default AboutStanleyModal;

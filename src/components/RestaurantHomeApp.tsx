'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Calendar,
  Check,
  ChefHat,
  ExternalLink,
  LayoutGrid,
  Link2,
  Map as MapIcon,
  MapPin,
  MessageSquareShare,
  RotateCcw,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import {
  RESTAURANTS,
  RESTAURANT_CITIES,
  RESTAURANT_CUISINES,
  getRestaurantById,
} from '@/data/restaurants';
import { RECIPES, RECIPE_MAP, getDishById } from '@/data/recipes';
import type { RestaurantSpot, SpotTier } from '@/types/restaurant';
import { BayAreaMap } from './BayAreaMap';
import { RestaurantSpotModal } from './RestaurantSpotModal';
import { AboutStanleyModal } from './AboutStanleyModal';

export interface RestaurantHomeAppProps {
  initialSpotId?: string;
}

type ViewMode = 'grid' | 'timeline' | 'map';
type TierFilter = 'all' | SpotTier;
type SortOption = 'rating' | 'recent' | 'visits';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const TIER_STYLES: Record<SpotTier, { label: string; className: string }> = {
  essential: {
    label: '★ Essential',
    className: 'border-[#D9381E]/35 bg-[#FFF5F0] text-[#B8321B]',
  },
  'go-to': {
    label: 'Go-To',
    className: 'border-[#E6DDD0] bg-[#FAF7F2] text-[#575049]',
  },
  'worth-the-drive': {
    label: 'Worth the Drive',
    className: 'border-[#DFCFAF] bg-[#FBF4E4] text-[#7A5618]',
  },
};

function parseViewMode(raw: string | null): ViewMode {
  if (raw === 'timeline' || raw === 'map' || raw === 'grid') return raw;
  return 'grid';
}

function formatMonthHeading(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length < 2) return isoDate;
  const year = parts[0];
  const monthIdx = Number.parseInt(parts[1], 10) - 1;
  const monthName = MONTH_NAMES[monthIdx];
  return monthName ? `${monthName} ${year}` : isoDate;
}

function formatDayShort(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length < 3) return isoDate;
  const monthIdx = Number.parseInt(parts[1], 10) - 1;
  const day = Number.parseInt(parts[2], 10);
  const monthName = MONTH_NAMES[monthIdx];
  if (!monthName || Number.isNaN(day)) return isoDate;
  return `${monthName.slice(0, 3)} ${day}`;
}

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

export function RestaurantHomeApp({
  initialSpotId,
}: RestaurantHomeAppProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize URL-synced filters
  const initialCityParam = searchParams.get('city');
  const initialCuisineParam = searchParams.get('cuisine');
  const initialViewParam = parseViewMode(searchParams.get('view'));

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>(
    initialCityParam && RESTAURANT_CITIES.includes(initialCityParam)
      ? initialCityParam
      : 'all'
  );
  const [selectedCuisine, setSelectedCuisine] = useState<string>(
    initialCuisineParam && RESTAURANT_CUISINES.includes(initialCuisineParam)
      ? initialCuisineParam
      : 'all'
  );
  const [selectedTier, setSelectedTier] = useState<TierFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewParam);

  const [activeSpot, setActiveSpot] = useState<RestaurantSpot | null>(() =>
    initialSpotId ? getRestaurantById(initialSpotId) : null
  );
  const [hoveredSpotId, setHoveredSpotId] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  // Share popover state for the list + quick-copy per card
  const [sharePopoverOpen, setSharePopoverOpen] = useState(false);
  const [listCopied, setListCopied] = useState(false);
  const [copiedCardSpotId, setCopiedCardSpotId] = useState<string | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);

  const sharePopoverRef = useRef<HTMLDivElement | null>(null);
  const listCopyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardCopyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMountedRef = useRef(false);

  // Legacy redirect guard: /?dish=hot-pot -> /dish/hot-pot
  useEffect(() => {
    const legacyDish = searchParams.get('dish');
    if (legacyDish) {
      const resolved = getDishById(legacyDish);
      router.replace(`/dish/${resolved.id}`);
    }
  }, [searchParams, router]);

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== 'undefined' && typeof navigator.share === 'function'
    );
  }, []);

  useEffect(() => {
    return () => {
      if (listCopyTimerRef.current) clearTimeout(listCopyTimerRef.current);
      if (cardCopyTimerRef.current) clearTimeout(cardCopyTimerRef.current);
    };
  }, []);

  // Build relative filtered path (e.g. "/" or "/?city=Cupertino&view=map")
  const buildFilterPath = useCallback(
    (city: string, cuisine: string, view: ViewMode) => {
      const params = new URLSearchParams();
      if (city !== 'all') params.set('city', city);
      if (cuisine !== 'all') params.set('cuisine', cuisine);
      if (view !== 'grid') params.set('view', view);
      const query = params.toString();
      return query ? `/?${query}` : '/';
    },
    []
  );

  // Sync URL with filter state when not viewing a specific /spot/[id] modal
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (activeSpot || typeof window === 'undefined') return;
    const nextPath = buildFilterPath(selectedCity, selectedCuisine, viewMode);
    window.history.replaceState(null, '', nextPath);
  }, [selectedCity, selectedCuisine, viewMode, activeSpot, buildFilterPath]);

  // Close list share popover on outside click or Escape
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

  const handleOpenSpot = useCallback((spot: RestaurantSpot) => {
    setActiveSpot(spot);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/spot/${spot.id}`);
    }
  }, []);

  const handleCloseSpot = useCallback(() => {
    setActiveSpot(null);
    if (typeof window !== 'undefined') {
      const restored = buildFilterPath(selectedCity, selectedCuisine, viewMode);
      window.history.replaceState(null, '', restored);
    }
  }, [buildFilterPath, selectedCity, selectedCuisine, viewMode]);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCity('all');
    setSelectedCuisine('all');
    setSelectedTier('all');
    setSortBy('rating');
  }, []);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedCity !== 'all' ||
    selectedCuisine !== 'all' ||
    selectedTier !== 'all';

  // Filtered & sorted spots
  const filteredSpots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = RESTAURANTS.filter((spot) => {
      if (selectedCity !== 'all' && spot.city !== selectedCity) return false;
      if (selectedCuisine !== 'all' && spot.cuisine !== selectedCuisine) {
        return false;
      }
      if (selectedTier !== 'all' && spot.tier !== selectedTier) return false;

      if (q) {
        const haystack = [
          spot.name,
          spot.cuisine,
          spot.city,
          spot.neighborhood ?? '',
          spot.region,
          spot.stanleysNote,
          spot.proTip,
          ...spot.mustOrder,
          ...spot.vibeTags,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'recent') {
        return b.visitedDateISO.localeCompare(a.visitedDateISO);
      }
      if (sortBy === 'visits') {
        if (b.visitCount !== a.visitCount) return b.visitCount - a.visitCount;
        return b.rating - a.rating;
      }
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.visitCount - a.visitCount;
    });
  }, [searchQuery, selectedCity, selectedCuisine, selectedTier, sortBy]);

  // Chronological timeline groups sorted by visitedDateISO descending
  const timelineGroups = useMemo(() => {
    const sorted = [...filteredSpots].sort((a, b) =>
      b.visitedDateISO.localeCompare(a.visitedDateISO)
    );
    const map = new Map<string, RestaurantSpot[]>();
    for (const spot of sorted) {
      const monthKey = formatMonthHeading(spot.visitedDateISO);
      const existing = map.get(monthKey);
      if (existing) {
        existing.push(spot);
      } else {
        map.set(monthKey, [spot]);
      }
    }
    return Array.from(map.entries()).map(([monthLabel, spots]) => ({
      monthLabel,
      spots,
    }));
  }, [filteredSpots]);

  // Shareable list URL reflects active city/cuisine/view filters
  const currentFilterPath = buildFilterPath(
    selectedCity,
    selectedCuisine,
    viewMode
  );
  const shareListDisplayPath =
    currentFilterPath === '/'
      ? 'stanley.eat'
      : `stanley.eat${currentFilterPath}`;
  const canonicalShareListUrl = `https://www.stanley.eat${
    currentFilterPath === '/' ? '' : currentFilterPath
  }`;

  const getRuntimeListUrl = useCallback(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${
        currentFilterPath === '/' ? '' : currentFilterPath
      }`;
    }
    return canonicalShareListUrl;
  }, [currentFilterPath, canonicalShareListUrl]);

  const handleCopyListUrl = useCallback(async () => {
    const url = getRuntimeListUrl();
    let ok = false;
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      try {
        await navigator.clipboard.writeText(url);
        ok = true;
      } catch {
        ok = fallbackCopyText(url);
      }
    } else {
      ok = fallbackCopyText(url);
    }

    if (ok) {
      setListCopied(true);
      if (listCopyTimerRef.current) clearTimeout(listCopyTimerRef.current);
      listCopyTimerRef.current = setTimeout(() => setListCopied(false), 2000);
    }
  }, [getRuntimeListUrl]);

  const handleNativeShareList = useCallback(async () => {
    const url = getRuntimeListUrl();
    const filterContext =
      selectedCity !== 'all'
        ? `${selectedCity} favorite restaurants`
        : selectedCuisine !== 'all'
          ? `favorite ${selectedCuisine} spots`
          : 'favorite Bay Area restaurants';

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `Stanley's Eating Journey — stanley.eat`,
          text: `Checking out Stanley Yang's ${filterContext} on stanley.eat`,
          url,
        });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    await handleCopyListUrl();
  }, [getRuntimeListUrl, selectedCity, selectedCuisine, handleCopyListUrl]);

  const handleQuickShareSpot = useCallback(async (spot: RestaurantSpot) => {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/spot/${spot.id}`
        : `https://www.stanley.eat/spot/${spot.id}`;

    let ok = false;
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      try {
        await navigator.clipboard.writeText(url);
        ok = true;
      } catch {
        ok = fallbackCopyText(url);
      }
    } else {
      ok = fallbackCopyText(url);
    }

    if (ok) {
      setCopiedCardSpotId(spot.id);
      if (cardCopyTimerRef.current) clearTimeout(cardCopyTimerRef.current);
      cardCopyTimerRef.current = setTimeout(() => setCopiedCardSpotId(null), 1800);
    }
  }, []);

  const xListShareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    selectedCity !== 'all'
      ? `Stanley Yang's favorite restaurants in ${selectedCity} on stanley.eat (@stanleycyang)`
      : `Exploring Stanley Yang's Bay Area eating journey & 3D recipes on stanley.eat (@stanleycyang)`
  )}&url=${encodeURIComponent(canonicalShareListUrl)}`;

  const linkedInListShareHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    canonicalShareListUrl
  )}`;

  return (
    <div className="min-h-screen w-full bg-[#FAF7F2] text-[#1C1917]">
      {/* STICKY EDITORIAL TOP NAV */}
      <header className="sticky top-0 z-30 border-b border-[#E6DDD0]/85 bg-[#FFFDF9]/92 backdrop-blur-md">
        <div className="mx-auto flex h-15 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-6 lg:px-8">
          {/* Left: Brand Lockup */}
          <button
            type="button"
            onClick={() => {
              handleResetFilters();
              setViewMode('grid');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex shrink-0 items-center gap-2 rounded-full py-1 pr-2 text-left transition-opacity hover:opacity-85 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
          >
            <Image
              src="/logo-mark.png"
              alt=""
              width={30}
              height={30}
              priority
              className="h-7 w-7 shrink-0"
            />
            <span className="font-serif text-[20px] sm:text-[22px] font-semibold leading-none tracking-[-0.03em] text-[#1C1917]">
              stanley<span className="text-[#D9381E]">.eat</span>
            </span>
          </button>

          {/* Center: Segmented Nav Switcher (Desktop/Tablet) */}
          <nav
            aria-label="Primary navigation"
            className="hidden sm:inline-flex items-center rounded-full border border-[#E6DDD0] bg-[#FAF7F2] p-1"
          >
            <span
              aria-current="page"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#D9381E] px-3.5 py-1.5 text-xs font-semibold text-[#FFFDF9] shadow-[0_3px_10px_-3px_rgba(217,56,30,0.45)]"
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Restaurants
            </span>
            <Link
              href="/dishes"
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-[#575049] transition-colors hover:text-[#1C1917] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
            >
              <ChefHat className="h-3.5 w-3.5 text-[#8A7E71]" aria-hidden="true" />
              3D Recipes
            </Link>
          </nav>

          {/* Right: About Avatar + Share List Popover */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setAboutOpen(true)}
              aria-label="About Stanley Yang"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E6DDD0] bg-[#FAF7F2] p-1 pr-2.5 text-xs font-medium text-[#3F3A34] transition-all hover:border-[#D9381E]/40 hover:bg-[#FFF5F0] hover:text-[#1C1917] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
            >
              <Image
                src="/stanley-avatar.jpg"
                alt="Stanley Yang"
                width={24}
                height={24}
                priority
                className="h-6 w-6 shrink-0 rounded-full object-cover object-[56%_22%] ring-1 ring-[#E6DDD0]"
              />
              <span>About</span>
            </button>

            <div ref={sharePopoverRef} className="relative">
              <button
                type="button"
                onClick={() => setSharePopoverOpen((prev) => !prev)}
                aria-expanded={sharePopoverOpen}
                aria-haspopup="menu"
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] ${
                  listCopied || sharePopoverOpen
                    ? 'border-[#D9381E] bg-[#FFF5F0] text-[#D9381E]'
                    : 'border-[#E6DDD0] bg-[#FFFDF9] text-[#1C1917] hover:border-[#D9381E]/40 hover:bg-[#FAF7F2] clay-pill'
                }`}
              >
                {listCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5 text-[#6B6258]" aria-hidden="true" />
                    <span className="hidden sm:inline">Share List</span>
                    <span className="sm:hidden">Share</span>
                  </>
                )}
              </button>

              {sharePopoverOpen && (
                <div
                  role="menu"
                  aria-label="Share Stanley's restaurant list"
                  className="absolute top-full right-0 z-40 mt-2 w-64 rounded-2xl border border-[#E6DDD0] bg-[#FFFDF9]/98 p-2 text-[#1C1917] shadow-[0_18px_44px_-12px_rgba(28,25,23,0.26)] backdrop-blur-md"
                >
                  <div className="mb-1.5 border-b border-[#EFE8DC] px-2.5 pt-1 pb-2">
                    <p className="font-serif text-[13px] font-semibold text-[#1C1917]">
                      Share {selectedCity !== 'all' ? `${selectedCity} List` : 'My List'}
                    </p>
                    <p className="truncate font-mono text-[10.5px] text-[#8A7E71]">
                      {shareListDisplayPath}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleCopyListUrl}
                      className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-[#1C1917] transition-colors hover:bg-[#FAF7F2] cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        {listCopied ? (
                          <Check className="h-3.5 w-3.5 text-[#D9381E]" aria-hidden="true" />
                        ) : (
                          <Link2 className="h-3.5 w-3.5 text-[#6B6258]" aria-hidden="true" />
                        )}
                        <span>{listCopied ? 'Copied!' : 'Copy List Link'}</span>
                      </span>
                    </button>

                    <a
                      role="menuitem"
                      href={xListShareHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setSharePopoverOpen(false)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-[#1C1917] transition-colors hover:bg-[#FAF7F2]"
                    >
                      <span className="flex items-center gap-2">
                        <span aria-hidden="true" className="w-3.5 text-center font-mono text-[11px] font-bold">
                          𝕏
                        </span>
                        <span>Post on X</span>
                      </span>
                      <ExternalLink className="h-3 w-3 text-[#9B8E80]" aria-hidden="true" />
                    </a>

                    <a
                      role="menuitem"
                      href={linkedInListShareHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setSharePopoverOpen(false)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-[#1C1917] transition-colors hover:bg-[#FAF7F2]"
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
                      <ExternalLink className="h-3 w-3 text-[#9B8E80]" aria-hidden="true" />
                    </a>

                    {canNativeShare && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setSharePopoverOpen(false);
                          void handleNativeShareList();
                        }}
                        className="mt-1 flex w-full items-center gap-2 rounded-xl border-t border-[#EFE8DC] px-2.5 pt-2 pb-2 text-left text-xs font-medium text-[#D9381E] transition-colors hover:bg-[#FFF5F0] cursor-pointer"
                      >
                        <MessageSquareShare className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>More / iMessage…</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Segmented Nav Bar */}
        <div className="flex justify-center border-t border-[#EFE8DC] bg-[#FAF7F2]/80 px-4 py-2 sm:hidden">
          <nav
            aria-label="Primary mobile navigation"
            className="inline-flex w-full max-w-xs items-center rounded-full border border-[#E6DDD0] bg-[#FFFDF9] p-0.5"
          >
            <span
              aria-current="page"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#D9381E] px-3 py-1.5 text-xs font-semibold text-[#FFFDF9]"
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Restaurants
            </span>
            <Link
              href="/dishes"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#575049]"
            >
              <ChefHat className="h-3.5 w-3.5 text-[#8A7E71]" aria-hidden="true" />
              3D Recipes
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pt-8 pb-16 sm:px-6 sm:pt-11 lg:px-8">
        {/* HERO & LIVE JOURNEY STATS */}
        <section className="space-y-6 pb-8">
          <div className="max-w-2xl space-y-3">
            <p className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#D9381E]">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#D9381E]" />
              Bay Area Field Guide
            </p>
            <h1 className="font-serif text-[36px] sm:text-[46px] font-semibold leading-[1.08] tracking-[-0.03em] text-[#1C1917]">
              Stanley&apos;s Eating Journey
            </h1>
            <p className="text-[15.5px] sm:text-[17px] leading-[1.65] text-[#575049]">
              My favorite restaurants around the Bay Area — what to order, when to go,
              and why I keep coming back.
            </p>
          </div>

          {/* Compact 4-Stat Editorial Strip */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            <div className="rounded-2xl border border-[#E6DDD0] bg-[#FFFDF9] px-4 py-3.5 shadow-[0_4px_14px_-10px_rgba(28,25,23,0.12)]">
              <p className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-[#1C1917]">
                {RESTAURANTS.length}
              </p>
              <p className="mt-0.5 text-xs font-medium text-[#6B6258]">Favorite Spots</p>
            </div>

            <div className="rounded-2xl border border-[#E6DDD0] bg-[#FFFDF9] px-4 py-3.5 shadow-[0_4px_14px_-10px_rgba(28,25,23,0.12)]">
              <p className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-[#1C1917]">
                {RESTAURANT_CITIES.length}
              </p>
              <p className="mt-0.5 text-xs font-medium text-[#6B6258]">Bay Area Cities</p>
            </div>

            <div className="rounded-2xl border border-[#E6DDD0] bg-[#FFFDF9] px-4 py-3.5 shadow-[0_4px_14px_-10px_rgba(28,25,23,0.12)]">
              <p className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-[#1C1917]">
                {RESTAURANT_CUISINES.length}
              </p>
              <p className="mt-0.5 text-xs font-medium text-[#6B6258]">Cuisines</p>
            </div>

            <Link
              href="/dishes"
              className="group flex items-center justify-between rounded-2xl border border-[#F0D5C8] bg-[#FFF6F1] px-4 py-3.5 shadow-[0_4px_14px_-10px_rgba(217,56,30,0.2)] transition-all hover:border-[#D9381E]/55 hover:bg-[#FFF0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
            >
              <div>
                <p className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-[#D9381E]">
                  {RECIPES.length}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-[#8C2B19]">
                  3D Recipes
                </p>
              </div>
              <ArrowRight
                className="h-4.5 w-4.5 text-[#D9381E] transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </section>

        {/* FILTER & VIEW BAR */}
        <section
          aria-label="Filter restaurants and change view"
          className="mb-7 space-y-3.5 rounded-[24px] border border-[#E6DDD0] bg-[#FFFDF9] p-4 sm:p-5 shadow-[0_8px_26px_-18px_rgba(28,25,23,0.14)]"
        >
          {/* Row 1: Search + View Switcher */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#8A7E71]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search restaurants, must-order dishes, cities..."
                aria-label="Search restaurants"
                className="w-full rounded-full border border-[#E6DDD0] bg-[#FAF7F2] py-2.5 pr-9 pl-10 text-sm text-[#1C1917] placeholder:text-[#8A7E71] focus:border-[#D9381E]/55 focus:bg-[#FFFDF9] focus:outline-none focus:ring-2 focus:ring-[#D9381E]/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-3 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-[#8A7E71] hover:bg-[#EFE8DC] hover:text-[#1C1917] cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Segmented View Switcher: Grid | Journey Log | Bay Area Map */}
            <div
              role="tablist"
              aria-label="Display view"
              className="inline-flex shrink-0 items-center rounded-full border border-[#E6DDD0] bg-[#FAF7F2] p-1"
            >
              {(
                [
                  { id: 'grid', label: 'Grid', Icon: LayoutGrid },
                  { id: 'timeline', label: 'Journey Log', Icon: Calendar },
                  { id: 'map', label: 'Bay Area Map', Icon: MapIcon },
                ] as const
              ).map(({ id, label, Icon }) => {
                const isActive = viewMode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setViewMode(id)}
                    className={`inline-flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] ${
                      isActive
                        ? 'bg-[#1C1917] text-[#FFFDF9] shadow-xs'
                        : 'text-[#6B6258] hover:text-[#1C1917]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Scrollable City Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              type="button"
              onClick={() => setSelectedCity('all')}
              aria-pressed={selectedCity === 'all'}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                selectedCity === 'all'
                  ? 'border-[#D9381E] bg-[#D9381E] text-[#FFFDF9]'
                  : 'border-[#E6DDD0] bg-[#FAF7F2] text-[#575049] hover:border-[#CFC4B4] hover:text-[#1C1917]'
              }`}
            >
              All Bay Area
            </button>
            {RESTAURANT_CITIES.map((city) => {
              const active = selectedCity === city;
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => setSelectedCity(active ? 'all' : city)}
                  aria-pressed={active}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                    active
                      ? 'border-[#D9381E] bg-[#D9381E] text-[#FFFDF9] font-semibold'
                      : 'border-[#E6DDD0] bg-[#FAF7F2] text-[#575049] hover:border-[#CFC4B4] hover:text-[#1C1917]'
                  }`}
                >
                  {city}
                </button>
              );
            })}
          </div>

          {/* Row 3: Cuisine Pills + Tier Filter + Sort */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[#EFE8DC] pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCuisine('all')}
                aria-pressed={selectedCuisine === 'all'}
                className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors cursor-pointer ${
                  selectedCuisine === 'all'
                    ? 'bg-[#1C1917] text-[#FFFDF9]'
                    : 'bg-[#F5EFE5] text-[#575049] hover:bg-[#EAE1D3] hover:text-[#1C1917]'
                }`}
              >
                All Cuisines
              </button>
              {RESTAURANT_CUISINES.map((cuisine) => {
                const active = selectedCuisine === cuisine;
                return (
                  <button
                    key={cuisine}
                    type="button"
                    onClick={() => setSelectedCuisine(active ? 'all' : cuisine)}
                    aria-pressed={active}
                    className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#1C1917] text-[#FFFDF9]'
                        : 'bg-[#F5EFE5] text-[#575049] hover:bg-[#EAE1D3] hover:text-[#1C1917]'
                    }`}
                  >
                    {cuisine}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Tier Filter */}
              <div
                role="group"
                aria-label="Filter by tier"
                className="inline-flex items-center rounded-full border border-[#E6DDD0] bg-[#FAF7F2] p-0.5"
              >
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'essential', label: '★ Essentials' },
                    { id: 'go-to', label: 'Go-To' },
                    { id: 'worth-the-drive', label: 'Drive' },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedTier(option.id)}
                    aria-pressed={selectedTier === option.id}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                      selectedTier === option.id
                        ? 'bg-[#FFFDF9] text-[#D9381E] shadow-xs'
                        : 'text-[#6B6258] hover:text-[#1C1917]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Sort Dropdown */}
              <label className="inline-flex items-center gap-1.5 rounded-full border border-[#E6DDD0] bg-[#FAF7F2] px-3 py-1 text-[11.5px] font-medium text-[#575049]">
                <SlidersHorizontal className="h-3 w-3 text-[#8A7E71]" aria-hidden="true" />
                <span className="sr-only">Sort spots</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortOption)}
                  className="bg-transparent text-[11.5px] font-semibold text-[#1C1917] focus:outline-none cursor-pointer"
                >
                  <option value="rating">Highest Rated</option>
                  <option value="recent">Recently Visited</option>
                  <option value="visits">Most Visited</option>
                </select>
              </label>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold text-[#D9381E] hover:bg-[#FFF5F0] cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  Reset
                </button>
              )}
            </div>
          </div>
        </section>

        {/* EMPTY STATE */}
        {filteredSpots.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-[#E6DDD0] bg-[#FFFDF9] px-6 py-16 text-center">
            <p className="font-serif text-xl font-semibold text-[#1C1917]">
              No spots match those filters
            </p>
            <p className="max-w-sm text-sm text-[#6B6258]">
              Try clearing a city or cuisine filter to see all {RESTAURANTS.length} Bay Area
              favorites.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#D9381E] px-4 py-2 text-xs font-semibold text-[#FFFDF9] hover:bg-[#C33119] cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Show All {RESTAURANTS.length} Spots
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* ================= GRID VIEW ================= */
          <section aria-label="Favorite restaurants grid">
            <div className="mb-3 flex items-center justify-between text-xs text-[#786E63]">
              <p className="font-mono">
                Showing <span className="font-semibold text-[#1C1917]">{filteredSpots.length}</span>{' '}
                of {RESTAURANTS.length} spots
                {selectedCity !== 'all' ? ` in ${selectedCity}` : ''}
              </p>
              <p className="hidden sm:block font-mono text-[11px]">
                Click any spot for Pro Tips &amp; Google Maps
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredSpots.map((spot) => {
                const tierMeta = TIER_STYLES[spot.tier];
                const relatedDish = spot.relatedDishId
                  ? RECIPE_MAP[spot.relatedDishId]
                  : null;
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  spot.mapsQuery
                )}`;
                const isCardCopied = copiedCardSpotId === spot.id;

                return (
                  <article
                    key={spot.id}
                    onClick={() => handleOpenSpot(spot)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleOpenSpot(spot);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${spot.name} in ${spot.city}, rated ${spot.rating.toFixed(1)} out of 10`}
                    className="group flex flex-col justify-between rounded-[24px] border border-[#E6DDD0] bg-[#FFFDF9] p-5 text-left shadow-[0_6px_22px_-16px_rgba(28,25,23,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D9381E]/40 hover:shadow-[0_18px_38px_-20px_rgba(28,25,23,0.22)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
                  >
                    <div className="space-y-3.5">
                      {/* Top Row: Tier + Cuisine + Score */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${tierMeta.className}`}
                          >
                            {tierMeta.label}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#E6DDD0] bg-[#FAF7F2] px-2 py-0.5 text-[10.5px] font-medium text-[#6B6258]">
                            <span
                              aria-hidden="true"
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: spot.accentColor }}
                            />
                            {spot.cuisine}
                          </span>
                        </div>

                        <span className="shrink-0 rounded-xl border border-[#F0D5C8] bg-[#FFF5F0] px-2.5 py-1 font-mono text-xs font-bold text-[#D9381E]">
                          {spot.rating.toFixed(1)}
                        </span>
                      </div>

                      {/* Name + Location + Price */}
                      <div>
                        <h2 className="font-serif text-[22px] font-semibold leading-snug tracking-[-0.02em] text-[#1C1917] transition-colors group-hover:text-[#D9381E]">
                          {spot.name}
                        </h2>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-[#6B6258]">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#9B8E80]" aria-hidden="true" />
                          <span className="truncate">
                            {spot.city}
                            {spot.neighborhood ? ` · ${spot.neighborhood}` : ''}
                          </span>
                          <span aria-hidden="true" className="text-[#CFC4B4]">·</span>
                          <span className="font-mono font-semibold text-[#575049]">
                            {spot.price}
                          </span>
                        </p>
                      </div>

                      {/* Stanley's Take */}
                      <p className="line-clamp-3 text-[13.5px] leading-[1.62] text-[#443E37]">
                        {spot.stanleysNote}
                      </p>

                      {/* Must Order Chips */}
                      <div className="space-y-1.5">
                        <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.11em] text-[#8A7E71]">
                          Must Order
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {spot.mustOrder.slice(0, 3).map((item) => (
                            <span
                              key={item}
                              className="rounded-lg border border-[#ECE4D8] bg-[#FAF7F2] px-2.5 py-1 text-[11.5px] font-medium text-[#3F3A34]"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: 3D Recipe Bridge + Maps + Quick Share */}
                    <div className="mt-5 flex items-center justify-between gap-2 border-t border-[#F0E8DC] pt-3.5">
                      {relatedDish ? (
                        <Link
                          href={`/dish/${relatedDish.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#F0D5C8] bg-[#FFF6F1] px-2.5 py-1 text-[11px] font-semibold text-[#B8321B] transition-colors hover:border-[#D9381E]/50 hover:bg-[#FFECE3]"
                        >
                          <span aria-hidden="true">{relatedDish.emoji}</span>
                          <span>3D Recipe</span>
                          <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      ) : (
                        <span className="font-mono text-[11px] text-[#8A7E71]">
                          {spot.visitCount}× visited
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Open ${spot.name} in Google Maps`}
                          title="Open in Google Maps"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-[#6B6258] transition-colors hover:border-[#E6DDD0] hover:bg-[#FAF7F2] hover:text-[#1C1917]"
                        >
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleQuickShareSpot(spot);
                          }}
                          aria-label={
                            isCardCopied
                              ? `Copied link for ${spot.name}`
                              : `Copy link to ${spot.name}`
                          }
                          title={isCardCopied ? 'Copied!' : 'Copy Spot Link'}
                          className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors cursor-pointer ${
                            isCardCopied
                              ? 'border-[#D9381E]/40 bg-[#FFF5F0] text-[#D9381E]'
                              : 'border-transparent text-[#6B6258] hover:border-[#E6DDD0] hover:bg-[#FAF7F2] hover:text-[#1C1917]'
                          }`}
                        >
                          {isCardCopied ? (
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : viewMode === 'timeline' ? (
          /* ================= JOURNEY LOG (TIMELINE) VIEW ================= */
          <section aria-label="Eating journey chronological log" className="mx-auto max-w-3xl">
            <div className="space-y-10">
              {timelineGroups.map((group) => (
                <div key={group.monthLabel} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h2 className="font-serif text-xl sm:text-2xl font-semibold tracking-[-0.02em] text-[#1C1917]">
                      {group.monthLabel}
                    </h2>
                    <div className="h-px flex-1 bg-[#E6DDD0]" />
                    <span className="font-mono text-[11px] text-[#8A7E71]">
                      {group.spots.length} {group.spots.length === 1 ? 'visit' : 'visits'}
                    </span>
                  </div>

                  <div className="relative space-y-4 border-l-2 border-[#E6DDD0] pl-5 sm:pl-7">
                    {group.spots.map((spot) => {
                      const relatedDish = spot.relatedDishId
                        ? RECIPE_MAP[spot.relatedDishId]
                        : null;
                      return (
                        <article
                          key={spot.id}
                          onClick={() => handleOpenSpot(spot)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              handleOpenSpot(spot);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          className="group relative rounded-2xl border border-[#E6DDD0] bg-[#FFFDF9] p-4 sm:p-5 transition-all hover:border-[#D9381E]/40 hover:shadow-[0_14px_32px_-18px_rgba(28,25,23,0.2)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
                        >
                          {/* Timeline Spine Node */}
                          <span
                            aria-hidden="true"
                            className="absolute top-6 -left-[27px] sm:-left-[35px] flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-[#FAF7F2] shadow-xs"
                            style={{ backgroundColor: spot.accentColor }}
                          />

                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-[#786E63]">
                                <span className="font-semibold text-[#D9381E]">
                                  {formatDayShort(spot.visitedDateISO)}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="rounded-full bg-[#FAF7F2] border border-[#E6DDD0] px-2 py-0.5 font-semibold text-[#575049]">
                                  {spot.visitCount}× visited
                                </span>
                                <span>
                                  {spot.city}
                                  {spot.neighborhood ? ` · ${spot.neighborhood}` : ''}
                                </span>
                              </div>

                              <h3 className="font-serif text-[21px] font-semibold text-[#1C1917] group-hover:text-[#D9381E] transition-colors">
                                {spot.name}
                              </h3>
                            </div>

                            <span className="rounded-xl border border-[#F0D5C8] bg-[#FFF5F0] px-2.5 py-1 font-mono text-xs font-bold text-[#D9381E]">
                              {spot.rating.toFixed(1)}
                            </span>
                          </div>

                          <p className="mt-2.5 text-[14px] leading-[1.65] text-[#443E37]">
                            {spot.stanleysNote}
                          </p>

                          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex flex-wrap gap-1.5">
                              {spot.mustOrder.map((dishName) => (
                                <span
                                  key={dishName}
                                  className="rounded-lg border border-[#ECE4D8] bg-[#FAF7F2] px-2.5 py-0.5 text-[11.5px] font-medium text-[#3F3A34]"
                                >
                                  {dishName}
                                </span>
                              ))}
                            </div>

                            {relatedDish && (
                              <Link
                                href={`/dish/${relatedDish.id}`}
                                onClick={(event) => event.stopPropagation()}
                                className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[#D9381E] hover:underline"
                              >
                                <span>3D Recipe</span>
                                <ArrowRight className="h-3 w-3" aria-hidden="true" />
                              </Link>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          /* ================= BAY AREA MAP VIEW ================= */
          <section
            aria-label="Interactive Bay Area restaurant map"
            className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start"
          >
            <div className="lg:col-span-8">
              <BayAreaMap
                spots={filteredSpots}
                selectedSpotId={activeSpot?.id ?? null}
                hoveredSpotId={hoveredSpotId}
                onSelectSpot={handleOpenSpot}
                onHoverSpot={setHoveredSpotId}
              />
              <p className="mt-2.5 text-center font-mono text-[11px] text-[#8A7E71]">
                Tap or hover any pin to explore Stanley&apos;s Bay Area rotation
              </p>
            </div>

            <div className="lg:col-span-4">
              <div className="rounded-[24px] border border-[#E6DDD0] bg-[#FFFDF9] p-3.5 lg:max-h-[540px] lg:overflow-y-auto">
                <div className="mb-2.5 flex items-center justify-between px-2">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.11em] text-[#786E63]">
                    {filteredSpots.length} Mapped Spots
                  </span>
                  <Sparkles className="h-3.5 w-3.5 text-[#D9381E]" aria-hidden="true" />
                </div>

                <ul className="space-y-1.5">
                  {filteredSpots.map((spot) => {
                    const isHighlighted =
                      hoveredSpotId === spot.id || activeSpot?.id === spot.id;
                    return (
                      <li key={spot.id}>
                        <button
                          type="button"
                          onClick={() => handleOpenSpot(spot)}
                          onMouseEnter={() => setHoveredSpotId(spot.id)}
                          onMouseLeave={() => setHoveredSpotId(null)}
                          onFocus={() => setHoveredSpotId(spot.id)}
                          onBlur={() => setHoveredSpotId(null)}
                          className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] ${
                            isHighlighted
                              ? 'border-[#D9381E]/45 bg-[#FFF5F0]'
                              : 'border-transparent hover:border-[#E6DDD0] hover:bg-[#FAF7F2]'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-serif text-[15px] font-semibold text-[#1C1917]">
                              {spot.name}
                            </p>
                            <p className="truncate text-[11.5px] text-[#6B6258]">
                              {spot.city} · {spot.cuisine} · {spot.price}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] font-bold ${
                              isHighlighted
                                ? 'bg-[#D9381E] text-[#FFFDF9]'
                                : 'bg-[#FAF7F2] text-[#D9381E] border border-[#F0D5C8]'
                            }`}
                          >
                            {spot.rating.toFixed(1)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* MINIMAL EDITORIAL COLOPHON FOOTER */}
        <footer className="mt-16 border-t border-[#E6DDD0] pt-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[12px] font-medium text-[#1C1917]">
              Stanley Yang
            </p>
            <div className="flex flex-wrap items-center gap-4 text-[12.5px] font-medium text-[#6B6258]">
              <button
                type="button"
                onClick={() => setAboutOpen(true)}
                className="font-semibold text-[#1C1917] transition-colors hover:text-[#D9381E] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] rounded-sm"
              >
                About
              </button>
              <Link
                href="/dishes"
                className="font-semibold text-[#D9381E] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] rounded-sm"
              >
                3D Recipes
              </Link>
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
      </main>

      {/* Restaurant Detail Sheet Modal */}
      <RestaurantSpotModal
        spot={activeSpot}
        isOpen={Boolean(activeSpot)}
        onClose={handleCloseSpot}
      />

      {/* About Stanley Dust-Jacket Modal */}
      <AboutStanleyModal
        dishes={RECIPES}
        isOpen={aboutOpen}
        onClose={() => setAboutOpen(false)}
      />
    </div>
  );
}

export default RestaurantHomeApp;

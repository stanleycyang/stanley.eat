'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Calendar,
  Check,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Copy,
  Dices,
  ExternalLink,
  Link2,
  List,
  Map as MapIcon,
  MapPin,
  MessageSquareShare,
  Navigation,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  Utensils,
  X,
} from 'lucide-react';
import {
  RESTAURANTS,
  RESTAURANT_CITIES,
  RESTAURANT_CUISINES,
  RESTAURANT_MAP,
  RESTAURANT_REGIONS,
  getRestaurantById,
} from '@/data/restaurants';
import { RECIPES, RECIPE_MAP, getDishById } from '@/data/recipes';
import type { MetroRegion, RestaurantSpot, SpotTier } from '@/types/restaurant';
import { InteractiveFoodMapLoader } from './InteractiveFoodMapLoader';
import { RestaurantSpotModal } from './RestaurantSpotModal';
import { AboutStanleyModal } from './AboutStanleyModal';

export interface RestaurantHomeAppProps {
  initialSpotId?: string;
}

type RegionFilter = 'all' | MetroRegion;
type CompanionListMode = 'ranked' | 'timeline';

const SAVED_STORAGE_KEY = 'stanley_eat_saved_spots_v1';

const SHORT_REGION_LABELS: Record<MetroRegion, string> = {
  'Bay Area': 'Bay Area',
  'Los Angeles': 'LA',
  Austin: 'Austin',
  'New York': 'NYC',
  Seattle: 'Seattle',
  Chicago: 'Chicago',
};

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

function isMetroRegion(value: string | null): value is MetroRegion {
  return (
    value !== null &&
    (RESTAURANT_REGIONS as readonly string[]).includes(value)
  );
}

function formatCityState(spot: RestaurantSpot): string {
  return spot.state ? `${spot.city}, ${spot.state}` : spot.city;
}

function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 3958.7613;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistanceMiles(miles: number): string {
  if (miles < 0.1) return '0.1 mi';
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles).toLocaleString()} mi`;
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

async function copyString(text: string): Promise<boolean> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return fallbackCopyText(text);
    }
  }
  return fallbackCopyText(text);
}

export function RestaurantHomeApp({
  initialSpotId,
}: RestaurantHomeAppProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize URL-synced filters
  const initialRegionParam = searchParams.get('region');
  const initialCityParam = searchParams.get('city');
  const initialCuisineParam = searchParams.get('cuisine');
  const initialSavedParam = searchParams.get('saved');

  const [selectedRegion, setSelectedRegion] = useState<RegionFilter>(
    isMetroRegion(initialRegionParam) ? initialRegionParam : 'all'
  );
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
  const [essentialsOnly, setEssentialsOnly] = useState(false);
  const [underTwoDollarOnly, setUnderTwoDollarOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [listMode, setListMode] = useState<CompanionListMode>('ranked');

  // Personal Want-to-Try Shortlist (hydrated safely in useEffect) + Shared Shortlist from ?saved=
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const [sharedShortlistIds, setSharedShortlistIds] = useState<string[] | null>(
    () => {
      if (!initialSavedParam) return null;
      const validIds = initialSavedParam
        .split(',')
        .map((id) => id.trim())
        .filter((id) => Boolean(RESTAURANT_MAP[id]));
      return validIds.length > 0 ? Array.from(new Set(validIds)) : null;
    }
  );

  // Near Me Geolocation state
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [nearMeActive, setNearMeActive] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoNotice, setGeoNotice] = useState<string | null>(null);

  // Tonight's Pick state
  const [tonightPickSpotId, setTonightPickSpotId] = useState<string | null>(
    null
  );

  // Spatial map & companion panel state
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(() => {
    if (!initialSpotId) return null;
    return getRestaurantById(initialSpotId)?.id ?? null;
  });
  const [hoveredSpotId, setHoveredSpotId] = useState<string | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);

  // Mobile modal/drawer states & shared About modal
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  // Share popover & copy feedback states
  const [activeShareMenu, setActiveShareMenu] = useState<
    'map-desktop' | 'map-mobile' | 'spot-desktop' | null
  >(null);
  const [copiedTarget, setCopiedTarget] = useState<
    'map' | 'spot' | 'order' | null
  >(null);
  const [canNativeShare, setCanNativeShare] = useState(false);

  const mapShareDesktopRef = useRef<HTMLDivElement | null>(null);
  const mapShareMobileRef = useRef<HTMLDivElement | null>(null);
  const spotShareDesktopRef = useRef<HTMLDivElement | null>(null);
  const desktopPanelScrollRef = useRef<HTMLDivElement | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMountedRef = useRef(false);

  // Legacy redirect guard: /?dish=hot-pot -> /dish/hot-pot
  useEffect(() => {
    const legacyDish = searchParams.get('dish');
    if (legacyDish) {
      const resolved = getDishById(legacyDish);
      router.replace(`/dish/${resolved.id}`);
    }
  }, [searchParams, router]);

  // Hydrate saved spots safely from localStorage on client
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SAVED_STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(
            (id): id is string =>
              typeof id === 'string' && Boolean(RESTAURANT_MAP[id])
          );
          setSavedIds(new Set(valid));
        }
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  // Open mobile detail modal cleanly if landing directly on /spot/[id] on mobile
  useEffect(() => {
    if (
      initialSpotId &&
      getRestaurantById(initialSpotId) &&
      typeof window !== 'undefined' &&
      window.innerWidth < 1024
    ) {
      setMobileDetailOpen(true);
    }
  }, [initialSpotId]);

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== 'undefined' && typeof navigator.share === 'function'
    );
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (geoTimerRef.current) clearTimeout(geoTimerRef.current);
    };
  }, []);

  const showGeoNotice = useCallback((msg: string) => {
    setGeoNotice(msg);
    if (geoTimerRef.current) clearTimeout(geoTimerRef.current);
    geoTimerRef.current = setTimeout(() => setGeoNotice(null), 4200);
  }, []);

  // Toggle saved spot + persist to localStorage
  const handleToggleSave = useCallback((spotId: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(spotId)) {
        next.delete(spotId);
      } else {
        next.add(spotId);
      }
      try {
        window.localStorage.setItem(
          SAVED_STORAGE_KEY,
          JSON.stringify(Array.from(next))
        );
      } catch {
        // Ignore storage write errors
      }
      return next;
    });
  }, []);

  // Distance lookup in miles whenever userLocation is available
  const distanceBySpotId = useMemo(() => {
    const map = new Map<string, number>();
    if (!userLocation) return map;
    for (const spot of RESTAURANTS) {
      map.set(
        spot.id,
        haversineMiles(
          userLocation.lat,
          userLocation.lng,
          spot.coordinates.lat,
          spot.coordinates.lng
        )
      );
    }
    return map;
  }, [userLocation]);

  // Build shareable filter path ("/" or "/?saved=..." or "/?region=...&cuisine=...")
  const buildFilterPath = useCallback(
    (
      region: RegionFilter,
      city: string,
      cuisine: string,
      isSavedFilter: boolean,
      currentSaved: ReadonlySet<string>,
      sharedIds: string[] | null
    ) => {
      const params = new URLSearchParams();
      if (sharedIds && sharedIds.length > 0) {
        params.set('saved', sharedIds.join(','));
      } else if (isSavedFilter && currentSaved.size > 0) {
        params.set('saved', Array.from(currentSaved).join(','));
      } else {
        if (region !== 'all') params.set('region', region);
        if (city !== 'all') params.set('city', city);
        if (cuisine !== 'all') params.set('cuisine', cuisine);
      }
      const qs = params.toString();
      return qs ? `/?${qs}` : '/';
    },
    []
  );

  // Sync URL cleanly whenever filters or selectedSpotId change
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (typeof window === 'undefined') return;

    if (selectedSpotId) {
      window.history.replaceState(null, '', `/spot/${selectedSpotId}`);
    } else {
      const nextPath = buildFilterPath(
        selectedRegion,
        selectedCity,
        selectedCuisine,
        savedOnly,
        savedIds,
        sharedShortlistIds
      );
      window.history.replaceState(null, '', nextPath);
    }
  }, [
    selectedSpotId,
    selectedRegion,
    selectedCity,
    selectedCuisine,
    savedOnly,
    savedIds,
    sharedShortlistIds,
    buildFilterPath,
  ]);

  // Close open share popover on outside click or Escape
  useEffect(() => {
    if (!activeShareMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const inDesktopMap = mapShareDesktopRef.current?.contains(target);
      const inMobileMap = mapShareMobileRef.current?.contains(target);
      const inDesktopSpot = spotShareDesktopRef.current?.contains(target);
      if (!inDesktopMap && !inMobileMap && !inDesktopSpot) {
        setActiveShareMenu(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveShareMenu(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeShareMenu]);

  // Lock body scroll while mobile list drawer is open
  useEffect(() => {
    if (!mobileListOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileListOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileListOpen]);

  const hasActiveFilters =
    selectedRegion !== 'all' ||
    selectedCity !== 'all' ||
    selectedCuisine !== 'all' ||
    essentialsOnly ||
    underTwoDollarOnly ||
    savedOnly ||
    Boolean(sharedShortlistIds) ||
    searchQuery.trim().length > 0;

  // Filtered & sorted spots (sorts nearest-first when Near Me is active!)
  const filteredSpots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const sharedSet = sharedShortlistIds ? new Set(sharedShortlistIds) : null;

    const matched = RESTAURANTS.filter((spot) => {
      if (sharedSet && !sharedSet.has(spot.id)) return false;
      if (!sharedSet && savedOnly && !savedIds.has(spot.id)) return false;
      if (selectedRegion !== 'all' && spot.region !== selectedRegion) {
        return false;
      }
      if (selectedCity !== 'all' && spot.city !== selectedCity) return false;
      if (selectedCuisine !== 'all' && spot.cuisine !== selectedCuisine) {
        return false;
      }
      if (essentialsOnly && spot.tier !== 'essential') return false;
      if (underTwoDollarOnly && spot.price !== '$' && spot.price !== '$$') {
        return false;
      }

      if (q) {
        const haystack = [
          spot.name,
          spot.cuisine,
          spot.city,
          spot.state ?? '',
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

    return [...matched].sort((a, b) => {
      if (nearMeActive && userLocation) {
        const da = distanceBySpotId.get(a.id) ?? Number.POSITIVE_INFINITY;
        const db = distanceBySpotId.get(b.id) ?? Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
      }
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.visitCount - a.visitCount;
    });
  }, [
    sharedShortlistIds,
    savedOnly,
    savedIds,
    selectedRegion,
    selectedCity,
    selectedCuisine,
    essentialsOnly,
    underTwoDollarOnly,
    searchQuery,
    nearMeActive,
    userLocation,
    distanceBySpotId,
  ]);

  // Month-grouped chronological Journey Log
  const timelineGroups = useMemo(() => {
    const sorted = [...filteredSpots].sort((a, b) =>
      b.visitedDateISO.localeCompare(a.visitedDateISO)
    );
    const map = new Map<string, RestaurantSpot[]>();
    for (const spot of sorted) {
      const monthKey = formatMonthHeading(spot.visitedDateISO);
      const list = map.get(monthKey);
      if (list) {
        list.push(spot);
      } else {
        map.set(monthKey, [spot]);
      }
    }
    return Array.from(map.entries()).map(([monthLabel, spots]) => ({
      monthLabel,
      spots,
    }));
  }, [filteredSpots]);

  const selectedSpot = useMemo(
    () => (selectedSpotId ? getRestaurantById(selectedSpotId) : null),
    [selectedSpotId]
  );

  const mobilePreviewSpot = useMemo(() => {
    if (selectedSpot && filteredSpots.some((s) => s.id === selectedSpot.id)) {
      return selectedSpot;
    }
    return filteredSpots[0] ?? selectedSpot ?? null;
  }, [selectedSpot, filteredSpots]);

  const activeSpotIndexInFiltered = useMemo(() => {
    const targetId = selectedSpot?.id ?? mobilePreviewSpot?.id;
    if (!targetId) return -1;
    return filteredSpots.findIndex((s) => s.id === targetId);
  }, [selectedSpot, mobilePreviewSpot, filteredSpots]);

  // Handlers
  const handleSelectSpot = useCallback((spotId: string) => {
    setSelectedSpotId(spotId);
    setHoveredSpotId(null);
    setActiveShareMenu(null);
    if (desktopPanelScrollRef.current) {
      desktopPanelScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleBackToAllSpots = useCallback(() => {
    setSelectedSpotId(null);
    setTonightPickSpotId(null);
    setMobileDetailOpen(false);
    setActiveShareMenu(null);
    setFitTrigger((n) => n + 1);
  }, []);

  const handleStepSpot = useCallback(
    (delta: 1 | -1) => {
      if (filteredSpots.length === 0) return;
      const baseIndex =
        activeSpotIndexInFiltered >= 0 ? activeSpotIndexInFiltered : 0;
      const nextIndex =
        (baseIndex + delta + filteredSpots.length) % filteredSpots.length;
      const nextSpot = filteredSpots[nextIndex];
      if (nextSpot) {
        setTonightPickSpotId(null);
        handleSelectSpot(nextSpot.id);
      }
    },
    [filteredSpots, activeSpotIndexInFiltered, handleSelectSpot]
  );

  const handleResetFilters = useCallback(() => {
    setSelectedRegion('all');
    setSelectedCity('all');
    setSelectedCuisine('all');
    setEssentialsOnly(false);
    setUnderTwoDollarOnly(false);
    setSavedOnly(false);
    setSharedShortlistIds(null);
    setNearMeActive(false);
    setSearchQuery('');
    setSelectedSpotId(null);
    setTonightPickSpotId(null);
    setFitTrigger((n) => n + 1);
  }, []);

  const handleToggleRegion = useCallback((region: RegionFilter) => {
    setSharedShortlistIds(null);
    setSelectedRegion((prev) => (prev === region ? 'all' : region));
    setSelectedCity('all');
    setSelectedSpotId(null);
    setTonightPickSpotId(null);
  }, []);

  const handleSelectRegionFromCluster = useCallback((region: MetroRegion) => {
    setSharedShortlistIds(null);
    setSelectedRegion(region);
    setSelectedCity('all');
    setSelectedSpotId(null);
    setTonightPickSpotId(null);
  }, []);

  const handleNearMe = useCallback(() => {
    if (nearMeActive && userLocation) {
      setNearMeActive(false);
      return;
    }

    if (
      typeof navigator === 'undefined' ||
      !navigator.geolocation ||
      typeof navigator.geolocation.getCurrentPosition !== 'function'
    ) {
      showGeoNotice('Geolocation is not supported in this browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLocating(false);
        setUserLocation(loc);
        setNearMeActive(true);
        setSharedShortlistIds(null);
        setSelectedCity('all');
        setSelectedSpotId(null);
        setTonightPickSpotId(null);

        // Find the closest spot and jump to its metro if within 120 miles, else show nearest across US
        let nearestSpot = RESTAURANTS[0];
        let minDist = Number.POSITIVE_INFINITY;
        for (const spot of RESTAURANTS) {
          const d = haversineMiles(
            loc.lat,
            loc.lng,
            spot.coordinates.lat,
            spot.coordinates.lng
          );
          if (d < minDist) {
            minDist = d;
            nearestSpot = spot;
          }
        }

        if (minDist <= 120) {
          setSelectedRegion(nearestSpot.region);
        } else {
          setSelectedRegion('all');
          showGeoNotice(
            `Closest spot is ${nearestSpot.name} (${formatDistanceMiles(minDist)}).`
          );
        }
        setFitTrigger((n) => n + 1);
      },
      () => {
        setLocating(false);
        showGeoNotice('Location unavailable — pick a metro pill instead.');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }, [nearMeActive, userLocation, showGeoNotice]);

  const handlePickDinner = useCallback(() => {
    if (filteredSpots.length === 0) return;
    const candidates =
      filteredSpots.length > 1 && selectedSpotId
        ? filteredSpots.filter((s) => s.id !== selectedSpotId)
        : filteredSpots;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    if (!chosen) return;
    setTonightPickSpotId(chosen.id);
    setMobileListOpen(false);
    handleSelectSpot(chosen.id);
  }, [filteredSpots, selectedSpotId, handleSelectSpot]);

  // Share & copy helpers
  const triggerCopyFeedback = useCallback(
    async (text: string, target: 'map' | 'spot' | 'order') => {
      const ok = await copyString(text);
      if (ok) {
        setCopiedTarget(target);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopiedTarget(null), 2000);
      }
    },
    []
  );

  const currentFilterPath = buildFilterPath(
    selectedRegion,
    selectedCity,
    selectedCuisine,
    savedOnly,
    savedIds,
    sharedShortlistIds
  );
  const mapShareDisplayPath =
    currentFilterPath === '/'
      ? 'stanley.eat'
      : `stanley.eat${currentFilterPath}`;
  const canonicalMapShareUrl = `https://www.stanley.eat${
    currentFilterPath === '/' ? '' : currentFilterPath
  }`;

  const handleCopyMapLink = useCallback(async () => {
    const runtimeUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${
            currentFilterPath === '/' ? '' : currentFilterPath
          }`
        : canonicalMapShareUrl;
    await triggerCopyFeedback(runtimeUrl, 'map');
  }, [currentFilterPath, canonicalMapShareUrl, triggerCopyFeedback]);

  const handleNativeShareMap = useCallback(async () => {
    const runtimeUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${
            currentFilterPath === '/' ? '' : currentFilterPath
          }`
        : canonicalMapShareUrl;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title:
            savedOnly && savedIds.size > 0
              ? 'My stanley.eat Shortlist'
              : "Stanley's Eating Map — stanley.eat",
          text:
            savedOnly && savedIds.size > 0
              ? `Here's my shortlist of ${savedIds.size} restaurants from stanley.eat`
              : "Exploring Stanley Yang's favorite restaurants across the US on stanley.eat",
          url: runtimeUrl,
        });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    await handleCopyMapLink();
  }, [
    currentFilterPath,
    canonicalMapShareUrl,
    savedOnly,
    savedIds.size,
    handleCopyMapLink,
  ]);

  const handleCopySpotLink = useCallback(
    async (spot: RestaurantSpot) => {
      const runtimeUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/spot/${spot.id}`
          : `https://www.stanley.eat/spot/${spot.id}`;
      await triggerCopyFeedback(runtimeUrl, 'spot');
    },
    [triggerCopyFeedback]
  );

  const handleCopyOrder = useCallback(
    async (spot: RestaurantSpot) => {
      const orderText = `${spot.name} (${formatCityState(
        spot
      )}) — Stanley's order: ${spot.mustOrder.join(
        ', '
      )} · https://www.stanley.eat/spot/${spot.id}`;
      await triggerCopyFeedback(orderText, 'order');
    },
    [triggerCopyFeedback]
  );

  const handleNativeShareSpot = useCallback(
    async (spot: RestaurantSpot) => {
      const runtimeUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/spot/${spot.id}`
          : `https://www.stanley.eat/spot/${spot.id}`;

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: `${spot.name} (${formatCityState(spot)}) — stanley.eat`,
            text: `${spot.rating.toFixed(1)}/10 · Order: ${spot.mustOrder
              .slice(0, 2)
              .join(', ')}`,
            url: runtimeUrl,
          });
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return;
        }
      }
      await handleCopySpotLink(spot);
    },
    [handleCopySpotLink]
  );

  const mapXShareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    savedOnly && savedIds.size > 0
      ? `My restaurant shortlist (${savedIds.size} spots) from stanley.eat by @stanleycyang`
      : selectedRegion !== 'all'
        ? `Stanley Yang's favorite ${selectedRegion} restaurants on stanley.eat (@stanleycyang)`
        : `Exploring Stanley Yang's interactive US eating map on stanley.eat (@stanleycyang)`
  )}&url=${encodeURIComponent(canonicalMapShareUrl)}`;
  const mapLinkedInHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    canonicalMapShareUrl
  )}`;

  // Share Map / Shortlist popover menu
  const renderShareMapMenu = () => (
    <div
      role="menu"
      aria-label="Share Stanley's eating map"
      className="absolute top-full right-0 z-40 mt-2 w-64 rounded-2xl border border-[#E6DDD0] bg-[#FFFDF9]/98 p-2 text-[#1C1917] shadow-[0_18px_44px_-12px_rgba(28,25,23,0.28)] backdrop-blur-md"
    >
      <div className="mb-1.5 border-b border-[#EFE8DC] px-2.5 pt-1 pb-2">
        <p className="font-serif text-[13px] font-semibold text-[#1C1917]">
          {savedOnly && savedIds.size > 0
            ? `Share Shortlist (${savedIds.size})`
            : 'Share Eating Map'}
        </p>
        <p className="truncate font-mono text-[10.5px] text-[#8A7E71]">
          {mapShareDisplayPath}
        </p>
      </div>

      <div className="space-y-0.5">
        <button
          type="button"
          role="menuitem"
          onClick={() => void handleCopyMapLink()}
          className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-[#1C1917] transition-colors hover:bg-[#FAF7F2] cursor-pointer"
        >
          <span className="flex items-center gap-2">
            {copiedTarget === 'map' ? (
              <Check className="h-3.5 w-3.5 text-[#D9381E]" aria-hidden="true" />
            ) : (
              <Link2 className="h-3.5 w-3.5 text-[#6B6258]" aria-hidden="true" />
            )}
            <span>
              {copiedTarget === 'map'
                ? 'Copied!'
                : savedOnly && savedIds.size > 0
                  ? 'Copy Shortlist Link'
                  : 'Copy Map Link'}
            </span>
          </span>
        </button>

        <a
          role="menuitem"
          href={mapXShareHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setActiveShareMenu(null)}
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
          href={mapLinkedInHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setActiveShareMenu(null)}
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
              setActiveShareMenu(null);
              void handleNativeShareMap();
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-xl border-t border-[#EFE8DC] px-2.5 pt-2 pb-2 text-left text-xs font-medium text-[#D9381E] transition-colors hover:bg-[#FFF5F0] cursor-pointer"
          >
            <MessageSquareShare className="h-3.5 w-3.5" aria-hidden="true" />
            <span>More / iMessage…</span>
          </button>
        )}
      </div>
    </div>
  );

  // Reusable Spot List (shared between desktop companion panel & mobile list drawer)
  const renderSpotListContent = (onPick: (spotId: string) => void) => {
    if (filteredSpots.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 px-5 py-16 text-center">
          <p className="font-serif text-lg font-semibold text-[#1C1917]">
            {savedOnly && savedIds.size === 0
              ? 'Your Want to Try list is empty'
              : 'No spots match those filters'}
          </p>
          <p className="max-w-xs text-xs leading-relaxed text-[#6B6258]">
            {savedOnly && savedIds.size === 0
              ? 'Tap the bookmark icon on any restaurant to build your personal trip shortlist.'
              : `Reset filters to see all ${RESTAURANTS.length} favorite US spots on the map.`}
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#D9381E] px-4 py-2 text-xs font-semibold text-[#FFFDF9] hover:bg-[#C33119] cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Show All {RESTAURANTS.length} Spots
          </button>
        </div>
      );
    }

    if (listMode === 'timeline') {
      return (
        <div className="space-y-6 px-4 py-4">
          {timelineGroups.map((group) => (
            <div key={group.monthLabel} className="space-y-2.5">
              <div className="flex items-center gap-2.5 px-1">
                <h3 className="font-serif text-base font-semibold text-[#1C1917]">
                  {group.monthLabel}
                </h3>
                <div className="h-px flex-1 bg-[#E6DDD0]" />
                <span className="font-mono text-[10.5px] text-[#8A7E71]">
                  {group.spots.length}
                </span>
              </div>

              <div className="space-y-2 border-l-2 border-[#E6DDD0] pl-4">
                {group.spots.map((spot) => {
                  const isHighlighted = hoveredSpotId === spot.id;
                  const isSaved = savedIds.has(spot.id);
                  const dist = distanceBySpotId.get(spot.id);

                  return (
                    <div
                      key={spot.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onPick(spot.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onPick(spot.id);
                        }
                      }}
                      onMouseEnter={() => setHoveredSpotId(spot.id)}
                      onMouseLeave={() => setHoveredSpotId(null)}
                      onFocus={() => setHoveredSpotId(spot.id)}
                      onBlur={() => setHoveredSpotId(null)}
                      className={`group relative block w-full rounded-2xl border p-3.5 text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] ${
                        isHighlighted
                          ? 'border-[#D9381E]/45 bg-[#FFF6F1]'
                          : 'border-[#EAE1D5] bg-[#FAF7F2]/65 hover:border-[#D9381E]/35 hover:bg-[#FFFDF9]'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="absolute top-4.5 -left-[22px] h-2.5 w-2.5 rounded-full border-2 border-[#FFFDF9]"
                        style={{ backgroundColor: spot.accentColor }}
                      />

                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-[10.5px] text-[#786E63]">
                            <span className="font-semibold text-[#D9381E]">
                              {formatDayShort(spot.visitedDateISO)}
                            </span>{' '}
                            · {spot.visitCount}× visited · {formatCityState(spot)}
                            {dist !== undefined ? ` · ${formatDistanceMiles(dist)}` : ''}
                          </p>
                          <p className="mt-0.5 truncate font-serif text-[16.5px] font-semibold text-[#1C1917] group-hover:text-[#D9381E] transition-colors">
                            {spot.name}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSave(spot.id);
                            }}
                            aria-pressed={isSaved}
                            aria-label={
                              isSaved
                                ? `Remove ${spot.name} from saved`
                                : `Save ${spot.name}`
                            }
                            className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors cursor-pointer ${
                              isSaved
                                ? 'border-[#D9381E]/40 bg-[#FFF5F0] text-[#D9381E]'
                                : 'border-transparent text-[#8A7E71] hover:border-[#E6DDD0] hover:bg-[#FFFDF9] hover:text-[#D9381E]'
                            }`}
                          >
                            <Bookmark
                              className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`}
                              aria-hidden="true"
                            />
                          </button>

                          <span className="rounded-lg border border-[#F0D5C8] bg-[#FFF5F0] px-2 py-0.5 font-mono text-[11px] font-bold text-[#D9381E]">
                            {spot.rating.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-[#575049]">
                        {spot.stanleysNote}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <ul className="space-y-2 px-4 py-3.5">
        {filteredSpots.map((spot) => {
          const isHighlighted = hoveredSpotId === spot.id;
          const isSaved = savedIds.has(spot.id);
          const dist = distanceBySpotId.get(spot.id);
          const relatedDish = spot.relatedDishId
            ? RECIPE_MAP[spot.relatedDishId]
            : null;
          const tierMeta = TIER_STYLES[spot.tier];

          return (
            <li key={spot.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onPick(spot.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPick(spot.id);
                  }
                }}
                onMouseEnter={() => setHoveredSpotId(spot.id)}
                onMouseLeave={() => setHoveredSpotId(null)}
                onFocus={() => setHoveredSpotId(spot.id)}
                onBlur={() => setHoveredSpotId(null)}
                className={`group flex w-full flex-col gap-2 rounded-2xl border p-3.5 text-left transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] ${
                  isHighlighted
                    ? 'border-[#D9381E]/50 bg-[#FFF6F1] shadow-[0_8px_22px_-12px_rgba(217,56,30,0.28)]'
                    : 'border-[#EAE1D5] bg-[#FAF7F2]/60 hover:border-[#D9381E]/35 hover:bg-[#FFFDF9]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.07em] ${tierMeta.className}`}
                      >
                        {tierMeta.label}
                      </span>
                      <span className="font-mono text-[10.5px] text-[#786E63]">
                        {formatCityState(spot)} · {spot.price}
                      </span>
                      {dist !== undefined && (
                        <span className="rounded-full bg-[#EFF6FF] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#1D4ED8]">
                          {formatDistanceMiles(dist)}
                        </span>
                      )}
                    </div>
                    <h3 className="truncate font-serif text-[17.5px] font-semibold leading-snug text-[#1C1917] group-hover:text-[#D9381E] transition-colors">
                      {spot.name}
                    </h3>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSave(spot.id);
                      }}
                      aria-pressed={isSaved}
                      aria-label={
                        isSaved
                          ? `Remove ${spot.name} from Want to Try`
                          : `Save ${spot.name} to Want to Try`
                      }
                      title={isSaved ? 'Saved' : 'Save to Want to Try'}
                      className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors cursor-pointer ${
                        isSaved
                          ? 'border-[#D9381E]/40 bg-[#FFF5F0] text-[#D9381E]'
                          : 'border-transparent text-[#8A7E71] hover:border-[#E6DDD0] hover:bg-[#FFFDF9] hover:text-[#D9381E]'
                      }`}
                    >
                      <Bookmark
                        className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`}
                        aria-hidden="true"
                      />
                    </button>

                    <span
                      className={`rounded-xl px-2.5 py-1 font-mono text-xs font-bold transition-colors ${
                        isHighlighted
                          ? 'bg-[#D9381E] text-[#FFFDF9]'
                          : 'border border-[#F0D5C8] bg-[#FFF5F0] text-[#D9381E]'
                      }`}
                    >
                      {spot.rating.toFixed(1)}
                    </span>
                  </div>
                </div>

                <p className="line-clamp-2 text-[12.5px] leading-[1.55] text-[#575049]">
                  {spot.stanleysNote}
                </p>

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span className="truncate rounded-lg border border-[#ECE4D8] bg-[#FFFDF9] px-2 py-0.5 text-[11px] font-medium text-[#3F3A34]">
                    Order: {spot.mustOrder[0]}
                  </span>

                  {relatedDish && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#F0D5C8] bg-[#FFF2EB] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#B8321B]">
                      <span aria-hidden="true">{relatedDish.emoji}</span>
                      <span>3D Recipe</span>
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  // Desktop Spot Detail view inside right 38% companion panel
  const renderDesktopSpotDetail = (spot: RestaurantSpot) => {
    const tierMeta = TIER_STYLES[spot.tier];
    const relatedDish = spot.relatedDishId ? RECIPE_MAP[spot.relatedDishId] : null;
    const isSaved = savedIds.has(spot.id);
    const dist = distanceBySpotId.get(spot.id);
    const isPick = tonightPickSpotId === spot.id;

    const appleMapsUrl = `https://maps.apple.com/?q=${encodeURIComponent(
      spot.mapsQuery
    )}&ll=${spot.coordinates.lat},${spot.coordinates.lng}`;
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      spot.mapsQuery
    )}`;
    const reserveUrl = `https://www.google.com/search?q=${encodeURIComponent(
      `${spot.name} ${spot.city} reservations waitlist`
    )}`;
    const canonicalSpotUrl = `https://www.stanley.eat/spot/${spot.id}`;
    const spotXHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      `${spot.name} (${formatCityState(spot)}) — ${spot.rating.toFixed(1)}/10 on stanley.eat by @stanleycyang`
    )}&url=${encodeURIComponent(canonicalSpotUrl)}`;
    const spotLinkedInHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      canonicalSpotUrl
    )}`;

    return (
      <>
        {/* Tonight's Pick Ribbon */}
        {isPick && (
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#C63018] bg-[#D9381E] px-5 py-2 text-[#FFFDF9]">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Tonight&apos;s Pick
            </span>
            <button
              type="button"
              onClick={handlePickDinner}
              className="inline-flex items-center gap-1 rounded-full bg-[#FFFDF9]/18 px-2.5 py-0.5 text-[11px] font-semibold text-[#FFFDF9] hover:bg-[#FFFDF9]/28 cursor-pointer"
            >
              <Dices className="h-3 w-3" aria-hidden="true" />
              Spin Again
            </button>
          </div>
        )}

        {/* Sticky Detail Header Bar */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E6DDD0] bg-[#FFFDF9]/95 px-5 py-3">
          <button
            type="button"
            onClick={handleBackToAllSpots}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E6DDD0] bg-[#FAF7F2] px-3 py-1.5 text-xs font-semibold text-[#1C1917] transition-all hover:border-[#D9381E]/40 hover:bg-[#FFF5F0] hover:text-[#D9381E] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>All Spots ({filteredSpots.length})</span>
          </button>

          <div className="flex items-center gap-1.5">
            {filteredSpots.length > 1 && (
              <div className="inline-flex items-center rounded-full border border-[#E6DDD0] bg-[#FAF7F2] p-0.5">
                <button
                  type="button"
                  onClick={() => handleStepSpot(-1)}
                  aria-label="Previous spot"
                  title="Previous spot"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[#575049] transition-colors hover:bg-[#FFFDF9] hover:text-[#D9381E] cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStepSpot(1)}
                  aria-label="Next spot"
                  title="Next spot"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[#575049] transition-colors hover:bg-[#FFFDF9] hover:text-[#D9381E] cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleToggleSave(spot.id)}
              aria-pressed={isSaved}
              aria-label={
                isSaved
                  ? `Remove ${spot.name} from Want to Try`
                  : `Save ${spot.name} to Want to Try`
              }
              title={isSaved ? 'Saved in Want to Try' : 'Save to Want to Try'}
              className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] ${
                isSaved
                  ? 'border-[#D9381E]/45 bg-[#FFF5F0] text-[#D9381E]'
                  : 'border-[#E6DDD0] bg-[#FAF7F2] text-[#575049] hover:border-[#D9381E]/40 hover:text-[#D9381E]'
              }`}
            >
              <Bookmark
                className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`}
                aria-hidden="true"
              />
            </button>

            <div ref={spotShareDesktopRef} className="relative">
              <button
                type="button"
                onClick={() =>
                  setActiveShareMenu((prev) =>
                    prev === 'spot-desktop' ? null : 'spot-desktop'
                  )
                }
                aria-expanded={activeShareMenu === 'spot-desktop'}
                aria-haspopup="menu"
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] ${
                  copiedTarget === 'spot' || activeShareMenu === 'spot-desktop'
                    ? 'border-[#D9381E] bg-[#FFF5F0] text-[#D9381E]'
                    : 'border-[#E6DDD0] bg-[#FAF7F2] text-[#1C1917] hover:border-[#D9381E]/40'
                }`}
              >
                {copiedTarget === 'spot' ? (
                  <>
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5 text-[#6B6258]" aria-hidden="true" />
                    <span>Share</span>
                  </>
                )}
              </button>

              {activeShareMenu === 'spot-desktop' && (
                <div
                  role="menu"
                  aria-label={`Share ${spot.name}`}
                  className="absolute top-full right-0 z-40 mt-2 w-64 rounded-2xl border border-[#E6DDD0] bg-[#FFFDF9]/98 p-2 text-[#1C1917] shadow-[0_18px_44px_-12px_rgba(28,25,23,0.28)] backdrop-blur-md"
                >
                  <div className="mb-1.5 border-b border-[#EFE8DC] px-2.5 pt-1 pb-2">
                    <p className="truncate font-serif text-[13px] font-semibold text-[#1C1917]">
                      {spot.name}
                    </p>
                    <p className="truncate font-mono text-[10.5px] text-[#8A7E71]">
                      stanley.eat/spot/{spot.id}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleCopySpotLink(spot)}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-[#1C1917] hover:bg-[#FAF7F2] cursor-pointer"
                    >
                      {copiedTarget === 'spot' ? (
                        <Check className="h-3.5 w-3.5 text-[#D9381E]" aria-hidden="true" />
                      ) : (
                        <Link2 className="h-3.5 w-3.5 text-[#6B6258]" aria-hidden="true" />
                      )}
                      <span>
                        {copiedTarget === 'spot' ? 'Copied!' : 'Copy Spot Link'}
                      </span>
                    </button>

                    <a
                      role="menuitem"
                      href={spotXHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setActiveShareMenu(null)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-[#1C1917] hover:bg-[#FAF7F2]"
                    >
                      <span className="flex items-center gap-2">
                        <span aria-hidden="true" className="w-3.5 text-center font-mono text-[11px] font-bold">
                          𝕏
                        </span>
                        <span>Share on X</span>
                      </span>
                      <ExternalLink className="h-3 w-3 text-[#9B8E80]" aria-hidden="true" />
                    </a>

                    <a
                      role="menuitem"
                      href={spotLinkedInHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setActiveShareMenu(null)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-[#1C1917] hover:bg-[#FAF7F2]"
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
                          setActiveShareMenu(null);
                          void handleNativeShareSpot(spot);
                        }}
                        className="mt-1 flex w-full items-center gap-2 rounded-xl border-t border-[#EFE8DC] px-2.5 pt-2 pb-2 text-left text-xs font-medium text-[#D9381E] hover:bg-[#FFF5F0] cursor-pointer"
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

        {/* Scrollable Editorial Detail Body */}
        <div
          ref={desktopPanelScrollRef}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] ${tierMeta.className}`}
                >
                  {tierMeta.label}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E6DDD0] bg-[#FAF7F2] px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#6B6258]">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: spot.accentColor }}
                  />
                  {spot.cuisine}
                </span>
                <span className="rounded-full border border-[#E6DDD0] bg-[#FAF7F2] px-2 py-0.5 font-mono text-[10.5px] font-semibold text-[#6B6258]">
                  {spot.price}
                </span>
                {dist !== undefined && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#C9DCF5] bg-[#EFF6FF] px-2 py-0.5 font-mono text-[10.5px] font-semibold text-[#1D4ED8]">
                    <Navigation className="h-2.5 w-2.5" aria-hidden="true" />
                    {formatDistanceMiles(dist)} away
                  </span>
                )}
              </div>

              <h2 className="font-serif text-[28px] font-semibold leading-tight tracking-[-0.025em] text-[#1C1917]">
                {spot.name}
              </h2>

              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6B6258]">
                <span className="inline-flex items-center gap-1 font-medium text-[#3F3A34]">
                  <MapPin className="h-3.5 w-3.5 text-[#D9381E]" aria-hidden="true" />
                  {formatCityState(spot)}
                  {spot.neighborhood ? ` · ${spot.neighborhood}` : ''}
                </span>
                <span aria-hidden="true" className="text-[#CFC4B4]">·</span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                  <Calendar className="h-3 w-3 text-[#8A7E71]" aria-hidden="true" />
                  {spot.visitCount}× visited · Last {spot.lastVisited}
                </span>
              </p>
            </div>

            <div
              aria-label={`Rated ${spot.rating.toFixed(1)} out of 10`}
              className="flex shrink-0 flex-col items-center justify-center rounded-2xl border border-[#F0D5C8] bg-[#FFF5F0] px-3 py-2 text-center"
            >
              <span className="font-mono text-xl font-bold leading-none text-[#D9381E]">
                {spot.rating.toFixed(1)}
              </span>
              <span className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-[#9E5242]">
                / 10
              </span>
            </div>
          </div>

          {/* Stanley's Take */}
          <blockquote className="rounded-r-2xl border border-[#E6DDD0] border-l-4 border-l-[#D9381E] bg-[#FAF7F2]/80 p-4">
            <span className="mb-1 block font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#8A7E71]">
              Stanley&apos;s Take
            </span>
            <p className="font-serif text-[16px] leading-[1.65] text-[#1C1917]">
              &ldquo;{spot.stanleysNote}&rdquo;
            </p>
          </blockquote>

          {/* What to Order + 1-Tap Copy Order */}
          <section aria-label="What to order" className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6258]">
                <Utensils className="h-3.5 w-3.5 text-[#D9381E]" aria-hidden="true" />
                What to Order
              </h3>

              <button
                type="button"
                onClick={() => void handleCopyOrder(spot)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] ${
                  copiedTarget === 'order'
                    ? 'border-[#D9381E] bg-[#FFF5F0] text-[#D9381E]'
                    : 'border-[#E6DDD0] bg-[#FAF7F2] text-[#575049] hover:border-[#D9381E]/40 hover:text-[#1C1917]'
                }`}
              >
                {copiedTarget === 'order' ? (
                  <>
                    <Check className="h-3 w-3" aria-hidden="true" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" aria-hidden="true" />
                    <span>Copy Order</span>
                  </>
                )}
              </button>
            </div>

            <ul className="space-y-2">
              {spot.mustOrder.map((dishName, idx) => (
                <li
                  key={dishName}
                  className="flex items-center gap-2.5 rounded-xl border border-[#E6DDD0] bg-[#FAF7F2]/65 px-3.5 py-2.5 text-[13.5px] font-medium text-[#1C1917]"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFF5F0] font-mono text-[10.5px] font-bold text-[#D9381E]">
                    {idx + 1}
                  </span>
                  <span>{dishName}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Pro Tip */}
          <aside className="rounded-2xl border border-[#E6D8C6] bg-[#F7EFE4] p-4">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#D9381E]" aria-hidden="true" />
              <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#8A5A3B]">
                Pro Tip
              </span>
            </div>
            <p className="text-[13.5px] leading-[1.65] text-[#3F3730]">
              {spot.proTip}
            </p>
          </aside>

          {/* Vibe Tags */}
          {spot.vibeTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {spot.vibeTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#E6DDD0] bg-[#FAF7F2] px-3 py-1 text-xs font-medium text-[#575049]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Action Buttons: Apple Maps + Google Maps + Reserve / Info */}
          <div className="grid grid-cols-3 gap-2">
            <a
              href={appleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#1C1917] bg-[#1C1917] px-3 py-2.5 text-xs font-semibold text-[#FFFDF9] transition-all hover:bg-[#332E2A]"
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Apple Maps</span>
            </a>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#E6DDD0] bg-[#FAF7F2] px-3 py-2.5 text-xs font-semibold text-[#1C1917] transition-all hover:border-[#D9381E]/40 hover:bg-[#FFF5F0]"
            >
              <Navigation className="h-3.5 w-3.5 text-[#D9381E]" aria-hidden="true" />
              <span>Google Maps</span>
            </a>

            <a
              href={reserveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 rounded-full border border-[#E6DDD0] bg-[#FAF7F2] px-3 py-2.5 text-xs font-semibold text-[#3F3A34] transition-all hover:border-[#D9381E]/40 hover:bg-[#FFF5F0]"
            >
              <span>Reserve</span>
              <ExternalLink className="h-3 w-3 opacity-70" aria-hidden="true" />
            </a>
          </div>

          {/* Upgraded 3D Dish Bridge Card */}
          {relatedDish && (
            <Link
              href={`/dish/${relatedDish.id}`}
              className="group flex items-center justify-between gap-3.5 rounded-2xl border border-[#F0D5C8] bg-[#FFF6F1] p-4 transition-all hover:border-[#D9381E]/60 hover:bg-[#FFF0E8] hover:shadow-[0_10px_24px_-14px_rgba(217,56,30,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#F0D5C8] bg-[#FFFDF9] text-2xl shadow-xs"
                >
                  {relatedDish.emoji}
                </span>
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#D9381E]">
                    <ChefHat className="h-3 w-3" aria-hidden="true" />
                    Can&apos;t make it tonight? Cook Stanley&apos;s 3D Version
                  </p>
                  <p className="truncate font-serif text-[16.5px] font-semibold text-[#1C1917] group-hover:text-[#D9381E] transition-colors">
                    {relatedDish.name}
                  </p>
                  <p className="font-mono text-[10.5px] text-[#786E63]">
                    {relatedDish.prepTime} prep · {relatedDish.cookTime} cook · Interactive 3D
                  </p>
                </div>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#F0D5C8] bg-[#FFFDF9] text-[#D9381E] transition-all group-hover:border-[#D9381E] group-hover:bg-[#D9381E] group-hover:text-[#FFFDF9]">
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>
          )}
        </div>
      </>
    );
  };

  const mobilePreviewDistance = mobilePreviewSpot
    ? distanceBySpotId.get(mobilePreviewSpot.id) ?? null
    : null;
  const mobilePreviewSaved = mobilePreviewSpot
    ? savedIds.has(mobilePreviewSpot.id)
    : false;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#FAF7F2] text-[#1C1917] lg:flex lg:h-screen">
      {/* ==================== MAP CANVAS STAGE (100dvh Mobile / 62% Desktop) ==================== */}
      <section
        aria-label="Stanley's interactive US food map"
        className="relative h-full w-full lg:w-[62%] lg:shrink-0"
      >
        <InteractiveFoodMapLoader
          spots={filteredSpots}
          selectedSpotId={selectedSpotId}
          hoveredSpotId={hoveredSpotId}
          savedIds={savedIds}
          userLocation={userLocation}
          fitTrigger={fitTrigger}
          onSelectSpot={(id) => {
            setTonightPickSpotId(null);
            handleSelectSpot(id);
          }}
          onHoverSpot={setHoveredSpotId}
          onSelectRegion={handleSelectRegionFromCluster}
        />

        {/* DESKTOP FLOATING TOP-LEFT MASTHEAD */}
        <header className="pointer-events-none absolute top-4 left-5 z-20 hidden items-center gap-2 lg:flex">
          <button
            type="button"
            onClick={handleResetFilters}
            aria-label="stanley.eat — reset map view"
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#E6DDD0]/95 bg-[#FFFDF9]/92 py-1.5 pr-3.5 pl-2 backdrop-blur-md shadow-[0_8px_22px_-10px_rgba(28,25,23,0.18)] transition-all hover:border-[#D9381E]/40 hover:bg-[#FFFDF9] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
          >
            <Image
              src="/logo-mark.png"
              alt=""
              width={26}
              height={26}
              priority
              className="h-6.5 w-6.5 shrink-0"
            />
            <span className="font-serif text-[20px] font-semibold leading-none tracking-[-0.03em] text-[#1C1917]">
              stanley<span className="text-[#D9381E]">.eat</span>
            </span>
          </button>

          <nav
            aria-label="Primary navigation"
            className="pointer-events-auto inline-flex items-center rounded-full border border-[#E6DDD0]/95 bg-[#FFFDF9]/92 p-1 backdrop-blur-md shadow-[0_8px_22px_-10px_rgba(28,25,23,0.16)]"
          >
            <span
              aria-current="page"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#D9381E] px-3 py-1 text-xs font-semibold text-[#FFFDF9] shadow-[0_2px_8px_-2px_rgba(217,56,30,0.45)]"
            >
              <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Map
            </span>
            <Link
              href="/dishes"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-[#575049] transition-colors hover:text-[#1C1917] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
            >
              <ChefHat className="h-3.5 w-3.5 text-[#8A7E71]" aria-hidden="true" />
              3D Recipes
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            title="About Stanley Yang"
            aria-label="About Stanley Yang"
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#E6DDD0]/95 bg-[#FFFDF9]/90 p-1 text-xs font-medium text-[#3F3A34] backdrop-blur-md shadow-[0_8px_22px_-10px_rgba(28,25,23,0.14)] transition-all hover:border-[#D9381E]/40 hover:bg-[#FFFDF9] hover:text-[#1C1917] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] xl:py-1 xl:pr-3 xl:pl-1"
          >
            <Image
              src="/stanley-avatar.jpg"
              alt="Stanley Yang"
              width={24}
              height={24}
              priority
              className="h-6 w-6 shrink-0 rounded-full object-cover object-[56%_22%] ring-1 ring-[#E6DDD0]"
            />
            <span className="hidden xl:inline">About</span>
          </button>
        </header>

        {/* DESKTOP FLOATING TOP-RIGHT: PICK DINNER + SHARE MAP */}
        <div className="absolute top-4 right-5 z-20 hidden items-center gap-2 lg:flex">
          <button
            type="button"
            onClick={handlePickDinner}
            disabled={filteredSpots.length === 0}
            title="Pick a random spot from current map filters"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#C63018] bg-[#D9381E] px-3.5 py-2 text-xs font-semibold text-[#FFFDF9] shadow-[0_8px_22px_-8px_rgba(217,56,30,0.55)] transition-all hover:bg-[#C33119] disabled:opacity-40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
          >
            <Dices className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Pick Dinner</span>
          </button>

          <div ref={mapShareDesktopRef} className="relative">
            <button
              type="button"
              onClick={() =>
                setActiveShareMenu((prev) =>
                  prev === 'map-desktop' ? null : 'map-desktop'
                )
              }
              title={savedOnly && savedIds.size > 0 ? 'Share Shortlist' : 'Share Map'}
              aria-label={savedOnly && savedIds.size > 0 ? 'Share Shortlist' : 'Share Map'}
              aria-expanded={activeShareMenu === 'map-desktop'}
              aria-haspopup="menu"
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-2 text-xs font-semibold backdrop-blur-md shadow-[0_8px_22px_-10px_rgba(28,25,23,0.18)] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] xl:px-3.5 ${
                copiedTarget === 'map' || activeShareMenu === 'map-desktop'
                  ? 'border-[#D9381E] bg-[#FFF5F0]/95 text-[#D9381E]'
                  : 'border-[#E6DDD0]/95 bg-[#FFFDF9]/92 text-[#1C1917] hover:border-[#D9381E]/40 hover:bg-[#FFFDF9]'
              }`}
            >
              {copiedTarget === 'map' ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden xl:inline">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5 text-[#6B6258]" aria-hidden="true" />
                  <span className="hidden xl:inline">
                    {savedOnly && savedIds.size > 0 ? 'Share Shortlist' : 'Share Map'}
                  </span>
                </>
              )}
            </button>

            {activeShareMenu === 'map-desktop' && renderShareMapMenu()}
          </div>
        </div>

        {/* DESKTOP FLOATING WHERE BAR (Clean Metro Pills + Near Me — zero clutter!) */}
        <div className="pointer-events-none absolute top-[68px] right-5 left-5 z-20 hidden flex-col items-start gap-2 lg:flex">
          <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto no-scrollbar rounded-full border border-[#E6DDD0]/90 bg-[#FFFDF9]/92 px-1.5 py-1.5 backdrop-blur-md shadow-[0_10px_26px_-12px_rgba(28,25,23,0.18)]">
            <button
              type="button"
              onClick={handleResetFilters}
              aria-pressed={!hasActiveFilters && !nearMeActive}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-all cursor-pointer ${
                !hasActiveFilters && !nearMeActive
                  ? 'bg-[#1C1917] text-[#FFFDF9]'
                  : 'text-[#575049] hover:bg-[#EFE8DC]/80 hover:text-[#1C1917]'
              }`}
            >
              All US ({RESTAURANTS.length})
            </button>

            {RESTAURANT_REGIONS.map((region) => {
              const active = selectedRegion === region;
              return (
                <button
                  key={region}
                  type="button"
                  onClick={() => handleToggleRegion(region)}
                  aria-pressed={active}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-all cursor-pointer ${
                    active
                      ? 'bg-[#D9381E] text-[#FFFDF9] font-semibold'
                      : 'text-[#575049] hover:bg-[#EFE8DC]/80 hover:text-[#1C1917]'
                  }`}
                >
                  {SHORT_REGION_LABELS[region]}
                </button>
              );
            })}

            <span aria-hidden="true" className="mx-0.5 h-4 w-px shrink-0 bg-[#E6DDD0]" />

            <button
              type="button"
              onClick={handleNearMe}
              disabled={locating}
              aria-pressed={nearMeActive}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-all cursor-pointer ${
                nearMeActive
                  ? 'bg-[#2563EB] text-white'
                  : 'text-[#3F3A34] hover:bg-[#EFE8DC]/80 hover:text-[#2563EB]'
              }`}
            >
              <Navigation
                className={`h-3 w-3 ${locating ? 'animate-pulse' : ''}`}
                aria-hidden="true"
              />
              <span>{locating ? 'Locating…' : 'Near Me'}</span>
            </button>
          </div>

          {geoNotice && (
            <div
              role="status"
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#E6DDD0] bg-[#FFFDF9]/95 px-3 py-1 text-[11.5px] font-medium text-[#575049] shadow-sm backdrop-blur-md"
            >
              <span>{geoNotice}</span>
              <button
                type="button"
                onClick={() => setGeoNotice(null)}
                aria-label="Dismiss notice"
                className="text-[#8A7E71] hover:text-[#1C1917] cursor-pointer"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {/* MOBILE FLOATING TOP HEADER + WHERE & CRAVING BARS */}
        <header className="pointer-events-none absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex flex-col gap-1.5 lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#E6DDD0]/95 bg-[#FFFDF9]/92 py-1 pr-3 pl-1.5 backdrop-blur-md shadow-[0_8px_22px_-10px_rgba(28,25,23,0.18)] cursor-pointer"
            >
              <Image
                src="/logo-mark.png"
                alt=""
                width={24}
                height={24}
                priority
                className="h-6 w-6 shrink-0"
              />
              <span className="font-serif text-[17px] font-semibold leading-none tracking-[-0.03em] text-[#1C1917]">
                stanley<span className="text-[#D9381E]">.eat</span>
              </span>
            </button>

            <div className="pointer-events-auto flex items-center gap-1.5">
              <Link
                href="/dishes"
                className="inline-flex items-center gap-1 rounded-full border border-[#E6DDD0]/95 bg-[#FFFDF9]/92 px-2.5 py-1.5 text-[11.5px] font-semibold text-[#1C1917] backdrop-blur-md shadow-[0_6px_18px_-8px_rgba(28,25,23,0.16)]"
              >
                <ChefHat className="h-3.5 w-3.5 text-[#D9381E]" aria-hidden="true" />
                <span>3D Recipes</span>
              </Link>

              <button
                type="button"
                onClick={() => setAboutOpen(true)}
                aria-label="About Stanley Yang"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E6DDD0]/95 bg-[#FFFDF9]/92 p-0.5 backdrop-blur-md shadow-[0_6px_18px_-8px_rgba(28,25,23,0.16)] cursor-pointer"
              >
                <Image
                  src="/stanley-avatar.jpg"
                  alt="Stanley Yang"
                  width={26}
                  height={26}
                  priority
                  className="h-full w-full rounded-full object-cover object-[56%_22%]"
                />
              </button>

              <div ref={mapShareMobileRef} className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setActiveShareMenu((prev) =>
                      prev === 'map-mobile' ? null : 'map-mobile'
                    )
                  }
                  aria-label="Share Stanley's eating map"
                  aria-expanded={activeShareMenu === 'map-mobile'}
                  aria-haspopup="menu"
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md shadow-[0_6px_18px_-8px_rgba(28,25,23,0.16)] cursor-pointer ${
                    copiedTarget === 'map' || activeShareMenu === 'map-mobile'
                      ? 'border-[#D9381E] bg-[#FFF5F0] text-[#D9381E]'
                      : 'border-[#E6DDD0]/95 bg-[#FFFDF9]/92 text-[#3F3A34]'
                  }`}
                >
                  {copiedTarget === 'map' ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>
                {activeShareMenu === 'map-mobile' && renderShareMapMenu()}
              </div>
            </div>
          </div>

          {/* Mobile Row 2: Where + Near Me + Pick Dinner */}
          <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              type="button"
              onClick={handleNearMe}
              disabled={locating}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md shadow-xs cursor-pointer ${
                nearMeActive
                  ? 'border-[#2563EB] bg-[#2563EB] text-white'
                  : 'border-[#E6DDD0]/95 bg-[#FFFDF9]/92 text-[#1C1917]'
              }`}
            >
              <Navigation className="h-3 w-3" aria-hidden="true" />
              <span>{locating ? 'Locating…' : 'Near Me'}</span>
            </button>

            <button
              type="button"
              onClick={handlePickDinner}
              disabled={filteredSpots.length === 0}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#C63018] bg-[#D9381E] px-2.5 py-1 text-[11px] font-semibold text-[#FFFDF9] shadow-xs disabled:opacity-40 cursor-pointer"
            >
              <Dices className="h-3 w-3" aria-hidden="true" />
              <span>Pick Dinner</span>
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md shadow-xs cursor-pointer ${
                !hasActiveFilters && !nearMeActive
                  ? 'border-[#1C1917] bg-[#1C1917] text-[#FFFDF9]'
                  : 'border-[#E6DDD0]/95 bg-[#FFFDF9]/92 text-[#575049]'
              }`}
            >
              All US
            </button>

            {RESTAURANT_REGIONS.map((region) => {
              const active = selectedRegion === region;
              return (
                <button
                  key={region}
                  type="button"
                  onClick={() => handleToggleRegion(region)}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md shadow-xs cursor-pointer ${
                    active
                      ? 'border-[#D9381E] bg-[#D9381E] text-[#FFFDF9]'
                      : 'border-[#E6DDD0]/95 bg-[#FFFDF9]/92 text-[#575049]'
                  }`}
                >
                  {SHORT_REGION_LABELS[region]}
                </button>
              );
            })}
          </div>

          {/* Mobile Row 3: Compact Craving Bar */}
          <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              type="button"
              onClick={() => setEssentialsOnly((p) => !p)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md shadow-xs cursor-pointer ${
                essentialsOnly
                  ? 'border-[#D9381E] bg-[#FFF5F0] text-[#D9381E]'
                  : 'border-[#E6DDD0]/95 bg-[#FFFDF9]/90 text-[#575049]'
              }`}
            >
              ★ Essentials
            </button>

            <button
              type="button"
              onClick={() => setUnderTwoDollarOnly((p) => !p)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md shadow-xs cursor-pointer ${
                underTwoDollarOnly
                  ? 'border-[#1C1917] bg-[#1C1917] text-[#FFFDF9]'
                  : 'border-[#E6DDD0]/95 bg-[#FFFDF9]/90 text-[#575049]'
              }`}
            >
              Under $$
            </button>

            <button
              type="button"
              onClick={() => {
                setSharedShortlistIds(null);
                setSavedOnly((p) => !p);
              }}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md shadow-xs cursor-pointer ${
                savedOnly
                  ? 'border-[#D9381E] bg-[#D9381E] text-[#FFFDF9]'
                  : 'border-[#E6DDD0]/95 bg-[#FFFDF9]/90 text-[#575049]'
              }`}
            >
              <Bookmark
                className={`h-3 w-3 ${savedOnly ? 'fill-current' : ''}`}
                aria-hidden="true"
              />
              <span>Saved{savedIds.size > 0 ? ` (${savedIds.size})` : ''}</span>
            </button>

            <select
              aria-label="Filter by cuisine"
              value={selectedCuisine}
              onChange={(e) => {
                setSelectedCuisine(e.target.value);
                setSelectedSpotId(null);
              }}
              className="shrink-0 rounded-full border border-[#E6DDD0]/95 bg-[#FFFDF9]/92 px-2.5 py-1 text-[11px] font-semibold text-[#1C1917] shadow-xs backdrop-blur-md focus:outline-none cursor-pointer"
            >
              <option value="all">All Cuisines</option>
              {RESTAURANT_CUISINES.map((cuisine) => (
                <option key={cuisine} value={cuisine}>
                  {cuisine}
                </option>
              ))}
            </select>
          </div>

          {geoNotice && (
            <div className="pointer-events-auto self-start rounded-full border border-[#E6DDD0] bg-[#FFFDF9]/95 px-3 py-1 text-[11px] font-medium text-[#575049] shadow-sm backdrop-blur-md">
              {geoNotice}
            </div>
          )}
        </header>

        {/* MOBILE FLOATING BOTTOM SPOT PREVIEW CARD */}
        <div className="pointer-events-none absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 lg:hidden">
          <div className="pointer-events-auto overflow-hidden rounded-[24px] border border-[#E6DDD0]/95 bg-[#FFFDF9]/96 shadow-[0_18px_44px_-12px_rgba(28,25,23,0.3)] backdrop-blur-md">
            {mobilePreviewSpot && tonightPickSpotId === mobilePreviewSpot.id && (
              <div className="flex items-center justify-between bg-[#D9381E] px-3.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.11em] text-[#FFFDF9]">
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Tonight&apos;s Pick
                </span>
                <button
                  type="button"
                  onClick={handlePickDinner}
                  className="underline cursor-pointer"
                >
                  Spin Again
                </button>
              </div>
            )}

            <div className="p-3.5">
              {mobilePreviewSpot ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStepSpot(-1)}
                        disabled={filteredSpots.length <= 1}
                        aria-label="Previous restaurant"
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E6DDD0] bg-[#FAF7F2] text-[#3F3A34] disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStepSpot(1)}
                        disabled={filteredSpots.length <= 1}
                        aria-label="Next restaurant"
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E6DDD0] bg-[#FAF7F2] text-[#3F3A34] disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <span className="pl-1 font-mono text-[11px] font-semibold text-[#786E63]">
                        {String(Math.max(1, activeSpotIndexInFiltered + 1)).padStart(
                          2,
                          '0'
                        )}{' '}
                        / {String(filteredSpots.length).padStart(2, '0')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleSave(mobilePreviewSpot.id)}
                        aria-pressed={mobilePreviewSaved}
                        aria-label={
                          mobilePreviewSaved
                            ? `Remove ${mobilePreviewSpot.name} from saved`
                            : `Save ${mobilePreviewSpot.name}`
                        }
                        className={`flex h-7 w-7 items-center justify-center rounded-full border cursor-pointer ${
                          mobilePreviewSaved
                            ? 'border-[#D9381E]/45 bg-[#FFF5F0] text-[#D9381E]'
                            : 'border-[#E6DDD0] bg-[#FAF7F2] text-[#6B6258]'
                        }`}
                      >
                        <Bookmark
                          className={`h-3.5 w-3.5 ${
                            mobilePreviewSaved ? 'fill-current' : ''
                          }`}
                          aria-hidden="true"
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => setMobileListOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#E6DDD0] bg-[#FAF7F2] px-3 py-1 text-[11.5px] font-semibold text-[#1C1917] cursor-pointer"
                      >
                        <List className="h-3.5 w-3.5 text-[#D9381E]" aria-hidden="true" />
                        <span>List ({filteredSpots.length})</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 rounded-lg bg-[#D9381E] px-2 py-0.5 font-mono text-[11px] font-bold text-[#FFFDF9]">
                          {mobilePreviewSpot.rating.toFixed(1)}
                        </span>
                        <h2 className="truncate font-serif text-[18px] font-semibold leading-tight text-[#1C1917]">
                          {mobilePreviewSpot.name}
                        </h2>
                      </div>
                      <p className="mt-1 truncate text-[12px] text-[#6B6258]">
                        {formatCityState(mobilePreviewSpot)} ·{' '}
                        {mobilePreviewSpot.cuisine} · {mobilePreviewSpot.price}
                        {mobilePreviewDistance !== null
                          ? ` · ${formatDistanceMiles(mobilePreviewDistance)}`
                          : ''}
                      </p>
                      <p className="mt-0.5 truncate text-[11.5px] font-medium text-[#3F3A34]">
                        Order: {mobilePreviewSpot.mustOrder[0]}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSpotId(mobilePreviewSpot.id);
                        setMobileDetailOpen(true);
                      }}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#1C1917] px-3.5 py-2 text-xs font-semibold text-[#FFFDF9] shadow-xs cursor-pointer"
                    >
                      <span>Details</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 py-1">
                  <p className="text-xs font-medium text-[#575049]">
                    No spots match those filters.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1 rounded-full bg-[#D9381E] px-3 py-1.5 text-xs font-semibold text-[#FFFDF9] cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden="true" />
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== DESKTOP SYNCED EDITORIAL COMPANION PANEL (38%) ==================== */}
      <aside
        aria-label="Stanley's eating guide"
        className="hidden lg:flex lg:h-full lg:w-[38%] lg:flex-col border-l border-[#E6DDD0] bg-[#FFFDF9]"
      >
        {selectedSpot ? (
          renderDesktopSpotDetail(selectedSpot)
        ) : (
          <>
            {/* Browse Header + Craving Bar */}
            <div className="shrink-0 space-y-3 border-b border-[#E6DDD0] px-5 pt-5 pb-4">
              {sharedShortlistIds && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-[#F0D5C8] bg-[#FFF6F1] px-3 py-2 text-xs">
                  <span className="font-semibold text-[#B8321B]">
                    Shared Shortlist ({sharedShortlistIds.length}{' '}
                    {sharedShortlistIds.length === 1 ? 'spot' : 'spots'})
                  </span>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="font-mono text-[11px] font-semibold text-[#D9381E] underline cursor-pointer"
                  >
                    Show All {RESTAURANTS.length} Spots
                  </button>
                </div>
              )}

              <div className="space-y-1">
                <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#D9381E]">
                  US Eating Atlas
                </p>
                <h1 className="font-serif text-[25px] font-semibold leading-tight tracking-[-0.025em] text-[#1C1917]">
                  Stanley&apos;s Eating Map
                </h1>
                <p className="text-[12.5px] leading-relaxed text-[#6B6258]">
                  {RESTAURANTS.length} favorite spots across the US — click any metro or
                  pin to fly there.
                </p>
              </div>

              {/* Search + Ranked / Journey Log Toggle */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#8A7E71]"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search spots, dishes, cities..."
                    aria-label="Search restaurants"
                    className="w-full rounded-full border border-[#E6DDD0] bg-[#FAF7F2] py-1.5 pr-8 pl-8.5 text-xs text-[#1C1917] placeholder:text-[#8A7E71] focus:border-[#D9381E]/55 focus:bg-[#FFFDF9] focus:outline-none focus:ring-2 focus:ring-[#D9381E]/20"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="absolute top-1/2 right-2.5 flex h-4.5 w-4.5 -translate-y-1/2 items-center justify-center rounded-full text-[#8A7E71] hover:text-[#1C1917] cursor-pointer"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div
                  role="tablist"
                  aria-label="List view mode"
                  className="inline-flex shrink-0 items-center rounded-full border border-[#E6DDD0] bg-[#FAF7F2] p-0.5"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={listMode === 'ranked'}
                    onClick={() => setListMode('ranked')}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                      listMode === 'ranked'
                        ? 'bg-[#1C1917] text-[#FFFDF9]'
                        : 'text-[#6B6258] hover:text-[#1C1917]'
                    }`}
                  >
                    {nearMeActive ? 'Nearest' : 'Ranked'}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={listMode === 'timeline'}
                    onClick={() => setListMode('timeline')}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                      listMode === 'timeline'
                        ? 'bg-[#1C1917] text-[#FFFDF9]'
                        : 'text-[#6B6258] hover:text-[#1C1917]'
                    }`}
                  >
                    Journey Log
                  </button>
                </div>
              </div>

              {/* Clean Craving Filter Bar: ★ Essentials | Under $$ | Saved (N) | Cuisine <select> */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEssentialsOnly((p) => !p)}
                  aria-pressed={essentialsOnly}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                    essentialsOnly
                      ? 'border-[#D9381E] bg-[#FFF5F0] text-[#D9381E]'
                      : 'border-[#E6DDD0] bg-[#FAF7F2] text-[#575049] hover:border-[#CFC4B4]'
                  }`}
                >
                  ★ Essentials
                </button>

                <button
                  type="button"
                  onClick={() => setUnderTwoDollarOnly((p) => !p)}
                  aria-pressed={underTwoDollarOnly}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                    underTwoDollarOnly
                      ? 'border-[#1C1917] bg-[#1C1917] text-[#FFFDF9]'
                      : 'border-[#E6DDD0] bg-[#FAF7F2] text-[#575049] hover:border-[#CFC4B4]'
                  }`}
                >
                  Under $$
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSharedShortlistIds(null);
                    setSavedOnly((p) => !p);
                  }}
                  aria-pressed={savedOnly}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                    savedOnly
                      ? 'border-[#D9381E] bg-[#D9381E] text-[#FFFDF9]'
                      : 'border-[#E6DDD0] bg-[#FAF7F2] text-[#575049] hover:border-[#CFC4B4]'
                  }`}
                >
                  <Bookmark
                    className={`h-3 w-3 ${savedOnly ? 'fill-current' : ''}`}
                    aria-hidden="true"
                  />
                  <span>Saved{savedIds.size > 0 ? ` (${savedIds.size})` : ''}</span>
                </button>

                <select
                  aria-label="Filter by cuisine"
                  value={selectedCuisine}
                  onChange={(e) => {
                    setSelectedCuisine(e.target.value);
                    setSelectedSpotId(null);
                  }}
                  className="rounded-full border border-[#E6DDD0] bg-[#FAF7F2] px-2.5 py-1 text-[11px] font-semibold text-[#1C1917] focus:border-[#D9381E]/50 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Cuisines</option>
                  {RESTAURANT_CUISINES.map((cuisine) => (
                    <option key={cuisine} value={cuisine}>
                      {cuisine}
                    </option>
                  ))}
                </select>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-[#D9381E] hover:bg-[#FFF5F0] cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden="true" />
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Spot List + Minimal Colophon */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {renderSpotListContent((id) => {
                setTonightPickSpotId(null);
                handleSelectSpot(id);
              })}

              <footer className="mx-4 mt-4 border-t border-[#E6DDD0] px-2 pt-5 pb-6">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[#6B6258]">
                  <span className="font-mono font-medium text-[#1C1917]">
                    Stanley Yang
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setAboutOpen(true)}
                      className="font-semibold text-[#1C1917] hover:text-[#D9381E] cursor-pointer"
                    >
                      About
                    </button>
                    <Link
                      href="/dishes"
                      className="font-semibold text-[#D9381E] hover:opacity-80"
                    >
                      3D Recipes
                    </Link>
                    <a
                      href="https://stanleycyang.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#D9381E]"
                    >
                      stanleycyang.com
                    </a>
                    <a
                      href="https://github.com/stanleycyang"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#D9381E]"
                    >
                      GitHub
                    </a>
                    <a
                      href="https://x.com/stanleycyang"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#D9381E]"
                    >
                      X
                    </a>
                  </div>
                </div>
              </footer>
            </div>
          </>
        )}
      </aside>

      {/* ==================== MOBILE LIST / SEARCH DRAWER ==================== */}
      {mobileListOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Browse Stanley's favorite US restaurants"
          className="fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-[#FAF7F2] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          <header className="shrink-0 space-y-3 border-b border-[#E6DDD0] bg-[#FFFDF9] px-4 py-4">
            {sharedShortlistIds && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-[#F0D5C8] bg-[#FFF6F1] px-3 py-1.5 text-xs">
                <span className="font-semibold text-[#B8321B]">
                  Shared Shortlist ({sharedShortlistIds.length})
                </span>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="font-mono text-[11px] font-semibold text-[#D9381E] underline"
                >
                  Show All {RESTAURANTS.length}
                </button>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#D9381E]">
                  US Eating Atlas
                </p>
                <h2 className="font-serif text-xl font-semibold text-[#1C1917]">
                  Stanley&apos;s Eating Map ({filteredSpots.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileListOpen(false)}
                aria-label="Close restaurant list"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E6DDD0] bg-[#FAF7F2] text-[#575049] cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#8A7E71]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search spots, dishes, cities..."
                  aria-label="Search restaurants"
                  className="w-full rounded-full border border-[#E6DDD0] bg-[#FAF7F2] py-2 pr-8 pl-8.5 text-xs text-[#1C1917] placeholder:text-[#8A7E71] focus:border-[#D9381E]/55 focus:bg-[#FFFDF9] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-2.5 flex h-4.5 w-4.5 -translate-y-1/2 items-center justify-center text-[#8A7E71]"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="inline-flex shrink-0 items-center rounded-full border border-[#E6DDD0] bg-[#FAF7F2] p-0.5">
                <button
                  type="button"
                  onClick={() => setListMode('ranked')}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                    listMode === 'ranked'
                      ? 'bg-[#1C1917] text-[#FFFDF9]'
                      : 'text-[#6B6258]'
                  }`}
                >
                  {nearMeActive ? 'Nearest' : 'Ranked'}
                </button>
                <button
                  type="button"
                  onClick={() => setListMode('timeline')}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                    listMode === 'timeline'
                      ? 'bg-[#1C1917] text-[#FFFDF9]'
                      : 'text-[#6B6258]'
                  }`}
                >
                  Log
                </button>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {renderSpotListContent((spotId) => {
              setMobileListOpen(false);
              setTonightPickSpotId(null);
              handleSelectSpot(spotId);
            })}

            <footer className="mx-4 mt-4 border-t border-[#E6DDD0] px-2 pt-5 pb-8">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[#6B6258]">
                <span className="font-mono font-medium text-[#1C1917]">
                  Stanley Yang
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileListOpen(false);
                      setAboutOpen(true);
                    }}
                    className="font-semibold text-[#1C1917]"
                  >
                    About
                  </button>
                  <Link href="/dishes" className="font-semibold text-[#D9381E]">
                    3D Recipes
                  </Link>
                  <a
                    href="https://stanleycyang.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    stanleycyang.com
                  </a>
                  <a
                    href="https://github.com/stanleycyang"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub
                  </a>
                  <a
                    href="https://x.com/stanleycyang"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    X
                  </a>
                </div>
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* ==================== MOBILE FULL DETAILS SHEET MODAL ==================== */}
      <RestaurantSpotModal
        spot={selectedSpot}
        isOpen={mobileDetailOpen && Boolean(selectedSpot)}
        onClose={() => {
          setMobileDetailOpen(false);
        }}
        isSaved={selectedSpot ? savedIds.has(selectedSpot.id) : false}
        onToggleSave={
          selectedSpot ? () => handleToggleSave(selectedSpot.id) : undefined
        }
        distanceMiles={
          selectedSpot ? (distanceBySpotId.get(selectedSpot.id) ?? null) : null
        }
        isTonightPick={
          selectedSpot ? tonightPickSpotId === selectedSpot.id : false
        }
      />

      {/* ==================== ABOUT STANLEY MODAL ==================== */}
      <AboutStanleyModal
        dishes={RECIPES}
        isOpen={aboutOpen}
        onClose={() => setAboutOpen(false)}
      />
    </div>
  );
}

export default RestaurantHomeApp;

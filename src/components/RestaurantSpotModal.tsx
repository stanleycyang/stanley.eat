'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bookmark,
  Calendar,
  Check,
  ChefHat,
  Copy,
  ExternalLink,
  Link2,
  MapPin,
  MessageSquareShare,
  Navigation,
  Share2,
  Sparkles,
  Star,
  Utensils,
  X,
} from 'lucide-react';
import { RECIPE_MAP } from '@/data/recipes';
import type { RestaurantSpot, SpotTier } from '@/types/restaurant';

export interface RestaurantSpotModalProps {
  spot: RestaurantSpot | null;
  isOpen: boolean;
  onClose: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
  distanceMiles?: number | null;
  isTonightPick?: boolean;
}

const TIER_META: Record<SpotTier, { label: string; badgeClass: string }> = {
  essential: {
    label: '★ Essential',
    badgeClass: 'border-[#D9381E]/35 bg-[#FFF5F0] text-[#B8321B]',
  },
  'go-to': {
    label: 'Go-To',
    badgeClass: 'border-[#E6DDD0] bg-[#FAF7F2] text-[#575049]',
  },
  'worth-the-drive': {
    label: 'Worth the Drive',
    badgeClass: 'border-[#DFCFAF] bg-[#FBF4E4] text-[#7A5618]',
  },
};

function formatDistanceMiles(miles: number): string {
  if (miles < 0.1) return '0.1 mi away';
  if (miles < 10) return `${miles.toFixed(1)} mi away`;
  return `${Math.round(miles).toLocaleString()} mi away`;
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

export function RestaurantSpotModal({
  spot,
  isOpen,
  onClose,
  isSaved = false,
  onToggleSave,
  distanceMiles = null,
  isTonightPick = false,
}: RestaurantSpotModalProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedOrder, setCopiedOrder] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  const shareMenuRef = useRef<HTMLDivElement | null>(null);
  const linkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== 'undefined' && typeof navigator.share === 'function'
    );
  }, []);

  useEffect(() => {
    return () => {
      if (linkTimerRef.current) clearTimeout(linkTimerRef.current);
      if (orderTimerRef.current) clearTimeout(orderTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setShareOpen(false);
    setCopiedLink(false);
    setCopiedOrder(false);
  }, [spot?.id, isOpen]);

  // Body scroll lock & Escape dismissal
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (shareOpen) {
          setShareOpen(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, shareOpen, onClose]);

  // Close share popover on outside click
  useEffect(() => {
    if (!shareOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (
        shareMenuRef.current &&
        !shareMenuRef.current.contains(event.target as Node)
      ) {
        setShareOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [shareOpen]);

  const spotCityState = spot
    ? spot.state
      ? `${spot.city}, ${spot.state}`
      : spot.city
    : '';

  const spotShareUrl = spot
    ? typeof window !== 'undefined'
      ? `${window.location.origin}/spot/${spot.id}`
      : `https://www.stanley.eat/spot/${spot.id}`
    : 'https://www.stanley.eat';

  const handleCopySpotLink = useCallback(async () => {
    if (!spot) return;
    const ok = await copyString(spotShareUrl);
    if (ok) {
      setCopiedLink(true);
      if (linkTimerRef.current) clearTimeout(linkTimerRef.current);
      linkTimerRef.current = setTimeout(() => setCopiedLink(false), 2000);
    }
  }, [spot, spotShareUrl]);

  const handleCopyOrder = useCallback(async () => {
    if (!spot) return;
    const orderText = `${spot.name} (${spotCityState}) — Stanley's order: ${spot.mustOrder.join(
      ', '
    )} · https://www.stanley.eat/spot/${spot.id}`;
    const ok = await copyString(orderText);
    if (ok) {
      setCopiedOrder(true);
      if (orderTimerRef.current) clearTimeout(orderTimerRef.current);
      orderTimerRef.current = setTimeout(() => setCopiedOrder(false), 2000);
    }
  }, [spot, spotCityState]);

  const handleNativeShare = useCallback(async () => {
    if (!spot) return;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${spot.name} (${spotCityState}) — stanley.eat`,
          text: `${spot.rating.toFixed(1)}/10 · Order: ${spot.mustOrder
            .slice(0, 2)
            .join(', ')}`,
          url: spotShareUrl,
        });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
      }
    }
    await handleCopySpotLink();
  }, [spot, spotCityState, spotShareUrl, handleCopySpotLink]);

  if (!isOpen || !spot) return null;

  const tierMeta = TIER_META[spot.tier];
  const relatedDish = spot.relatedDishId ? RECIPE_MAP[spot.relatedDishId] : null;
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
  const xShareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${spot.name} (${spotCityState}) — ${spot.rating.toFixed(1)}/10 on stanley.eat by @stanleycyang`
  )}&url=${encodeURIComponent(canonicalSpotUrl)}`;
  const linkedInShareHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    canonicalSpotUrl
  )}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="spot-modal-title"
      className="fixed inset-0 z-50 flex h-[100dvh] items-center justify-center overflow-hidden bg-[#1C1917]/40 px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-[#E6DDD0] bg-[#FAF7F2] text-[#1C1917] shadow-[0_28px_80px_-20px_rgba(28,25,23,0.4)] sm:max-h-[88dvh]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Optional Tonight's Pick Ribbon */}
        {isTonightPick && (
          <div className="flex shrink-0 items-center justify-center gap-1.5 border-b border-[#F0D5C8] bg-[#D9381E] px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#FFFDF9]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Tonight&apos;s Pick</span>
          </div>
        )}

        {/* Editorial Spot Header */}
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#E6DDD0] bg-[#FFFDF9] px-4 py-4 sm:px-7 sm:py-5">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] ${tierMeta.badgeClass}`}
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
              {distanceMiles !== null && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#C9DCF5] bg-[#EFF6FF] px-2 py-0.5 font-mono text-[10.5px] font-semibold text-[#1D4ED8]">
                  <Navigation className="h-2.5 w-2.5" aria-hidden="true" />
                  {formatDistanceMiles(distanceMiles)}
                </span>
              )}
            </div>

            <div>
              <h2
                id="spot-modal-title"
                className="font-serif text-2xl sm:text-[28px] font-semibold leading-tight tracking-[-0.025em] text-[#1C1917]"
              >
                {spot.name}
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-[13px] text-[#6B6258]">
                <span className="inline-flex items-center gap-1 font-medium text-[#3F3A34]">
                  <MapPin className="h-3.5 w-3.5 text-[#D9381E]" aria-hidden="true" />
                  {spotCityState}
                  {spot.neighborhood ? ` · ${spot.neighborhood}` : ''}
                </span>
                <span aria-hidden="true" className="text-[#CFC4B4]">·</span>
                <span className="inline-flex items-center gap-1 font-mono text-[11.5px]">
                  <Calendar className="h-3 w-3 text-[#8A7E71]" aria-hidden="true" />
                  {spot.visitCount}× visited · Last {spot.lastVisited}
                </span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {onToggleSave && (
              <button
                type="button"
                onClick={onToggleSave}
                aria-pressed={isSaved}
                aria-label={
                  isSaved
                    ? `Remove ${spot.name} from Want to Try`
                    : `Save ${spot.name} to Want to Try`
                }
                title={isSaved ? 'Saved in Want to Try' : 'Save to Want to Try'}
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] ${
                  isSaved
                    ? 'border-[#D9381E]/45 bg-[#FFF5F0] text-[#D9381E]'
                    : 'border-[#E6DDD0] bg-[#FAF7F2] text-[#6B6258] hover:border-[#D9381E]/40 hover:text-[#D9381E]'
                }`}
              >
                <Bookmark
                  className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`}
                  aria-hidden="true"
                />
              </button>
            )}

            <div
              aria-label={`Rated ${spot.rating.toFixed(1)} out of 10`}
              className="flex flex-col items-center justify-center rounded-2xl border border-[#F0D5C8] bg-[#FFF5F0] px-2.5 py-1.5 text-center"
            >
              <span className="font-mono text-base font-bold leading-none text-[#D9381E]">
                {spot.rating.toFixed(1)}
              </span>
              <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[#9E5242]">
                / 10
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={`Close ${spot.name} details`}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E6DDD0] bg-[#FAF7F2] text-[#575049] transition-colors hover:border-[#D9381E]/40 hover:bg-[#FFF5F0] hover:text-[#1C1917] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Scrollable Editorial Body */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5 sm:px-7 sm:py-6">
          {/* Stanley's Take */}
          <blockquote className="rounded-r-2xl border border-[#E6DDD0] border-l-4 border-l-[#D9381E] bg-[#FFFDF9] p-4 sm:p-5">
            <span className="mb-1.5 block font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#8A7E71]">
              Stanley&apos;s Take
            </span>
            <p className="font-serif text-[16px] sm:text-[17px] leading-[1.65] text-[#1C1917]">
              &ldquo;{spot.stanleysNote}&rdquo;
            </p>
          </blockquote>

          {/* What to Order + 1-Tap Copy Order */}
          <section aria-labelledby="what-to-order-heading" className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3
                id="what-to-order-heading"
                className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6258]"
              >
                <Utensils className="h-3.5 w-3.5 text-[#D9381E]" aria-hidden="true" />
                What to Order
              </h3>

              <button
                type="button"
                onClick={() => void handleCopyOrder()}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] ${
                  copiedOrder
                    ? 'border-[#D9381E] bg-[#FFF5F0] text-[#D9381E]'
                    : 'border-[#E6DDD0] bg-[#FFFDF9] text-[#575049] hover:border-[#D9381E]/40 hover:text-[#1C1917]'
                }`}
              >
                {copiedOrder ? (
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

            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {spot.mustOrder.map((dishName, idx) => (
                <li
                  key={dishName}
                  className="flex items-start gap-2.5 rounded-xl border border-[#E6DDD0] bg-[#FFFDF9] px-3.5 py-2.5 text-[13.5px] font-medium text-[#1C1917]"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFF5F0] font-mono text-[10.5px] font-bold text-[#D9381E]">
                    {idx + 1}
                  </span>
                  <span>{dishName}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Pro Tip */}
          <aside
            aria-label="Pro Tip"
            className="rounded-2xl border border-[#E6D8C6] bg-[#F7EFE4] p-4"
          >
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
                  className="rounded-full border border-[#E6DDD0] bg-[#FFFDF9] px-3 py-1 text-xs font-medium text-[#575049]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Action Bar: Apple Maps + Google Maps + Reserve / Info + Share */}
          <div className="grid grid-cols-2 gap-2 pt-1 sm:flex sm:flex-wrap sm:items-center">
            <a
              href={appleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#1C1917] bg-[#1C1917] px-3.5 py-2 text-xs font-semibold text-[#FFFDF9] transition-all hover:bg-[#332E2A]"
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Apple Maps</span>
            </a>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#E6DDD0] bg-[#FFFDF9] px-3.5 py-2 text-xs font-semibold text-[#1C1917] transition-all hover:border-[#D9381E]/40 hover:bg-[#FFF8F5]"
            >
              <Navigation className="h-3.5 w-3.5 text-[#D9381E]" aria-hidden="true" />
              <span>Google Maps</span>
            </a>

            <a
              href={reserveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#E6DDD0] bg-[#FFFDF9] px-3.5 py-2 text-xs font-semibold text-[#3F3A34] transition-all hover:border-[#D9381E]/40 hover:bg-[#FFF8F5]"
            >
              <span>Reserve / Info</span>
              <ExternalLink className="h-3 w-3 opacity-70" aria-hidden="true" />
            </a>

            <div ref={shareMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setShareOpen((prev) => !prev)}
                aria-expanded={shareOpen}
                aria-haspopup="menu"
                className={`inline-flex w-full items-center justify-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] sm:w-auto ${
                  copiedLink || shareOpen
                    ? 'border-[#D9381E] bg-[#FFF5F0] text-[#D9381E]'
                    : 'border-[#E6DDD0] bg-[#FFFDF9] text-[#1C1917] hover:border-[#D9381E]/40 hover:bg-[#FFF8F5]'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5 text-[#6B6258]" aria-hidden="true" />
                    <span>Share Spot</span>
                  </>
                )}
              </button>

              {shareOpen && (
                <div
                  role="menu"
                  aria-label={`Share ${spot.name}`}
                  className="absolute bottom-full right-0 z-30 mb-2 w-64 rounded-2xl border border-[#E6DDD0] bg-[#FFFDF9]/98 p-2 text-[#1C1917] shadow-[0_18px_44px_-12px_rgba(28,25,23,0.28)] backdrop-blur-md"
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
                      onClick={() => void handleCopySpotLink()}
                      className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-[#1C1917] transition-colors hover:bg-[#FAF7F2] cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        {copiedLink ? (
                          <Check className="h-3.5 w-3.5 text-[#D9381E]" aria-hidden="true" />
                        ) : (
                          <Link2 className="h-3.5 w-3.5 text-[#6B6258]" aria-hidden="true" />
                        )}
                        <span>{copiedLink ? 'Copied!' : 'Copy Spot Link'}</span>
                      </span>
                    </button>

                    <a
                      role="menuitem"
                      href={xShareHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShareOpen(false)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-[#1C1917] transition-colors hover:bg-[#FAF7F2]"
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
                      href={linkedInShareHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShareOpen(false)}
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
                          setShareOpen(false);
                          void handleNativeShare();
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

          {/* Upgraded 3D Dish Bridge */}
          {relatedDish && (
            <Link
              href={`/dish/${relatedDish.id}`}
              onClick={onClose}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-[#F0D5C8] bg-[#FFF6F1] p-4 transition-all hover:border-[#D9381E]/60 hover:bg-[#FFF0E8] hover:shadow-[0_10px_26px_-14px_rgba(217,56,30,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
            >
              <div className="flex min-w-0 items-center gap-3.5">
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
                  <p className="truncate font-serif text-[17px] font-semibold text-[#1C1917] group-hover:text-[#D9381E] transition-colors">
                    {relatedDish.name}
                  </p>
                  <p className="font-mono text-[11px] text-[#786E63]">
                    {relatedDish.prepTime} prep · {relatedDish.cookTime} cook · Interactive 3D
                  </p>
                </div>
              </div>

              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#F0D5C8] bg-[#FFFDF9] text-[#D9381E] transition-all group-hover:border-[#D9381E] group-hover:bg-[#D9381E] group-hover:text-[#FFFDF9]">
                <ArrowRight
                  className="h-4.5 w-4.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>
          )}

          {/* Subtle Metadata Footer */}
          <div className="flex items-center justify-between border-t border-[#E6DDD0]/80 pt-3 font-mono text-[11px] text-[#8A7E71]">
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3 fill-[#D9381E] text-[#D9381E]" aria-hidden="true" />
              {spot.region}
            </span>
            <span>stanley.eat/spot/{spot.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RestaurantSpotModal;

'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import { Compass, Minus, Plus } from 'lucide-react';
import type { RestaurantSpot } from '@/types/restaurant';

export interface InteractiveFoodMapProps {
  spots: RestaurantSpot[];
  selectedSpotId: string | null;
  hoveredSpotId: string | null;
  fitTrigger: number;
  onSelectSpot: (spotId: string) => void;
  onHoverSpot: (spotId: string | null) => void;
}

const OPENFREEMAP_POSITRON_STYLE =
  'https://tiles.openfreemap.org/styles/positron';

const FALLBACK_OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-raster-layer',
      type: 'raster',
      source: 'osm-raster',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

interface MarkerRecord {
  marker: maplibregl.Marker;
  root: HTMLDivElement;
  button: HTMLButtonElement;
  pulse: HTMLSpanElement;
  tooltip: HTMLDivElement;
  star: HTMLSpanElement | null;
  spot: RestaurantSpot;
  cleanup: () => void;
}

const BASE_BUTTON_CLASSES =
  'relative inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[11.5px] font-bold leading-none transition-all duration-200 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]';

function applyMarkerVisualState(
  record: MarkerRecord,
  isSelected: boolean,
  isHovered: boolean
): void {
  const { marker, button, pulse, tooltip, star, spot } = record;
  const isEssential = spot.tier === 'essential';
  const markerEl = marker.getElement();

  if (isSelected) {
    markerEl.style.zIndex = '30';
    button.className = `${BASE_BUTTON_CLASSES} bg-[#D9381E] text-[#FFFDF9] border-2 border-[#FFFDF9] scale-[1.16] shadow-[0_10px_24px_-4px_rgba(217,56,30,0.6)]`;
    pulse.className =
      'pointer-events-none absolute -inset-1.5 rounded-full bg-[#D9381E]/30 animate-ping';
    if (star) {
      star.className = 'text-[9px] leading-none text-[#FFE6DC]';
    }
  } else if (isHovered) {
    markerEl.style.zIndex = '20';
    button.className = `${BASE_BUTTON_CLASSES} bg-[#1C1917] text-[#FFFDF9] border-2 border-[#FFFDF9] scale-[1.1] shadow-[0_10px_22px_-4px_rgba(28,25,23,0.45)]`;
    pulse.className = 'hidden';
    if (star) {
      star.className = 'text-[9px] leading-none text-[#F2B59B]';
    }
  } else {
    markerEl.style.zIndex = isEssential ? '12' : '10';
    button.className = `${BASE_BUTTON_CLASSES} bg-[#FFFDF9] text-[#1C1917] ${
      isEssential
        ? 'border-[1.5px] border-[#D9381E]/60 shadow-[0_6px_16px_-4px_rgba(28,25,23,0.24)]'
        : 'border border-[#D6C9B8] shadow-[0_5px_14px_-4px_rgba(28,25,23,0.18)]'
    } hover:border-[#D9381E]`;
    pulse.className = 'hidden';
    if (star) {
      star.className = 'text-[9px] leading-none text-[#D9381E]';
    }
  }

  button.setAttribute('aria-pressed', String(isSelected));

  // Crisp floating tooltip above pin on hover or selection
  if (isHovered || isSelected) {
    tooltip.className =
      'pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#E6DDD0] bg-[#FFFDF9]/96 px-2.5 py-1 text-[11px] font-medium text-[#1C1917] shadow-[0_8px_20px_-6px_rgba(28,25,23,0.26)] backdrop-blur-md transition-opacity duration-150 opacity-100';
  } else {
    tooltip.className =
      'pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#E6DDD0] bg-[#FFFDF9]/96 px-2.5 py-1 text-[11px] font-medium text-[#1C1917] shadow-[0_8px_20px_-6px_rgba(28,25,23,0.26)] backdrop-blur-md transition-opacity duration-150 opacity-0';
  }
}

export function InteractiveFoodMap({
  spots,
  selectedSpotId,
  hoveredSpotId,
  fitTrigger,
  onSelectSpot,
  onHoverSpot,
}: InteractiveFoodMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, MarkerRecord>>(new Map());
  const styleLoadedRef = useRef(false);
  const fallbackAppliedRef = useRef(false);
  const prevFitTriggerRef = useRef(fitTrigger);
  const prevSpotsKeyRef = useRef('');

  // Keep latest callbacks in refs so marker DOM listeners stay stable
  const onSelectRef = useRef(onSelectSpot);
  const onHoverRef = useRef(onHoverSpot);
  const initialSpotsRef = useRef(spots);
  const initialSelectedIdRef = useRef(selectedSpotId);

  useEffect(() => {
    onSelectRef.current = onSelectSpot;
  }, [onSelectSpot]);

  useEffect(() => {
    onHoverRef.current = onHoverSpot;
  }, [onHoverSpot]);

  const spotsKey = useMemo(
    () => spots.map((spot) => spot.id).join('|'),
    [spots]
  );

  const fitMapToSpots = useCallback(
    (targetSpots: RestaurantSpot[], instant = false) => {
      const map = mapRef.current;
      if (!map || targetSpots.length === 0) return;

      const isMobile =
        typeof window !== 'undefined' && window.innerWidth < 1024;

      if (targetSpots.length === 1) {
        const only = targetSpots[0];
        map.flyTo({
          center: [only.coordinates.lng, only.coordinates.lat],
          zoom: 13.4,
          offset: isMobile ? [0, -36] : [0, 0],
          duration: instant ? 0 : 700,
          essential: true,
        });
        return;
      }

      const bounds = new maplibregl.LngLatBounds();
      for (const spot of targetSpots) {
        bounds.extend([spot.coordinates.lng, spot.coordinates.lat]);
      }

      map.fitBounds(bounds, {
        padding: isMobile
          ? { top: 120, bottom: 185, left: 36, right: 36 }
          : { top: 100, bottom: 130, left: 48, right: 48 },
        maxZoom: 13.0,
        duration: instant ? 0 : 800,
      });
    },
    []
  );

  // Initialize MapLibre GL map once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    styleLoadedRef.current = false;
    fallbackAppliedRef.current = false;

    const map = new maplibregl.Map({
      container,
      style: OPENFREEMAP_POSITRON_STYLE,
      center: [-98.5, 38.0],
      zoom: 3.7,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    map.on('load', () => {
      styleLoadedRef.current = true;
    });

    map.on('style.load', () => {
      styleLoadedRef.current = true;
    });

    map.on('error', () => {
      if (!styleLoadedRef.current && !fallbackAppliedRef.current) {
        fallbackAppliedRef.current = true;
        map.setStyle(FALLBACK_OSM_RASTER_STYLE);
      }
    });

    // Initial framing (direct /spot/[id] deep link vs overview of all Bay Area pins)
    const initSpots = initialSpotsRef.current;
    const initSelectedId = initialSelectedIdRef.current;
    const initSpot = initSelectedId
      ? initSpots.find((item) => item.id === initSelectedId)
      : null;

    if (initSpot) {
      const isMobile =
        typeof window !== 'undefined' && window.innerWidth < 1024;
      map.jumpTo({
        center: [initSpot.coordinates.lng, initSpot.coordinates.lat],
        zoom: 13.6,
        padding: isMobile
          ? { top: 96, bottom: 170, left: 24, right: 24 }
          : { top: 80, bottom: 40, left: 40, right: 40 },
      });
    } else if (initSpots.length > 0) {
      fitMapToSpots(initSpots, true);
    }

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            map.resize();
          })
        : null;
    resizeObserver?.observe(container);

    const markersMap = markersRef.current;

    return () => {
      resizeObserver?.disconnect();
      for (const record of markersMap.values()) {
        record.cleanup();
        record.marker.remove();
      }
      markersMap.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [fitMapToSpots]);

  // Sync HTML Marker DOM instances when visible spots change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markersMap = markersRef.current;
    const nextIds = new Set(spots.map((spot) => spot.id));

    // Remove markers no longer in filtered spots
    for (const [id, record] of markersMap.entries()) {
      if (!nextIds.has(id)) {
        record.cleanup();
        record.marker.remove();
        markersMap.delete(id);
      }
    }

    // Add markers for new spots
    for (const spot of spots) {
      if (markersMap.has(spot.id)) continue;

      const root = document.createElement('div');
      root.className = 'relative flex items-center justify-center';

      const pulse = document.createElement('span');
      pulse.className = 'hidden';
      root.appendChild(pulse);

      const tooltip = document.createElement('div');
      const nameSpan = document.createElement('span');
      nameSpan.className = 'font-serif font-semibold text-[#1C1917]';
      nameSpan.textContent = spot.name;
      const citySpan = document.createElement('span');
      citySpan.className = 'text-[#786E63]';
      citySpan.textContent = spot.state
        ? ` · ${spot.city}, ${spot.state}`
        : ` · ${spot.city}`;
      tooltip.appendChild(nameSpan);
      tooltip.appendChild(citySpan);
      root.appendChild(tooltip);

      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute(
        'aria-label',
        `${spot.name} in ${spot.state ? `${spot.city}, ${spot.state}` : spot.city}, rated ${spot.rating.toFixed(1)} out of 10`
      );

      let star: HTMLSpanElement | null = null;
      if (spot.tier === 'essential') {
        star = document.createElement('span');
        star.setAttribute('aria-hidden', 'true');
        star.textContent = '★';
        button.appendChild(star);
      }

      const scoreText = document.createElement('span');
      scoreText.textContent = spot.rating.toFixed(1);
      button.appendChild(scoreText);

      root.appendChild(button);

      const handleClick = (event: MouseEvent) => {
        event.stopPropagation();
        onSelectRef.current(spot.id);
      };
      const handleEnter = () => onHoverRef.current(spot.id);
      const handleLeave = () => onHoverRef.current(null);

      button.addEventListener('click', handleClick);
      button.addEventListener('mouseenter', handleEnter);
      button.addEventListener('mouseleave', handleLeave);
      button.addEventListener('focus', handleEnter);
      button.addEventListener('blur', handleLeave);

      const marker = new maplibregl.Marker({
        element: root,
        anchor: 'center',
      })
        .setLngLat([spot.coordinates.lng, spot.coordinates.lat])
        .addTo(map);

      const record: MarkerRecord = {
        marker,
        root,
        button,
        pulse,
        tooltip,
        star,
        spot,
        cleanup: () => {
          button.removeEventListener('click', handleClick);
          button.removeEventListener('mouseenter', handleEnter);
          button.removeEventListener('mouseleave', handleLeave);
          button.removeEventListener('focus', handleEnter);
          button.removeEventListener('blur', handleLeave);
        },
      };

      applyMarkerVisualState(
        record,
        spot.id === selectedSpotId,
        spot.id === hoveredSpotId
      );
      markersMap.set(spot.id, record);
    }
  }, [spots, selectedSpotId, hoveredSpotId]);

  // Update visual styling of existing markers cleanly when selection or hover changes
  useEffect(() => {
    for (const [id, record] of markersRef.current.entries()) {
      applyMarkerVisualState(
        record,
        id === selectedSpotId,
        id === hoveredSpotId
      );
    }
  }, [spots, selectedSpotId, hoveredSpotId]);

  // Smooth flyTo when selectedSpotId changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedSpotId) return;

    const target = spots.find((spot) => spot.id === selectedSpotId);
    if (!target) return;

    const isMobile =
      typeof window !== 'undefined' && window.innerWidth < 1024;

    map.flyTo({
      center: [target.coordinates.lng, target.coordinates.lat],
      zoom: Math.max(Math.min(map.getZoom(), 14.5), 13.4),
      offset: isMobile ? [0, -36] : [0, 0],
      duration: 850,
      essential: true,
    });
  }, [selectedSpotId, spots]);

  // Smooth fitBounds when filter set changes (without a locked selection) or fitTrigger increments
  useEffect(() => {
    const triggerChanged = fitTrigger !== prevFitTriggerRef.current;
    const spotsChanged =
      prevSpotsKeyRef.current !== '' && spotsKey !== prevSpotsKeyRef.current;

    prevFitTriggerRef.current = fitTrigger;
    prevSpotsKeyRef.current = spotsKey;

    if (triggerChanged || (spotsChanged && !selectedSpotId)) {
      fitMapToSpots(spots, false);
    }
  }, [fitTrigger, spotsKey, spots, selectedSpotId, fitMapToSpots]);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn({ duration: 280 });
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut({ duration: 280 });
  }, []);

  const handleFitAll = useCallback(() => {
    fitMapToSpots(spots, false);
  }, [fitMapToSpots, spots]);

  return (
    <div className="stanley-food-map relative h-full w-full overflow-hidden bg-[#F3EDE2]">
      <div
        ref={containerRef}
        aria-label="Interactive US food map"
        className="h-full w-full"
      />

      {/* Minimal Floating Frosted-Linen Map Controls */}
      <div
        aria-label="Map controls"
        className="absolute right-3 bottom-[204px] z-20 flex flex-col overflow-hidden rounded-2xl border border-[#E6DDD0]/95 bg-[#FFFDF9]/92 shadow-[0_10px_28px_-10px_rgba(28,25,23,0.22)] backdrop-blur-md lg:right-5 lg:bottom-6"
      >
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Zoom in"
          title="Zoom in"
          className="flex h-9 w-9 items-center justify-center text-[#3F3A34] transition-colors hover:bg-[#FAF7F2] hover:text-[#D9381E] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D9381E]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="h-px w-full bg-[#E6DDD0]/85" />

        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Zoom out"
          title="Zoom out"
          className="flex h-9 w-9 items-center justify-center text-[#3F3A34] transition-colors hover:bg-[#FAF7F2] hover:text-[#D9381E] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D9381E]"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="h-px w-full bg-[#E6DDD0]/85" />

        <button
          type="button"
          onClick={handleFitAll}
          aria-label="Fit all visible spots on map"
          title="Fit all spots"
          className="flex h-9 w-9 items-center justify-center text-[#3F3A34] transition-colors hover:bg-[#FAF7F2] hover:text-[#D9381E] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D9381E]"
        >
          <Compass className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default InteractiveFoodMap;

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import { Compass, Minus, Plus } from 'lucide-react';
import type { MetroRegion, RestaurantSpot } from '@/types/restaurant';

export interface InteractiveFoodMapProps {
  spots: RestaurantSpot[];
  selectedSpotId: string | null;
  hoveredSpotId: string | null;
  savedIds?: ReadonlySet<string>;
  userLocation?: { lat: number; lng: number } | null;
  fitTrigger: number;
  onSelectSpot: (spotId: string) => void;
  onHoverSpot: (spotId: string | null) => void;
  onSelectRegion?: (region: MetroRegion) => void;
}

type ZoomTier = 'us' | 'metro' | 'street';

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

const CLUSTER_SHORT_LABELS: Record<MetroRegion, string> = {
  'Bay Area': 'Bay Area',
  'Los Angeles': 'LA',
  Austin: 'Austin',
  'New York': 'NYC',
  Seattle: 'Seattle',
  Chicago: 'Chicago',
};

function getZoomTier(zoom: number): ZoomTier {
  if (zoom < 6.5) return 'us';
  if (zoom < 11.8) return 'metro';
  return 'street';
}

function truncatePinName(name: string, maxLen = 18): string {
  const cleaned = name
    .replace(/\bRestaurant\b/gi, '')
    .replace(/\bDelicatessen\b/gi, 'Deli')
    .replace(/\bBarbecue\b/gi, 'BBQ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen - 1).trimEnd()}…`;
}

interface SpotMarkerRecord {
  marker: maplibregl.Marker;
  root: HTMLDivElement;
  button: HTMLButtonElement;
  pulse: HTMLSpanElement;
  tooltip: HTMLDivElement;
  star: HTMLSpanElement | null;
  nameLabel: HTMLSpanElement;
  savedDot: HTMLSpanElement;
  dishDot: HTMLSpanElement | null;
  spot: RestaurantSpot;
  cleanup: () => void;
}

interface ClusterMarkerRecord {
  marker: maplibregl.Marker;
  cleanup: () => void;
}

const BASE_PIN_CLASSES =
  'relative inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[11.5px] font-bold leading-none transition-all duration-200 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]';

function applySpotMarkerState(
  record: SpotMarkerRecord,
  isSelected: boolean,
  isHovered: boolean,
  isSaved: boolean,
  showStreetLabel: boolean
): void {
  const {
    marker,
    button,
    pulse,
    tooltip,
    star,
    nameLabel,
    savedDot,
    dishDot,
    spot,
  } = record;
  const isEssential = spot.tier === 'essential';
  const markerEl = marker.getElement();

  if (isSelected) {
    markerEl.style.zIndex = '35';
    button.className = `${BASE_PIN_CLASSES} bg-[#D9381E] text-[#FFFDF9] border-2 border-[#FFFDF9] scale-[1.12] shadow-[0_10px_24px_-4px_rgba(217,56,30,0.62)]`;
    pulse.className =
      'pointer-events-none absolute -inset-1.5 rounded-full bg-[#D9381E]/30 animate-ping';
    if (star) star.className = 'text-[9px] leading-none text-[#FFE6DC]';
  } else if (isHovered) {
    markerEl.style.zIndex = '25';
    button.className = `${BASE_PIN_CLASSES} bg-[#1C1917] text-[#FFFDF9] border-2 border-[#FFFDF9] scale-[1.08] shadow-[0_10px_22px_-4px_rgba(28,25,23,0.45)]`;
    pulse.className = 'hidden';
    if (star) star.className = 'text-[9px] leading-none text-[#F2B59B]';
  } else {
    markerEl.style.zIndex = isEssential ? '14' : isSaved ? '13' : '10';
    button.className = `${BASE_PIN_CLASSES} bg-[#FFFDF9] text-[#1C1917] ${
      isEssential
        ? 'border-[1.5px] border-[#D9381E]/65 shadow-[0_6px_16px_-4px_rgba(28,25,23,0.24)]'
        : 'border border-[#D6C9B8] shadow-[0_5px_14px_-4px_rgba(28,25,23,0.18)]'
    } hover:border-[#D9381E]`;
    pulse.className = 'hidden';
    if (star) star.className = 'text-[9px] leading-none text-[#D9381E]';
  }

  // Street-level compact labeled pin (or always for the selected spot)
  if (showStreetLabel || isSelected) {
    nameLabel.className = `font-sans text-[11px] font-semibold tracking-[-0.01em] whitespace-nowrap ${
      isSelected || isHovered ? 'text-[#FFFDF9]/95' : 'text-[#292524]'
    }`;
  } else {
    nameLabel.className = 'hidden';
  }

  // Saved bookmark micro-indicator
  if (isSaved) {
    savedDot.className = `text-[9px] leading-none ${
      isSelected || isHovered ? 'text-[#FFD7C7]' : 'text-[#D9381E]'
    }`;
  } else {
    savedDot.className = 'hidden';
  }

  // Subtle 3D recipe dot indicator
  if (dishDot) {
    dishDot.className = `h-1.5 w-1.5 rounded-full shrink-0 ${
      isSelected || isHovered ? 'bg-[#FFE1D4]' : 'bg-[#D9381E]/75'
    }`;
  }

  button.setAttribute('aria-pressed', String(isSelected));

  // Show full tooltip on hover (when not already selected) or at metro zoom
  if (isHovered && !isSelected) {
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
  savedIds,
  userLocation,
  fitTrigger,
  onSelectSpot,
  onHoverSpot,
  onSelectRegion,
}: InteractiveFoodMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const spotMarkersRef = useRef<Map<string, SpotMarkerRecord>>(new Map());
  const clusterMarkersRef = useRef<Map<string, ClusterMarkerRecord>>(new Map());
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

  const styleLoadedRef = useRef(false);
  const fallbackAppliedRef = useRef(false);
  const prevFitTriggerRef = useRef(fitTrigger);
  const prevSpotsKeyRef = useRef('');

  const [zoomTier, setZoomTier] = useState<ZoomTier>(() =>
    selectedSpotId ? 'street' : 'us'
  );

  // Keep latest callbacks in refs so DOM marker handlers never go stale
  const onSelectRef = useRef(onSelectSpot);
  const onHoverRef = useRef(onHoverSpot);
  const onSelectRegionRef = useRef(onSelectRegion);
  const initialSpotsRef = useRef(spots);
  const initialSelectedIdRef = useRef(selectedSpotId);

  useEffect(() => {
    onSelectRef.current = onSelectSpot;
  }, [onSelectSpot]);

  useEffect(() => {
    onHoverRef.current = onHoverSpot;
  }, [onHoverSpot]);

  useEffect(() => {
    onSelectRegionRef.current = onSelectRegion;
  }, [onSelectRegion]);

  const spotsKey = useMemo(
    () => spots.map((spot) => spot.id).join('|'),
    [spots]
  );

  const regionGroups = useMemo(() => {
    const groups = new Map<
      MetroRegion,
      { region: MetroRegion; spots: RestaurantSpot[]; lat: number; lng: number }
    >();
    for (const spot of spots) {
      const existing = groups.get(spot.region);
      if (existing) {
        existing.spots.push(spot);
      } else {
        groups.set(spot.region, {
          region: spot.region,
          spots: [spot],
          lat: 0,
          lng: 0,
        });
      }
    }
    const result: Array<{
      region: MetroRegion;
      spots: RestaurantSpot[];
      lat: number;
      lng: number;
    }> = [];
    for (const group of groups.values()) {
      const count = group.spots.length;
      const sumLat = group.spots.reduce((acc, s) => acc + s.coordinates.lat, 0);
      const sumLng = group.spots.reduce((acc, s) => acc + s.coordinates.lng, 0);
      result.push({
        ...group,
        lat: sumLat / count,
        lng: sumLng / count,
      });
    }
    return result;
  }, [spots]);

  const showClusters =
    zoomTier === 'us' && regionGroups.length > 1 && !selectedSpotId;

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
          duration: instant ? 0 : 750,
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
          ? { top: 140, bottom: 190, left: 36, right: 36 }
          : { top: 100, bottom: 130, left: 48, right: 48 },
        maxZoom: 13.0,
        duration: instant ? 0 : 800,
      });
    },
    []
  );

  // Initialize MapLibre GL map once with CSP worker URL for Positron vector tiles
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (typeof window !== 'undefined') {
      maplibregl.setWorkerUrl('/maplibre-gl-csp-worker.js');
    }

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

    const syncZoomTier = () => {
      const nextTier = getZoomTier(map.getZoom());
      setZoomTier((prev) => (prev === nextTier ? prev : nextTier));
    };

    map.on('zoom', syncZoomTier);

    map.on('load', () => {
      styleLoadedRef.current = true;
      syncZoomTier();
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

    // Initial framing (direct /spot/[id] deep link vs overview of all US pins)
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
          ? { top: 110, bottom: 175, left: 24, right: 24 }
          : { top: 80, bottom: 40, left: 40, right: 40 },
      });
      setZoomTier('street');
    } else if (initSpots.length > 0) {
      fitMapToSpots(initSpots, true);
      syncZoomTier();
    }

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            map.resize();
          })
        : null;
    resizeObserver?.observe(container);

    const spotMarkersMap = spotMarkersRef.current;
    const clusterMarkersMap = clusterMarkersRef.current;

    return () => {
      resizeObserver?.disconnect();
      map.off('zoom', syncZoomTier);
      for (const record of spotMarkersMap.values()) {
        record.cleanup();
        record.marker.remove();
      }
      spotMarkersMap.clear();
      for (const record of clusterMarkersMap.values()) {
        record.cleanup();
        record.marker.remove();
      }
      clusterMarkersMap.clear();
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, [fitMapToSpots]);

  // Manage City Cluster Pills when at US zoom across multiple regions
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const clusterMap = clusterMarkersRef.current;
    const spotMap = spotMarkersRef.current;

    if (!showClusters) {
      for (const record of clusterMap.values()) {
        record.cleanup();
        record.marker.remove();
      }
      clusterMap.clear();
      return;
    }

    // Clear individual spot markers while showing US clusters
    for (const record of spotMap.values()) {
      record.cleanup();
      record.marker.remove();
    }
    spotMap.clear();

    // Rebuild cluster pills cleanly
    for (const record of clusterMap.values()) {
      record.cleanup();
      record.marker.remove();
    }
    clusterMap.clear();

    for (const group of regionGroups) {
      const root = document.createElement('div');
      root.className = 'relative flex items-center justify-center';

      const button = document.createElement('button');
      button.type = 'button';
      button.className =
        'group inline-flex items-center gap-2 rounded-full border-2 border-[#FFFDF9] bg-[#1C1917]/92 py-1.5 pr-1.5 pl-3 text-[#FFFDF9] shadow-[0_12px_28px_-6px_rgba(28,25,23,0.45)] backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-[#D9381E] cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]';
      button.setAttribute(
        'aria-label',
        `${group.region}: ${group.spots.length} favorite restaurants. Click to zoom in.`
      );

      const labelSpan = document.createElement('span');
      labelSpan.className =
        'font-serif text-[13px] font-semibold leading-none tracking-[-0.01em] whitespace-nowrap';
      labelSpan.textContent =
        CLUSTER_SHORT_LABELS[group.region] ?? group.region;
      button.appendChild(labelSpan);

      const countSpan = document.createElement('span');
      countSpan.className =
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D9381E] px-1.5 font-mono text-[10.5px] font-bold leading-none text-[#FFFDF9] group-hover:bg-[#FFFDF9] group-hover:text-[#D9381E] transition-colors';
      countSpan.textContent = String(group.spots.length);
      button.appendChild(countSpan);

      root.appendChild(button);

      const handleClick = (event: MouseEvent) => {
        event.stopPropagation();
        if (onSelectRegionRef.current) {
          onSelectRegionRef.current(group.region);
        } else {
          fitMapToSpots(group.spots, false);
        }
      };

      button.addEventListener('click', handleClick);

      const marker = new maplibregl.Marker({
        element: root,
        anchor: 'center',
      })
        .setLngLat([group.lng, group.lat])
        .addTo(map);
      marker.getElement().style.zIndex = '18';

      clusterMap.set(group.region, {
        marker,
        cleanup: () => {
          button.removeEventListener('click', handleClick);
        },
      });
    }
  }, [showClusters, regionGroups, fitMapToSpots]);

  // Manage Individual Spot Score / Labeled Pins when zoomed into metro or street
  useEffect(() => {
    const map = mapRef.current;
    if (!map || showClusters) return;

    const markersMap = spotMarkersRef.current;
    const nextIds = new Set(spots.map((spot) => spot.id));

    for (const [id, record] of markersMap.entries()) {
      if (!nextIds.has(id)) {
        record.cleanup();
        record.marker.remove();
        markersMap.delete(id);
      }
    }

    const showStreetLabel = zoomTier === 'street';

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
        `${spot.name} in ${
          spot.state ? `${spot.city}, ${spot.state}` : spot.city
        }, rated ${spot.rating.toFixed(1)} out of 10`
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

      const nameLabel = document.createElement('span');
      nameLabel.textContent = `· ${truncatePinName(spot.name)}`;
      button.appendChild(nameLabel);

      const savedDot = document.createElement('span');
      savedDot.setAttribute('aria-hidden', 'true');
      savedDot.textContent = '♥';
      button.appendChild(savedDot);

      let dishDot: HTMLSpanElement | null = null;
      if (spot.relatedDishId) {
        dishDot = document.createElement('span');
        dishDot.setAttribute('aria-hidden', 'true');
        dishDot.setAttribute('title', 'Has 3D Recipe');
        button.appendChild(dishDot);
      }

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

      const record: SpotMarkerRecord = {
        marker,
        root,
        button,
        pulse,
        tooltip,
        star,
        nameLabel,
        savedDot,
        dishDot,
        spot,
        cleanup: () => {
          button.removeEventListener('click', handleClick);
          button.removeEventListener('mouseenter', handleEnter);
          button.removeEventListener('mouseleave', handleLeave);
          button.removeEventListener('focus', handleEnter);
          button.removeEventListener('blur', handleLeave);
        },
      };

      applySpotMarkerState(
        record,
        spot.id === selectedSpotId,
        spot.id === hoveredSpotId,
        Boolean(savedIds?.has(spot.id)),
        showStreetLabel
      );
      markersMap.set(spot.id, record);
    }
  }, [spots, showClusters, zoomTier, selectedSpotId, hoveredSpotId, savedIds]);

  // Update visual styling of existing spot pins smoothly on hover/selection/saved/zoomTier changes
  useEffect(() => {
    if (showClusters) return;
    const showStreetLabel = zoomTier === 'street';
    for (const [id, record] of spotMarkersRef.current.entries()) {
      applySpotMarkerState(
        record,
        id === selectedSpotId,
        id === hoveredSpotId,
        Boolean(savedIds?.has(id)),
        showStreetLabel
      );
    }
  }, [spots, showClusters, zoomTier, selectedSpotId, hoveredSpotId, savedIds]);

  // Pulsing non-interactive "You are here" User Location Dot
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (!userLocation) return;

    const el = document.createElement('div');
    el.className =
      'pointer-events-none relative flex h-6 w-6 items-center justify-center';
    el.setAttribute('aria-hidden', 'true');

    const ring = document.createElement('span');
    ring.className =
      'absolute inset-0 rounded-full bg-[#2563EB]/30 animate-ping';
    el.appendChild(ring);

    const halo = document.createElement('span');
    halo.className =
      'absolute inset-0.5 rounded-full bg-[#2563EB]/20';
    el.appendChild(halo);

    const dot = document.createElement('span');
    dot.className =
      'relative h-3 w-3 rounded-full border-2 border-white bg-[#2563EB] shadow-[0_2px_8px_rgba(37,99,235,0.65)]';
    el.appendChild(dot);

    const marker = new maplibregl.Marker({
      element: el,
      anchor: 'center',
    })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map);
    marker.getElement().style.zIndex = '22';
    marker.getElement().style.pointerEvents = 'none';

    userMarkerRef.current = marker;
  }, [userLocation]);

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

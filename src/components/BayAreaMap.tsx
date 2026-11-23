'use client';

import { useMemo } from 'react';
import type { RestaurantSpot } from '@/types/restaurant';

export interface BayAreaMapProps {
  spots: RestaurantSpot[];
  selectedSpotId: string | null;
  hoveredSpotId: string | null;
  onSelectSpot: (spot: RestaurantSpot) => void;
  onHoverSpot: (id: string | null) => void;
}

const VIEW_W = 800;
const VIEW_H = 540;

// Bounding box covering San Francisco through Peninsula and South Bay
const MIN_LNG = -122.52;
const MAX_LNG = -121.84;
const MIN_LAT = 37.24;
const MAX_LAT = 37.86;

function projectCoord(lat: number, lng: number): { x: number; y: number } {
  const x = 68 + ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * (VIEW_W - 136);
  const y = 44 + ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * (VIEW_H - 88);
  return { x, y };
}

interface PositionedPin {
  spot: RestaurantSpot;
  anchorX: number;
  anchorY: number;
  x: number;
  y: number;
  displaced: boolean;
}

const CITY_LABELS: ReadonlyArray<{
  label: string;
  lat: number;
  lng: number;
  dx?: number;
  dy?: number;
}> = [
  { label: 'SAN FRANCISCO', lat: 37.768, lng: -122.445 },
  { label: 'PALO ALTO', lat: 37.452, lng: -122.175 },
  { label: 'LOS ALTOS', lat: 37.368, lng: -122.148 },
  { label: 'MOUNTAIN VIEW', lat: 37.416, lng: -122.078 },
  { label: 'SUNNYVALE', lat: 37.398, lng: -122.012 },
  { label: 'CUPERTINO', lat: 37.295, lng: -122.055 },
  { label: 'SANTA CLARA', lat: 37.342, lng: -121.918 },
];

export function BayAreaMap({
  spots,
  selectedSpotId,
  hoveredSpotId,
  onSelectSpot,
  onHoverSpot,
}: BayAreaMapProps) {
  // Deterministic gentle collision relaxation so closely spaced Cupertino / SF spots never overlap
  const pins = useMemo<PositionedPin[]>(() => {
    const nodes = spots.map((spot) => {
      const p = projectCoord(spot.coordinates.lat, spot.coordinates.lng);
      return {
        spot,
        anchorX: p.x,
        anchorY: p.y,
        x: p.x,
        y: p.y,
      };
    });

    const minDist = 36;
    const iterations = 32;

    for (let iter = 0; iter < iterations; iter += 1) {
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.hypot(dx, dy);

          if (dist < 0.001) {
            const angle = ((i + j) * 2.399963) % (Math.PI * 2);
            dx = Math.cos(angle);
            dy = Math.sin(angle);
            dist = 1;
          }

          if (dist < minDist) {
            const overlap = (minDist - dist) * 0.52;
            const ux = dx / dist;
            const uy = dy / dist;
            a.x -= ux * overlap;
            a.y -= uy * overlap;
            b.x += ux * overlap;
            b.y += uy * overlap;
          }
        }
      }

      // Soft spring back toward geographic anchor + clamp inside safe SVG bounds
      for (const node of nodes) {
        node.x += (node.anchorX - node.x) * 0.04;
        node.y += (node.anchorY - node.y) * 0.04;
        node.x = Math.max(44, Math.min(VIEW_W - 44, node.x));
        node.y = Math.max(42, Math.min(VIEW_H - 42, node.y));
      }
    }

    return nodes.map((node) => ({
      ...node,
      displaced: Math.hypot(node.x - node.anchorX, node.y - node.anchorY) > 10,
    }));
  }, [spots]);

  const activePinId = hoveredSpotId ?? selectedSpotId;
  const activePin = useMemo(
    () => pins.find((pin) => pin.spot.id === activePinId) ?? null,
    [pins, activePinId]
  );

  // Render hovered/selected pin last so it stays crisply on top in SVG paint order
  const orderedPins = useMemo(() => {
    return [...pins].sort((a, b) => {
      const aScore =
        a.spot.id === activePinId ? 2 : a.spot.tier === 'essential' ? 1 : 0;
      const bScore =
        b.spot.id === activePinId ? 2 : b.spot.tier === 'essential' ? 1 : 0;
      return aScore - bScore;
    });
  }, [pins, activePinId]);

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-[#E6DDD0] bg-[#EFE9DD] shadow-[0_14px_38px_-22px_rgba(28,25,23,0.18)]">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label="Interactive Bay Area map of Stanley's favorite restaurants"
        className="block h-auto w-full select-none"
      >
        <defs>
          <linearGradient id="bayWaterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D7E2DE" />
            <stop offset="55%" stopColor="#DEE7E3" />
            <stop offset="100%" stopColor="#D3DFDB" />
          </linearGradient>
          <linearGradient id="landGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FAF7F0" />
            <stop offset="100%" stopColor="#F2EBDF" />
          </linearGradient>
          <filter id="pinShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow
              dx="0"
              dy="3"
              stdDeviation="3"
              floodColor="#1C1917"
              floodOpacity="0.18"
            />
          </filter>
        </defs>

        {/* Warm Editorial Land Backdrop */}
        <rect width={VIEW_W} height={VIEW_H} fill="url(#landGrad)" />

        {/* Subtle Topographic Grid Lines */}
        <g stroke="#E6DDD0" strokeWidth="0.75" strokeOpacity="0.55">
          {[120, 240, 360, 480, 600, 720].map((gx) => (
            <line key={`gx-${gx}`} x1={gx} y1="0" x2={gx} y2={VIEW_H} />
          ))}
          {[108, 216, 324, 432].map((gy) => (
            <line key={`gy-${gy}`} x1="0" y1={gy} x2={VIEW_W} y2={gy} />
          ))}
        </g>

        {/* Pacific Ocean Coastline (West Edge) */}
        <path
          d="M 0,0 L 146,0 C 142,48 134,88 152,135 C 166,174 176,225 186,276 C 198,334 218,402 252,540 L 0,540 Z"
          fill="url(#bayWaterGrad)"
          fillOpacity="0.78"
        />

        {/* San Francisco Bay Water Body */}
        <path
          d="M 224,0 L 420,0 C 440,56 474,116 516,176 C 562,240 622,298 676,348 C 696,368 692,390 662,394 C 620,400 572,374 522,340 C 470,304 422,256 376,204 C 334,156 286,120 248,98 C 224,84 218,48 224,0 Z"
          fill="url(#bayWaterGrad)"
          stroke="#C2D1CB"
          strokeWidth="1.5"
        />

        {/* Golden Gate Channel Accent */}
        <path
          d="M 142,68 C 176,66 206,72 238,84"
          fill="none"
          stroke="#C2D1CB"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.55"
        />

        {/* Subtle Bay Label */}
        <text
          x="456"
          y="214"
          transform="rotate(34 456 214)"
          fill="#8BA29B"
          fontSize="11"
          letterSpacing="4.2"
          fontWeight="600"
          className="font-mono"
        >
          SAN FRANCISCO BAY
        </text>

        {/* Whisper Highway Spines: US-101 & I-280 */}
        <g fill="none" strokeLinecap="round">
          {/* US-101 Bayshore Corridor */}
          <path
            d="M 188,82 C 236,144 316,220 426,304 C 504,364 590,418 714,474"
            stroke="#DED3C2"
            strokeWidth="2.4"
            strokeDasharray="6 6"
          />
          {/* I-280 Foothill Corridor */}
          <path
            d="M 176,104 C 216,192 280,294 378,374 C 446,430 538,468 648,494"
            stroke="#E3D9C9"
            strokeWidth="2"
            strokeDasharray="4 6"
          />
        </g>

        {/* Highway Shield Micro-Pills */}
        <g className="font-mono" fontSize="9.5" fontWeight="600">
          <rect
            x="332"
            y="224"
            width="28"
            height="16"
            rx="8"
            fill="#FFFDF9"
            stroke="#DFD5C5"
          />
          <text x="346" y="235" textAnchor="middle" fill="#8A7E71">
            101
          </text>

          <rect
            x="278"
            y="296"
            width="28"
            height="16"
            rx="8"
            fill="#FFFDF9"
            stroke="#DFD5C5"
          />
          <text x="292" y="307" textAnchor="middle" fill="#8A7E71">
            280
          </text>
        </g>

        {/* Editorial City Typography Labels */}
        <g className="font-mono" fontSize="9.5" fontWeight="600" letterSpacing="1.6">
          {CITY_LABELS.map((city) => {
            const p = projectCoord(city.lat, city.lng);
            return (
              <text
                key={city.label}
                x={p.x + (city.dx ?? 0)}
                y={p.y + (city.dy ?? 0)}
                textAnchor="middle"
                fill="#8C8073"
                opacity="0.88"
              >
                {city.label}
              </text>
            );
          })}
        </g>

        {/* Subtle Leader Lines for Gently Separated Clustered Pins */}
        <g stroke="#C7B9A5" strokeWidth="1" strokeDasharray="2 2" opacity="0.7">
          {orderedPins.map((pin) =>
            pin.displaced ? (
              <line
                key={`leader-${pin.spot.id}`}
                x1={pin.anchorX}
                y1={pin.anchorY}
                x2={pin.x}
                y2={pin.y}
              />
            ) : null
          )}
        </g>

        {/* Interactive Restaurant Pins */}
        {orderedPins.map((pin) => {
          const isActive = pin.spot.id === activePinId;
          const isEssential = pin.spot.tier === 'essential';
          const radius = isActive ? 17 : isEssential ? 15 : 13.5;

          return (
            <g
              key={pin.spot.id}
              transform={`translate(${pin.x}, ${pin.y})`}
              role="button"
              tabIndex={0}
              aria-label={`${pin.spot.name} in ${pin.spot.city}, rated ${pin.spot.rating.toFixed(1)} out of 10`}
              onClick={() => onSelectSpot(pin.spot)}
              onMouseEnter={() => onHoverSpot(pin.spot.id)}
              onMouseLeave={() => onHoverSpot(null)}
              onFocus={() => onHoverSpot(pin.spot.id)}
              onBlur={() => onHoverSpot(null)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectSpot(pin.spot);
                }
              }}
              className="cursor-pointer outline-none"
            >
              {/* Pulse / Essential Halo */}
              {(isEssential || isActive) && (
                <circle
                  r={radius + (isActive ? 7 : 4.5)}
                  fill="#D9381E"
                  fillOpacity={isActive ? 0.2 : 0.1}
                />
              )}

              {/* Tactile Pin Disc */}
              <circle
                r={radius}
                fill={isActive ? '#D9381E' : isEssential ? '#1C1917' : '#FFFDF9'}
                stroke={isActive ? '#FFFDF9' : isEssential ? '#FFFDF9' : '#D9381E'}
                strokeWidth={isActive ? 2.5 : 2}
                filter="url(#pinShadow)"
              />

              {/* Score Label */}
              <text
                y="3.5"
                textAnchor="middle"
                fontSize={isActive ? '10.5' : '9.5'}
                fontWeight="700"
                fill={isActive || isEssential ? '#FFFDF9' : '#1C1917'}
                className="font-mono"
              >
                {pin.spot.rating.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Minimal Cartouche Legend */}
        <g transform="translate(20, 476)">
          <rect
            width="210"
            height="44"
            rx="14"
            fill="#FFFDF9"
            fillOpacity="0.92"
            stroke="#E6DDD0"
          />
          <circle cx="20" cy="22" r="6" fill="#1C1917" />
          <text x="32" y="25.5" fontSize="10" fill="#575049" className="font-mono">
            Essential
          </text>
          <circle
            cx="112"
            cy="22"
            r="6"
            fill="#FFFDF9"
            stroke="#D9381E"
            strokeWidth="2"
          />
          <text x="124" y="25.5" fontSize="10" fill="#575049" className="font-mono">
            Go-To / Drive
          </text>
        </g>
      </svg>

      {/* Crisp Floating Warm-Paper Tooltip */}
      {activePin && (
        <div
          className="pointer-events-none absolute top-3 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-[#E6DDD0] bg-[#FFFDF9]/96 px-4 py-2.5 shadow-[0_14px_34px_-12px_rgba(28,25,23,0.22)] backdrop-blur-md sm:max-w-[300px]"
          role="status"
        >
          <div className="min-w-0">
            <p className="truncate font-serif text-[15px] font-semibold text-[#1C1917]">
              {activePin.spot.name}
            </p>
            <p className="truncate text-[11.5px] text-[#6B6258]">
              {activePin.spot.city}
              {activePin.spot.neighborhood ? ` · ${activePin.spot.neighborhood}` : ''} ·{' '}
              {activePin.spot.cuisine}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#D9381E] px-2.5 py-0.5 font-mono text-xs font-bold text-[#FFFDF9]">
            {activePin.spot.rating.toFixed(1)}
          </span>
        </div>
      )}
    </div>
  );
}

export default BayAreaMap;

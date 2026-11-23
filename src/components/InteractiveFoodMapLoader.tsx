'use client';

import dynamic from 'next/dynamic';
import { Compass } from 'lucide-react';
import type { InteractiveFoodMapProps } from './InteractiveFoodMap';

export type { InteractiveFoodMapProps };

function MapLoadingSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Stanley's Bay Area map"
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#FAF7F2]"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 75% 65% at 50% 48%, #FFFDF9 0%, #FAF7F2 56%, #EFE8DC 100%)',
      }}
    >
      <div className="flex flex-col items-center gap-3.5 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#E6DDD0] bg-[#FFFDF9] text-[#D9381E] shadow-[0_8px_24px_-10px_rgba(28,25,23,0.16)] animate-pulse">
          <Compass className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="font-serif text-base font-medium tracking-[-0.01em] text-[#1C1917]">
            Opening Stanley&apos;s Bay Area atlas&hellip;
          </p>
          <p className="font-mono text-[11px] text-[#786E63]">
            Loading interactive food map
          </p>
        </div>
      </div>
    </div>
  );
}

const DynamicInteractiveFoodMap = dynamic<InteractiveFoodMapProps>(
  () => import('./InteractiveFoodMap'),
  {
    ssr: false,
    loading: () => <MapLoadingSkeleton />,
  }
);

export function InteractiveFoodMapLoader(props: InteractiveFoodMapProps) {
  return <DynamicInteractiveFoodMap {...props} />;
}

export default InteractiveFoodMapLoader;

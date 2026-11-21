'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { SceneStageProps } from './SceneStage';

export type { SceneStageProps };

function StageLoadingSkeleton() {
  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#FAF7F2]"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 75% 65% at 50% 48%, #FFFDF9 0%, #FAF7F2 56%, #EFE8DC 100%)',
      }}
      role="status"
      aria-live="polite"
      aria-label="Loading 3D dish stage"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Tactile pulsing ceramic bowl silhouette with gentle steam curves */}
        <div className="relative flex h-28 w-28 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[#EFE8DC]/75 blur-xl animate-pulse" />
          <svg
            viewBox="0 0 120 120"
            className="relative h-24 w-24 text-[#D9381E]"
            fill="none"
            aria-hidden="true"
          >
            {/* Gentle rising steam wisps */}
            <path
              d="M44 42 C41 34, 47 28, 44 20"
              stroke="#C9B9A6"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="animate-pulse"
            />
            <path
              d="M60 38 C57 29, 63 23, 60 14"
              stroke="#D9381E"
              strokeOpacity="0.55"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="animate-pulse"
            />
            <path
              d="M76 42 C73 34, 79 28, 76 20"
              stroke="#C9B9A6"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="animate-pulse"
            />

            {/* Bowl rim & sculptural ceramic silhouette */}
            <ellipse
              cx="60"
              cy="58"
              rx="38"
              ry="10"
              fill="#FFFDF9"
              stroke="#D8CCC0"
              strokeWidth="2"
            />
            <path
              d="M22 58 C22 83, 38 96, 60 96 C82 96, 98 83, 98 58"
              fill="#EFE8DC"
              stroke="#D8CCC0"
              strokeWidth="2"
            />
            <path
              d="M45 95 L48 102 C54 104, 66 104, 72 102 L75 95"
              fill="#E4D9C8"
            />
            {/* Soft shadow ellipse */}
            <ellipse cx="60" cy="108" rx="28" ry="4.5" fill="#4A3828" fillOpacity="0.1" />
          </svg>
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <p className="font-serif text-base font-medium tracking-[-0.01em] text-[#1C1917]">
            Plating your dish&hellip;
          </p>
          <p className="text-xs tracking-[0.02em] text-[#6B6258]">
            Warming up the 3D studio
          </p>
        </div>
      </div>
    </div>
  );
}

const DynamicSceneStage = dynamic<SceneStageProps>(() => import('./SceneStage'), {
  ssr: false,
  loading: () => <StageLoadingSkeleton />,
});

export function SceneStageLoader(props: SceneStageProps) {
  return <DynamicSceneStage {...props} />;
}

export default SceneStageLoader;

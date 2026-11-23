import { Suspense } from 'react';
import { RestaurantHomeApp } from '@/components/RestaurantHomeApp';

function HomeFallback() {
  return (
    <div className="min-h-screen w-full bg-[#FAF7F2] text-[#1C1917]">
      <div className="h-16 border-b border-[#E6DDD0] bg-[#FFFDF9]/90 px-6 flex items-center">
        <div className="font-serif text-[22px] font-semibold tracking-[-0.03em] text-[#1C1917]">
          stanley<span className="text-[#D9381E]">.eat</span>
        </div>
      </div>
      <div className="mx-auto max-w-6xl space-y-6 px-4 pt-10 sm:px-6 lg:px-8">
        <div className="h-10 w-72 animate-pulse rounded-xl bg-[#EFE8DC]" />
        <div className="h-5 w-96 max-w-full animate-pulse rounded-lg bg-[#EFE8DC]/80" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 pt-4">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="h-64 animate-pulse rounded-[24px] border border-[#E6DDD0] bg-[#FFFDF9]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <RestaurantHomeApp />
    </Suspense>
  );
}

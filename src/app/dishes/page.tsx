import { Suspense } from 'react';
import type { Metadata } from 'next';
import { StanleyEatApp } from '@/components/StanleyEatApp';

export const metadata: Metadata = {
  title: '3D Recipes — stanley.eat',
  description:
    'Explore Stanley Yang’s 7 favorite dishes as tactile, interactive 3D sculptures — orbit, explode layers, and cook straight from the recipe vault.',
  alternates: {
    canonical: '/dishes',
  },
  openGraph: {
    type: 'website',
    url: 'https://www.stanley.eat/dishes',
    siteName: 'stanley.eat',
    title: '3D Recipes — stanley.eat',
    description:
      'My 7 favorite dishes in interactive 3D — spin, inspect ingredients, explode layers, and cook.',
    images: [
      {
        url: 'https://www.stanley.eat/og-dishes.png',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'stanley.eat — My 7 Favorite Dishes in Interactive 3D',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@stanleycyang',
    creator: '@stanleycyang',
    title: '3D Recipes — stanley.eat',
    description:
      'My 7 favorite dishes in interactive 3D — spin, inspect ingredients, explode layers, and cook.',
    images: ['https://www.stanley.eat/og-dishes.png'],
  },
};

function DishesFallback() {
  return (
    <div className="min-h-screen w-full bg-[#FAF7F2] text-[#1C1917] lg:flex lg:h-screen lg:overflow-hidden">
      <div className="flex w-full flex-col justify-between p-6 lg:h-full lg:w-[55%]">
        <div className="font-serif text-[25px] font-semibold tracking-[-0.03em] text-[#1C1917]">
          stanley<span className="text-[#D9381E]">.eat</span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
          <div className="h-14 w-14 animate-pulse rounded-full border border-[#E6DDD0] bg-[#EFE8DC]" />
          <p className="font-serif text-sm italic text-[#6B6258]">
            Setting the table…
          </p>
        </div>
        <div className="mx-auto hidden h-12 w-96 animate-pulse rounded-full border border-[#E6DDD0] bg-[#FFFDF9]/80 lg:block" />
      </div>

      <div className="flex-1 border-t border-[#E6DDD0] bg-[#FFFDF9] p-8 lg:h-full lg:w-[45%] lg:border-t-0 lg:border-l">
        <div className="mx-auto max-w-[640px] space-y-5">
          <div className="h-6 w-28 animate-pulse rounded-full bg-[#EFE8DC]" />
          <div className="h-10 w-3/4 animate-pulse rounded-xl bg-[#EFE8DC]" />
          <div className="h-4 w-full animate-pulse rounded-lg bg-[#F5EFE5]" />
          <div className="h-20 w-full animate-pulse rounded-2xl bg-[#FAF7F2]" />
        </div>
      </div>
    </div>
  );
}

export default function DishesPage() {
  return (
    <Suspense fallback={<DishesFallback />}>
      <StanleyEatApp />
    </Suspense>
  );
}

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { RECIPES, getDishById } from '@/data/recipes';
import { StanleyEatApp } from '@/components/StanleyEatApp';

interface DishPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return RECIPES.map((dish) => ({ id: dish.id }));
}

export async function generateMetadata({
  params,
}: DishPageProps): Promise<Metadata> {
  const { id } = await params;
  const dish = getDishById(id);

  const title = `${dish.name} — stanley.eat`;
  const description = `${dish.subtitle}. Interactive 3D dish & cookable recipe from Stanley Yang's 7 favorite foods.`;
  const socialDescription = `${dish.subtitle} · Interactive 3D & Recipe`;
  const canonicalUrl = `https://www.stanley.eat/dish/${dish.id}`;
  const ogImageUrl = `https://www.stanley.eat/og/${dish.id}.png`;

  return {
    title,
    description,
    alternates: {
      canonical: `/dish/${dish.id}`,
    },
    openGraph: {
      type: 'article',
      url: canonicalUrl,
      siteName: 'stanley.eat',
      title,
      description: socialDescription,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: `${dish.name} — interactive 3D dish on stanley.eat`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@stanleycyang',
      creator: '@stanleycyang',
      title,
      description: socialDescription,
      images: [ogImageUrl],
    },
  };
}

function toIsoDuration(raw: string): string | undefined {
  const hrMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|hr)\b/i);
  const minMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|min)\b/i);

  let totalMinutes = 0;
  if (hrMatch) {
    totalMinutes += Math.round(Number.parseFloat(hrMatch[1]) * 60);
  }
  if (minMatch) {
    totalMinutes += Math.round(Number.parseFloat(minMatch[1]));
  }
  if (totalMinutes <= 0) return undefined;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `PT${hours > 0 ? `${hours}H` : ''}${minutes > 0 ? `${minutes}M` : ''}`;
}

function DishPageFallback() {
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

export default async function DishPage({ params }: DishPageProps) {
  const { id } = await params;
  const dish = getDishById(id);

  const prepIso = toIsoDuration(dish.prepTime);
  const cookIso = toIsoDuration(dish.cookTime);

  const recipeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: dish.name,
    description: dish.description,
    url: `https://www.stanley.eat/dish/${dish.id}`,
    image: [`https://www.stanley.eat/og/${dish.id}.png`],
    author: {
      '@type': 'Person',
      name: 'Stanley Yang',
      url: 'https://stanleycyang.com',
    },
    recipeCuisine: dish.cuisine,
    recipeYield: `${dish.baseServings} servings`,
    ...(prepIso ? { prepTime: prepIso } : {}),
    ...(cookIso ? { cookTime: cookIso } : {}),
    recipeIngredient: dish.ingredients.map((ing) =>
      [ing.amount !== null ? String(ing.amount) : '', ing.unit, ing.name]
        .filter(Boolean)
        .join(' ')
    ),
    recipeInstructions: dish.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      text: step,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(recipeJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <Suspense fallback={<DishPageFallback />}>
        <StanleyEatApp initialDishId={dish.id} />
      </Suspense>
    </>
  );
}

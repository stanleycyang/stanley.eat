import { Suspense } from 'react';
import type { Metadata } from 'next';
import { RESTAURANTS, getRestaurantById } from '@/data/restaurants';
import { RestaurantHomeApp } from '@/components/RestaurantHomeApp';

interface SpotPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return RESTAURANTS.map((spot) => ({ id: spot.id }));
}

export async function generateMetadata({
  params,
}: SpotPageProps): Promise<Metadata> {
  const { id } = await params;
  const spot = getRestaurantById(id) ?? RESTAURANTS[0];

  const title = `${spot.name} (${spot.city}) — stanley.eat`;
  const description = `${spot.rating.toFixed(1)}/10 · Order: ${spot.mustOrder
    .slice(0, 2)
    .join(', ')}. ${spot.stanleysNote}`;
  const canonicalUrl = `https://www.stanley.eat/spot/${spot.id}`;
  const ogImageUrl = `https://www.stanley.eat/og/spots/${spot.id}.png`;

  return {
    title,
    description,
    alternates: {
      canonical: `/spot/${spot.id}`,
    },
    openGraph: {
      type: 'article',
      url: canonicalUrl,
      siteName: 'stanley.eat',
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: `${spot.name} (${spot.city}) — Stanley's Eating Journey on stanley.eat`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@stanleycyang',
      creator: '@stanleycyang',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

function SpotPageFallback() {
  return (
    <div className="min-h-screen w-full bg-[#FAF7F2] text-[#1C1917]">
      <div className="h-16 border-b border-[#E6DDD0] bg-[#FFFDF9]/90 px-6 flex items-center">
        <div className="font-serif text-[22px] font-semibold tracking-[-0.03em] text-[#1C1917]">
          stanley<span className="text-[#D9381E]">.eat</span>
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="h-80 animate-pulse rounded-[28px] border border-[#E6DDD0] bg-[#FFFDF9]" />
      </div>
    </div>
  );
}

export default async function SpotPage({ params }: SpotPageProps) {
  const { id } = await params;
  const spot = getRestaurantById(id) ?? RESTAURANTS[0];

  const restaurantJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: spot.name,
    servesCuisine: spot.cuisine,
    priceRange: spot.price,
    url: `https://www.stanley.eat/spot/${spot.id}`,
    image: `https://www.stanley.eat/og/spots/${spot.id}.png`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: spot.city,
      addressRegion: 'CA',
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: spot.coordinates.lat,
      longitude: spot.coordinates.lng,
    },
    review: {
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: 'Stanley Yang',
        url: 'https://stanleycyang.com',
      },
      reviewBody: spot.stanleysNote,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: spot.rating,
        bestRating: 10,
        worstRating: 1,
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(restaurantJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <Suspense fallback={<SpotPageFallback />}>
        <RestaurantHomeApp initialSpotId={spot.id} />
      </Suspense>
    </>
  );
}

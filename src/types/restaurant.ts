import type { DishId } from './dish';

export type PriceTier = '$' | '$$' | '$$$' | '$$$$';
export type SpotTier = 'essential' | 'go-to' | 'worth-the-drive';
export type BayRegion = 'South Bay' | 'Peninsula' | 'San Francisco';

export interface RestaurantSpot {
  id: string;
  name: string;
  cuisine: string;
  city: string;
  region: BayRegion;
  neighborhood?: string;
  price: PriceTier;
  tier: SpotTier;
  rating: number;
  vibeTags: string[];
  mustOrder: string[];
  stanleysNote: string;
  proTip: string;
  lastVisited: string;
  visitedDateISO: string;
  visitCount: number;
  coordinates: { lat: number; lng: number };
  mapsQuery: string;
  relatedDishId?: DishId;
  accentColor: string;
}

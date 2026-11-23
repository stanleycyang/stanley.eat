import type { DishId } from './dish';

export type PriceTier = '$' | '$$' | '$$$' | '$$$$';
export type SpotTier = 'essential' | 'go-to' | 'worth-the-drive';
export type MetroRegion =
  | 'Bay Area'
  | 'Los Angeles'
  | 'Austin'
  | 'New York'
  | 'Seattle'
  | 'Chicago';
export type BayRegion = MetroRegion;

export interface RestaurantSpot {
  id: string;
  name: string;
  cuisine: string;
  city: string;
  state?: string;
  region: MetroRegion;
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

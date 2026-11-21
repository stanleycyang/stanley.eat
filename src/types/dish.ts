export type DishId =
  | 'curry'
  | 'pizza'
  | 'sushi'
  | 'pho'
  | 'hot-pot'
  | 'mapo-tofu'
  | 'xiaolongbao';

export interface DishIngredient {
  id: string;
  name: string;
  amount: number | null;
  unit: string;
  note?: string;
  partId?: string;
}

export interface DishPart {
  id: string;
  label: string;
  description: string;
  cameraFocus?: {
    target: [number, number, number];
    position: [number, number, number];
  };
}

export interface PantrySpec {
  item: string;
  brand: string;
  why: string;
}

export interface LocalSpot {
  name: string;
  area: string;
  note: string;
}

export type TableSurfaceType =
  | 'ceramic-linen'
  | 'wood-peel'
  | 'hinoki-cedar'
  | 'dark-slate'
  | 'woven-bamboo';

export interface DishAtmosphere {
  surface: TableSurfaceType;
  backdropInner: string;
  backdropOuter: string;
  keyLightColor: string;
  keyLightIntensity: number;
  ambientTint: string;
}

export interface DishRecipe {
  id: DishId;
  name: string;
  subtitle: string;
  shortLabel: string;
  emoji: string;
  cuisine: string;
  prepTime: string;
  cookTime: string;
  baseServings: number;
  spiceLevel: 1 | 2 | 3 | 4 | 5;
  isHot: boolean;
  accentColor: string;
  description: string;
  vibeTag: string;
  fieldNote: string;
  pantrySpecs: PantrySpec[];
  localSpots: LocalSpot[];
  atmosphere: DishAtmosphere;
  parts: DishPart[];
  ingredients: DishIngredient[];
  steps: string[];
  stanleysTip: string;
}

export interface FoodModelProps {
  exploded: boolean;
  highlightedPart: string | null;
  onSelectPart: (partId: string | null) => void;
}

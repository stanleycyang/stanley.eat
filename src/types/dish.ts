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

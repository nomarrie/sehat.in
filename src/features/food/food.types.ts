export type MealType = "Sarapan" | "Makan siang" | "Camilan" | "Makan malam";

export type NutritionFacts = {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
};

export type Ingredient = {
  amount: string;
  name: string;
};

export type FoodRecommendation = {
  id: string;
  mealType: MealType;
  name: string;
  description: string;
  rationale: string;
  prepMinutes: number;
  servings: number;
  nutrition: NutritionFacts;
  ingredients: Ingredient[];
  cookingSteps: string[];
};

export type FoodRecommendationContext = {
  basedOnWeight: number;
  updatedLabel: string;
  generatedByAi: boolean;
};

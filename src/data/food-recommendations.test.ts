import { describe, expect, it } from "vitest";
import {
  foodRecommendationContext,
  foodRecommendations,
  getFoodRecommendationById,
} from "./food-recommendations";

describe("dummy food recommendations", () => {
  it("provides a complete daily recommendation in meal order", () => {
    expect(foodRecommendations.map((recommendation) => recommendation.mealType)).toEqual([
      "Sarapan",
      "Makan siang",
      "Camilan",
      "Makan malam",
    ]);
    expect(foodRecommendations).toHaveLength(4);
  });

  it("keeps every recommendation nutritionally complete and cookable", () => {
    for (const recommendation of foodRecommendations) {
      expect(recommendation.nutrition.calories).toBeGreaterThan(0);
      expect(recommendation.nutrition.proteinGrams).toBeGreaterThan(0);
      expect(recommendation.nutrition.carbsGrams).toBeGreaterThan(0);
      expect(recommendation.nutrition.fatGrams).toBeGreaterThan(0);
      expect(recommendation.nutrition.fiberGrams).toBeGreaterThan(0);
      expect(recommendation.ingredients.length).toBeGreaterThanOrEqual(3);
      expect(recommendation.cookingSteps.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("looks up recommendations by their stable dummy-data ID", () => {
    expect(getFoodRecommendationById("oat-pisang-kayu-manis")?.name).toBe(
      "Oat Pisang Kayu Manis",
    );
    expect(getFoodRecommendationById("tidak-ada")).toBeUndefined();
  });

  it("ties the recommendation context to the current dummy weight", () => {
    expect(foodRecommendationContext.basedOnWeight).toBe(88.7);
    expect(foodRecommendationContext.generatedByAi).toBe(false);
  });
});

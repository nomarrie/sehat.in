import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  foodRecommendationContext,
  foodRecommendations,
} from "@/data/food-recommendations";
import { FoodRecommendationsOverview } from "./food-recommendations-overview";

describe("FoodRecommendationsOverview", () => {
  it("shows the recommendation context and every meal in order", () => {
    render(
      <FoodRecommendationsOverview
        context={foodRecommendationContext}
        recommendations={foodRecommendations}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Makan enak, tetap terarah" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/88,7 kg/i)).toBeInTheDocument();

    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("Sarapan")).toBeInTheDocument();
    expect(within(items[3]).getByText("Makan malam")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /lihat resep oat pisang kayu manis/i }),
    ).toHaveAttribute("href", "/food/oat-pisang-kayu-manis");
  });

  it("shows a useful empty state when no recommendations are available", () => {
    render(
      <FoodRecommendationsOverview
        context={foodRecommendationContext}
        recommendations={[]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Belum ada rekomendasi makanan" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /kembali ke dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});

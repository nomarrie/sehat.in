import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getFoodRecommendationById } from "@/data/food-recommendations";
import { FoodRecommendationDetail } from "./food-recommendation-detail";

describe("FoodRecommendationDetail", () => {
  it("shows nutrition, ingredients, and cooking steps", () => {
    const recommendation = getFoodRecommendationById("oat-pisang-kayu-manis");
    if (!recommendation) throw new Error("Food fixture is required for this test");

    render(<FoodRecommendationDetail recommendation={recommendation} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Oat Pisang Kayu Manis" }),
    ).toBeInTheDocument();

    const nutrition = screen.getByLabelText("Informasi gizi per porsi");
    expect(within(nutrition).getByText("390 kkal")).toBeInTheDocument();
    expect(within(nutrition).getByText("18 g")).toBeInTheDocument();

    const ingredients = screen.getByRole("list", { name: "Daftar bahan" });
    expect(within(ingredients).getByText("50 g")).toBeInTheDocument();
    expect(within(ingredients).getByText("oat utuh")).toBeInTheDocument();

    const steps = screen.getByRole("list", { name: "Langkah memasak" });
    expect(within(steps).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText(/bukan pengganti saran tenaga profesional/i)).toBeInTheDocument();
  });
});

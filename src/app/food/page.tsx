import type { Metadata } from "next";
import { AppShell } from "@/components/navigation/app-shell";
import { FoodRecommendationsOverview } from "@/features/food/food-recommendations-overview";
import { loadFoodRecommendations } from "@/lib/sehatin/queries";

export const metadata: Metadata = {
  title: "Rekomendasi makanan",
  description: "Rekomendasi makanan harian dengan informasi gizi dan cara memasak.",
};

export default async function FoodPage() {
  const { context, recommendations } = await loadFoodRecommendations();
  return (
    <AppShell activePath="/food">
      <FoodRecommendationsOverview
        context={context}
        recommendations={recommendations}
      />
    </AppShell>
  );
}

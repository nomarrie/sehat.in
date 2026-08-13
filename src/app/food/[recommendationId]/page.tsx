import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/navigation/app-shell";
import { FoodRecommendationDetail } from "@/features/food/food-recommendation-detail";
import { loadFoodRecommendation } from "@/lib/sehatin/queries";

type FoodDetailPageProps = {
  params: Promise<{ recommendationId: string }>;
};

export async function generateMetadata({
  params,
}: FoodDetailPageProps): Promise<Metadata> {
  const { recommendationId } = await params;
  const recommendation = await loadFoodRecommendation(recommendationId);

  if (!recommendation) {
    return { title: "Makanan tidak ditemukan" };
  }

  return {
    title: recommendation.name,
    description: `${recommendation.description} Lihat gizi dan cara memasaknya.`,
  };
}

export default async function FoodDetailPage({ params }: FoodDetailPageProps) {
  const { recommendationId } = await params;
  const recommendation = await loadFoodRecommendation(recommendationId);

  if (!recommendation) notFound();

  return (
    <AppShell activePath="/food">
      <FoodRecommendationDetail recommendation={recommendation} />
    </AppShell>
  );
}

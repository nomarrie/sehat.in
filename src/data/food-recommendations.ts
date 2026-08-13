import type {
  FoodRecommendation,
  FoodRecommendationContext,
} from "@/features/food/food.types";
import { dashboardData } from "./mock-data";

export const foodRecommendationContext: FoodRecommendationContext = {
  basedOnWeight: dashboardData.user.currentWeight,
  updatedLabel: "Diperbarui 11 Agustus 2026",
  generatedByAi: false,
};

export const foodRecommendations: FoodRecommendation[] = [
  {
    id: "oat-pisang-kayu-manis",
    mealType: "Sarapan",
    name: "Oat Pisang Kayu Manis",
    description: "Sarapan hangat dengan tekstur lembut dan rasa manis alami dari pisang.",
    rationale: "Serat dari oat dan pisang membantu membuat sarapan terasa lebih mengenyangkan.",
    prepMinutes: 12,
    servings: 1,
    nutrition: {
      calories: 390,
      proteinGrams: 18,
      carbsGrams: 61,
      fatGrams: 9,
      fiberGrams: 10,
    },
    ingredients: [
      { amount: "50 g", name: "oat utuh" },
      { amount: "200 ml", name: "susu rendah lemak" },
      { amount: "1 buah kecil", name: "pisang, iris" },
      { amount: "1 sdm", name: "selai kacang tanpa gula" },
      { amount: "1/4 sdt", name: "kayu manis bubuk" },
    ],
    cookingSteps: [
      "Masak oat dan susu dengan api kecil selama 5-7 menit sambil diaduk.",
      "Tuang ke mangkuk, lalu tambahkan pisang dan selai kacang.",
      "Taburkan kayu manis dan sajikan selagi hangat.",
    ],
  },
  {
    id: "nasi-merah-ayam-panggang",
    mealType: "Makan siang",
    name: "Nasi Merah Ayam Panggang",
    description: "Porsi makan siang seimbang dengan ayam berbumbu ringan dan sayuran segar.",
    rationale: "Protein ayam dipadukan dengan nasi merah dan sayuran untuk porsi utama yang lengkap.",
    prepMinutes: 30,
    servings: 1,
    nutrition: {
      calories: 560,
      proteinGrams: 42,
      carbsGrams: 64,
      fatGrams: 15,
      fiberGrams: 8,
    },
    ingredients: [
      { amount: "120 g", name: "dada ayam tanpa kulit" },
      { amount: "150 g", name: "nasi merah matang" },
      { amount: "1 mangkuk", name: "selada, timun, dan tomat" },
      { amount: "1 sdt", name: "minyak kanola" },
      { amount: "secukupnya", name: "bawang putih, lada, dan jeruk nipis" },
    ],
    cookingSteps: [
      "Lumuri ayam dengan bawang putih, lada, dan air jeruk nipis selama 10 menit.",
      "Panggang ayam di wajan dengan minyak hingga matang merata.",
      "Sajikan bersama nasi merah dan sayuran segar.",
    ],
  },
  {
    id: "yogurt-jambu-biji",
    mealType: "Camilan",
    name: "Yogurt Jambu Biji",
    description: "Camilan dingin, segar, dan praktis untuk jeda di antara makan utama.",
    rationale: "Porsi sederhana ini menggabungkan protein yogurt dengan serat dari buah.",
    prepMinutes: 5,
    servings: 1,
    nutrition: {
      calories: 220,
      proteinGrams: 13,
      carbsGrams: 32,
      fatGrams: 5,
      fiberGrams: 6,
    },
    ingredients: [
      { amount: "170 g", name: "yogurt tawar tinggi protein" },
      { amount: "100 g", name: "jambu biji merah, potong" },
      { amount: "1 sdm", name: "biji labu panggang" },
    ],
    cookingSteps: [
      "Masukkan yogurt ke mangkuk saji.",
      "Tambahkan potongan jambu biji dan taburkan biji labu.",
    ],
  },
  {
    id: "sup-tahu-sayur-kentang",
    mealType: "Makan malam",
    name: "Sup Tahu Sayur dan Kentang",
    description: "Makan malam berkuah dengan tahu, kentang, dan sayuran berwarna-warni.",
    rationale: "Kuah hangat dan beragam sayuran memberi porsi makan malam yang nyaman dan ringan.",
    prepMinutes: 25,
    servings: 1,
    nutrition: {
      calories: 460,
      proteinGrams: 27,
      carbsGrams: 55,
      fatGrams: 15,
      fiberGrams: 11,
    },
    ingredients: [
      { amount: "150 g", name: "tahu putih, potong dadu" },
      { amount: "120 g", name: "kentang, potong kecil" },
      { amount: "1 mangkuk", name: "wortel, buncis, dan kol" },
      { amount: "400 ml", name: "air atau kaldu rendah garam" },
      { amount: "secukupnya", name: "bawang putih, daun bawang, dan lada" },
    ],
    cookingSteps: [
      "Tumis bawang putih dengan sedikit air hingga harum.",
      "Masukkan kentang, wortel, dan kaldu, lalu masak hingga hampir empuk.",
      "Tambahkan tahu, buncis, dan kol. Masak 5 menit lagi.",
      "Beri lada dan daun bawang, lalu sajikan hangat.",
    ],
  },
];

export function getFoodRecommendationById(
  id: string,
): FoodRecommendation | undefined {
  return foodRecommendations.find((recommendation) => recommendation.id === id);
}

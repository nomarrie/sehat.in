import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { CookingPotIcon } from "@phosphor-icons/react/dist/ssr/CookingPot";
import { ForkKnifeIcon } from "@phosphor-icons/react/dist/ssr/ForkKnife";
import Link from "next/link";
import type { FoodRecommendation } from "./food.types";
import { NutritionFacts } from "./nutrition-facts";

export function FoodRecommendationDetail({
  recommendation,
}: {
  recommendation: FoodRecommendation;
}) {
  return (
    <article className="food-detail">
      <Link className="back-link" href="/food">
        <ArrowLeftIcon size={18} weight="regular" aria-hidden="true" />
        Semua rekomendasi
      </Link>

      <header className="food-detail-hero">
        <div className="food-detail-copy">
          <p className="module-kicker">{recommendation.mealType}</p>
          <h1>{recommendation.name}</h1>
          <p>{recommendation.description}</p>
          <div className="food-detail-meta" aria-label="Ringkasan resep">
            <span>
              <ClockIcon size={18} weight="regular" aria-hidden="true" />
              {recommendation.prepMinutes} menit
            </span>
            <span>
              <ForkKnifeIcon size={18} weight="regular" aria-hidden="true" />
              {recommendation.servings} porsi
            </span>
          </div>
        </div>

        <div className="food-rationale">
          <span aria-hidden="true">
            <CookingPotIcon size={28} weight="regular" />
          </span>
          <small>Mengapa dipilih</small>
          <p>{recommendation.rationale}</p>
        </div>
      </header>

      <section className="nutrition-section" aria-labelledby="nutrition-title">
        <div>
          <h2 id="nutrition-title">Gizi per porsi</h2>
          <p>Nilai gizi adalah perkiraan per porsi dari bahan yang tercantum.</p>
        </div>
        <NutritionFacts nutrition={recommendation.nutrition} />
      </section>

      <div className="recipe-grid">
        <section className="ingredients-section" aria-labelledby="ingredients-title">
          <h2 id="ingredients-title">Bahan yang disiapkan</h2>
          <ul aria-label="Daftar bahan">
            {recommendation.ingredients.map((ingredient) => (
              <li key={`${ingredient.amount}-${ingredient.name}`}>
                <strong>{ingredient.amount}</strong>
                <span>{ingredient.name}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="cooking-section" aria-labelledby="cooking-title">
          <h2 id="cooking-title">Cara memasak</h2>
          <ol aria-label="Langkah memasak">
            {recommendation.cookingSteps.map((step, index) => (
              <li key={step}>
                <span aria-hidden="true">{index + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <aside className="food-disclaimer" aria-label="Informasi kesehatan">
        <strong>Catatan penting</strong>
        <p>
          Rekomendasi ini bukan pengganti saran tenaga profesional. Sesuaikan bahan
          dengan alergi, kebutuhan, dan kondisi kesehatanmu.
        </p>
      </aside>
    </article>
  );
}

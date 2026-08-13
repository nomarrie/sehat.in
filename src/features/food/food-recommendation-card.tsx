import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import Link from "next/link";
import type { FoodRecommendation } from "./food.types";

export function FoodRecommendationCard({
  recommendation,
}: {
  recommendation: FoodRecommendation;
}) {
  return (
    <article className="food-card">
      <div className="food-card-heading">
        <div>
          <p className="meal-type">{recommendation.mealType}</p>
          <h2>{recommendation.name}</h2>
        </div>
        <span className="food-calories">
          <strong>{recommendation.nutrition.calories}</strong>
          <small>kkal</small>
        </span>
      </div>

      <p className="food-description">{recommendation.description}</p>

      <dl className="food-card-facts">
        <div>
          <dt>Protein</dt>
          <dd>{recommendation.nutrition.proteinGrams} g</dd>
        </div>
        <div>
          <dt>Serat</dt>
          <dd>{recommendation.nutrition.fiberGrams} g</dd>
        </div>
        <div>
          <dt>
            <ClockIcon size={16} weight="regular" aria-hidden="true" />
            Waktu
          </dt>
          <dd>{recommendation.prepMinutes} menit</dd>
        </div>
      </dl>

      <Link className="food-card-link" href={`/food/${recommendation.id}`}>
        Lihat resep {recommendation.name}
        <ArrowRightIcon size={18} weight="regular" aria-hidden="true" />
      </Link>
    </article>
  );
}

import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { BowlFoodIcon } from "@phosphor-icons/react/dist/ssr/BowlFood";
import { ScalesIcon } from "@phosphor-icons/react/dist/ssr/Scales";
import Link from "next/link";
import type {
  FoodRecommendation,
  FoodRecommendationContext,
} from "./food.types";
import { FoodRecommendationCard } from "./food-recommendation-card";

type FoodRecommendationsOverviewProps = {
  context: FoodRecommendationContext;
  recommendations: FoodRecommendation[];
};

const idNumberFormat = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function FoodRecommendationsOverview({
  context,
  recommendations,
}: FoodRecommendationsOverviewProps) {
  return (
    <div className="food-overview">
      <header className="food-hero">
        <div className="food-hero-copy">
          <p className="module-kicker">Rekomendasi hari ini</p>
          <h1>Makan enak, tetap terarah</h1>
          <p>
            Empat pilihan sederhana untuk menemani harimu, lengkap dengan gizi dan
            langkah memasak.
          </p>
        </div>

        <div className="food-context" aria-label="Dasar rekomendasi">
          <span className="food-context-icon" aria-hidden="true">
            <ScalesIcon size={26} weight="regular" />
          </span>
          <span>
            <small>Berdasarkan berat terbaru</small>
            <strong>{idNumberFormat.format(context.basedOnWeight)} kg</strong>
            <small>{context.updatedLabel}</small>
          </span>
        </div>
      </header>

      {recommendations.length > 0 ? (
        <section className="food-day-plan" aria-labelledby="food-day-plan-title">
          <div className="food-section-heading">
            <div>
              <h2 id="food-day-plan-title">Rencana makan satu hari</h2>
              <p>Pilih makanan untuk melihat bahan, cara memasak, dan gizi per porsi.</p>
            </div>
            <span>{recommendations.length} waktu makan</span>
          </div>

          <ol className="food-card-list">
            {recommendations.map((recommendation) => (
              <li key={recommendation.id}>
                <FoodRecommendationCard recommendation={recommendation} />
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <section className="food-empty-state">
          <span aria-hidden="true">
            <BowlFoodIcon size={34} weight="regular" />
          </span>
          <h2>Belum ada rekomendasi makanan</h2>
          <p>Data contoh untuk menu hari ini belum tersedia.</p>
          <Link className="button button-secondary" href="/dashboard">
            <ArrowLeftIcon size={18} weight="regular" aria-hidden="true" />
            Kembali ke dashboard
          </Link>
        </section>
      )}

      <aside className="food-sample-note" aria-label="Catatan rekomendasi">
        <strong>{context.generatedByAi ? "Rekomendasi adaptif dengan AI" : "Rencana terkurasi sementara"}</strong>
        <p>
          {context.generatedByAi
            ? "AI menyusun rencana ini dari progres terbarumu. Tetap sesuaikan bahan dengan alergi, kebutuhan, atau arahan tenaga profesional."
            : "Saat personalisasi AI belum dapat digunakan, Sehat.in memakai rencana terkurasi berdasarkan preferensi dan batas programmu."}
        </p>
      </aside>
    </div>
  );
}

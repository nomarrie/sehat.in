import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { BarbellIcon } from "@phosphor-icons/react/dist/ssr/Barbell";
import { OriginLink } from "@/components/ui/origin-button";

export function EmptyDashboard() {
  return (
    <section
      className="dashboard-module today-workout dashboard-empty-workout"
      aria-labelledby="empty-workout-title"
    >
      <div className="workout-topline">
        <span className="status-chip status-chip-empty">
          <span aria-hidden="true" /> Belum tersedia
        </span>
        <span>Hari ini</span>
      </div>

      <div className="today-workout-copy">
        <div className="module-icon inverse" aria-hidden="true">
          <BarbellIcon size={25} weight="regular" />
        </div>
        <p className="module-kicker">Latihan hari ini</p>
        <h2 id="empty-workout-title">Belum ada latihan hari ini</h2>
        <p>Kamu tetap bisa membuka paket contoh untuk melihat alur latihan.</p>
      </div>

      <OriginLink className="mt-auto w-full" href="/packages/latihan-hari-ini">
        Lihat paket contoh
        <ArrowRightIcon size={19} weight="regular" aria-hidden="true" />
      </OriginLink>
    </section>
  );
}

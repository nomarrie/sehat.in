import { BarbellIcon } from "@phosphor-icons/react/dist/ssr/Barbell";
import Link from "next/link";

export function EmptyDashboard() {
  return (
    <section className="dashboard-module empty-state">
      <BarbellIcon size={28} weight="regular" aria-hidden="true" />
      <h2>Belum ada latihan hari ini</h2>
      <p>Kamu tetap bisa membuka paket contoh untuk melihat alur latihan.</p>
      <Link className="button button-primary" href="/packages/latihan-hari-ini">
        Lihat paket contoh
      </Link>
    </section>
  );
}

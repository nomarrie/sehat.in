import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import Link from "next/link";
import { AppShell } from "@/components/navigation/app-shell";

export default function FoodNotFound() {
  return (
    <AppShell activePath="/food">
      <section className="route-state route-state-in-shell">
        <span className="route-state-code">Tidak tersedia</span>
        <h1>Makanan tidak ditemukan</h1>
        <p>Rekomendasi yang kamu buka tidak tersedia pada data contoh.</p>
        <Link className="button button-primary" href="/food">
          <ArrowLeftIcon size={18} weight="regular" aria-hidden="true" />
          Kembali ke rekomendasi
        </Link>
      </section>
    </AppShell>
  );
}

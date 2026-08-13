import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="route-state">
      <span className="route-state-code">404</span>
      <h1>Latihan tidak ditemukan</h1>
      <p>Paket yang kamu buka tidak tersedia pada data contoh.</p>
      <Link className="button button-primary" href="/dashboard">
        <ArrowLeftIcon size={18} weight="regular" aria-hidden="true" />
        Kembali ke dashboard
      </Link>
    </main>
  );
}

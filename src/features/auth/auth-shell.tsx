import { HeartbeatIcon } from "@phosphor-icons/react/dist/ssr/Heartbeat";
import Link from "next/link";

export function AuthShell({ title, description, children, alternate }: { title: string; description: string; children: React.ReactNode; alternate?: { label: string; href: string; action: string } }) {
  return (
    <main className="auth-layout">
      <section className="auth-panel" aria-labelledby="auth-title">
        <Link className="brand auth-brand" href="/" aria-label="Sehat.in">
          <span className="brand-mark" aria-hidden="true"><HeartbeatIcon size={22} weight="bold" /></span>
          <span>Sehat.in</span>
        </Link>
        <header className="auth-heading">
          <span className="eyebrow">Pendamping langkah sehatmu</span>
          <h1 id="auth-title">{title}</h1>
          <p>{description}</p>
        </header>
        {children}
        {alternate ? <p className="auth-alternate">{alternate.label} <Link href={alternate.href}>{alternate.action}</Link></p> : null}
      </section>
      <aside className="auth-companion" aria-label="Prinsip program Sehat.in">
        <p className="module-kicker">Ritme yang realistis</p>
        <h2>Program berubah bersama progresmu.</h2>
        <p>Latihan, target mingguan, dan menu disesuaikan secara bertahap—tanpa label kondisi medis atau tekanan dari angka timbangan.</p>
        <ul><li>Target aman 0,5–1 kg per minggu</li><li>Data setiap akun terisolasi</li><li>Fokus pada konsistensi dan pemulihan</li></ul>
      </aside>
    </main>
  );
}

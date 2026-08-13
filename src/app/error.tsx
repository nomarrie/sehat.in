"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => console.error(error), [error]);

  return (
    <main className="route-state">
      <span className="route-state-code">Coba lagi</span>
      <h1>Ada kendala menampilkan halaman</h1>
      <p>Coba muat ulang tampilan atau kembali ke dashboard.</p>
      <div className="route-state-actions">
        <button className="button button-primary" type="button" onClick={reset}>Coba lagi</button>
        <Link className="button button-secondary" href="/dashboard">Kembali ke dashboard</Link>
      </div>
    </main>
  );
}

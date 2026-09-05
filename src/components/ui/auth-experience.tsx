import { BarbellIcon } from "@phosphor-icons/react/dist/ssr/Barbell";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { ForkKnifeIcon } from "@phosphor-icons/react/dist/ssr/ForkKnife";
import { HeartbeatIcon } from "@phosphor-icons/react/dist/ssr/Heartbeat";
import { TrendDownIcon } from "@phosphor-icons/react/dist/ssr/TrendDown";
import Link from "next/link";
import type { ReactNode } from "react";

const companionItems = [
  { label: "Target mingguan", value: "0,5–1 kg", detail: "Rentang yang realistis", icon: TrendDownIcon },
  { label: "Latihan bertahap", value: "Sesuai ritmemu", detail: "Intensitas mengikuti progres", icon: BarbellIcon },
  { label: "Pilihan makanan", value: "Tetap fleksibel", detail: "Arahan yang mudah dijalani", icon: ForkKnifeIcon },
] as const;

type AuthExperienceProps = {
  titleId: string;
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
  alternate: {
    label: string;
    href: string;
    action: string;
  };
};

export function AuthExperience({
  titleId,
  title,
  description,
  children,
  alternate,
}: AuthExperienceProps) {
  return (
    <main className="sign-in-layout">
      <section className="sign-in-form-panel" aria-labelledby={titleId}>
        <div className="sign-in-form-wrap">
          <Link className="brand auth-brand sign-in-reveal sign-in-delay-1" href="/" aria-label="Sehat.in">
            <span className="brand-mark" aria-hidden="true"><HeartbeatIcon size={22} weight="bold" /></span>
            <span>Sehat.in</span>
          </Link>

          <header className="sign-in-heading">
            <p className="eyebrow sign-in-reveal sign-in-delay-2">Pendamping langkah sehatmu</p>
            <h1 id={titleId} className="sign-in-reveal sign-in-delay-3">{title}</h1>
            <p className="sign-in-reveal sign-in-delay-4">{description}</p>
          </header>

          {children}

          <p className="auth-alternate sign-in-reveal sign-in-delay-10">
            {alternate.label} <Link href={alternate.href}>{alternate.action}</Link>
          </p>
        </div>
      </section>

      <aside className="sign-in-companion" aria-label="Cara Sehat.in mendampingi programmu">
        <div className="sign-in-orbit sign-in-orbit-one" aria-hidden="true" />
        <div className="sign-in-orbit sign-in-orbit-two" aria-hidden="true" />

        <div className="sign-in-companion-copy sign-in-slide-in">
          <p className="module-kicker">Ritme yang realistis</p>
          <h2>Program berubah bersama progresmu.</h2>
          <p>Kembali ke rencana yang terasa mungkin dijalani—tanpa tekanan dari angka timbangan.</p>
        </div>

        <div className="sign-in-companion-list" role="list">
          {companionItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <article className={`sign-in-companion-card sign-in-slide-in sign-in-companion-delay-${index + 1}`} key={item.label} role="listitem">
                <span aria-hidden="true"><Icon size={20} weight="bold" /></span>
                <div><small>{item.label}</small><strong>{item.value}</strong><p>{item.detail}</p></div>
              </article>
            );
          })}
        </div>

        <p className="sign-in-privacy sign-in-slide-in sign-in-companion-delay-3">
          <CheckCircleIcon size={18} weight="fill" aria-hidden="true" /> Data programmu tetap privat di dalam akun.
        </p>
      </aside>
    </main>
  );
}

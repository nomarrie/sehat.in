"use client";

import { BarbellIcon } from "@phosphor-icons/react/dist/ssr/Barbell";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";
import { ForkKnifeIcon } from "@phosphor-icons/react/dist/ssr/ForkKnife";
import { GithubLogoIcon } from "@phosphor-icons/react/dist/ssr/GithubLogo";
import { GoogleLogoIcon } from "@phosphor-icons/react/dist/ssr/GoogleLogo";
import { HeartbeatIcon } from "@phosphor-icons/react/dist/ssr/Heartbeat";
import { TrendDownIcon } from "@phosphor-icons/react/dist/ssr/TrendDown";
import Link from "next/link";
import { useState, type ReactNode } from "react";

export type SignInState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

export type SignInPageProps = {
  title?: ReactNode;
  description?: ReactNode;
  notice?: string;
  state?: SignInState;
  pending: boolean;
  formAction: (formData: FormData) => void | Promise<void>;
  onGoogleSignIn: () => void;
  onGithubSignIn: () => void;
};

const companionItems = [
  { label: "Target mingguan", value: "0,5–1 kg", detail: "Rentang yang realistis", icon: TrendDownIcon },
  { label: "Latihan bertahap", value: "Sesuai ritmemu", detail: "Intensitas mengikuti progres", icon: BarbellIcon },
  { label: "Pilihan makanan", value: "Tetap fleksibel", detail: "Arahan yang mudah dijalani", icon: ForkKnifeIcon },
] as const;

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  return errors?.[0] ? <small className="field-error" id={id}>{errors[0]}</small> : null;
}

export function SignInPage({
  title = "Selamat datang kembali",
  description = "Masuk untuk melanjutkan program yang sudah menyesuaikan progresmu.",
  notice,
  state = {},
  pending,
  formAction,
  onGoogleSignIn,
  onGithubSignIn,
}: SignInPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const emailError = state.errors?.email;
  const passwordError = state.errors?.password;

  return (
    <main className="sign-in-layout">
      <section className="sign-in-form-panel" aria-labelledby="sign-in-title">
        <div className="sign-in-form-wrap">
          <Link className="brand auth-brand sign-in-reveal sign-in-delay-1" href="/" aria-label="Sehat.in">
            <span className="brand-mark" aria-hidden="true"><HeartbeatIcon size={22} weight="bold" /></span>
            <span>Sehat.in</span>
          </Link>

          <header className="sign-in-heading">
            <p className="eyebrow sign-in-reveal sign-in-delay-2">Pendamping langkah sehatmu</p>
            <h1 id="sign-in-title" className="sign-in-reveal sign-in-delay-3">{title}</h1>
            <p className="sign-in-reveal sign-in-delay-4">{description}</p>
          </header>

          {notice ? (
            <p className="auth-notice sign-in-reveal sign-in-delay-4" role="status" aria-label="Pemberitahuan akun">
              <CheckCircleIcon size={19} weight="fill" aria-hidden="true" />
              <span>{notice}</span>
            </p>
          ) : null}

          <form className="sign-in-form" action={formAction} noValidate>
            <div className="sign-in-field sign-in-reveal sign-in-delay-5">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                placeholder="nama@email.com"
                required
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? "login-email-error" : undefined}
              />
              <FieldError id="login-email-error" errors={emailError} />
            </div>

            <div className="sign-in-field sign-in-reveal sign-in-delay-6">
              <label htmlFor="current-password">Kata sandi</label>
              <div className="sign-in-password-wrap">
                <input
                  id="current-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi"
                  required
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? "login-password-error" : undefined}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeSlashIcon size={20} aria-hidden="true" /> : <EyeIcon size={20} aria-hidden="true" />}
                </button>
              </div>
              <FieldError id="login-password-error" errors={passwordError} />
            </div>

            <div className="sign-in-options sign-in-reveal sign-in-delay-7">
              <label><input type="checkbox" name="rememberMe" /><span>Ingat saya</span></label>
              <Link href="/reset-password">Lupa kata sandi?</Link>
            </div>

            <p className="auth-message" role="status" aria-label="Status masuk" aria-live="polite">{state.message}</p>

            <button className="button button-primary auth-submit sign-in-reveal sign-in-delay-8" type="submit" disabled={pending}>
              {pending ? "Memeriksa akun…" : "Masuk"}
            </button>
          </form>

          <div className="auth-divider sign-in-reveal sign-in-delay-9"><span>atau lanjutkan dengan</span></div>

          <div className="sign-in-oauth sign-in-reveal sign-in-delay-10">
            <button className="button button-secondary" type="button" onClick={onGoogleSignIn} disabled={pending}>
              <GoogleLogoIcon size={20} weight="bold" aria-hidden="true" /> Lanjutkan dengan Google
            </button>
            <button className="button button-secondary" type="button" onClick={onGithubSignIn} disabled={pending}>
              <GithubLogoIcon size={20} weight="fill" aria-hidden="true" /> Lanjutkan dengan GitHub
            </button>
          </div>

          <p className="auth-alternate sign-in-reveal sign-in-delay-10">
            Belum punya akun? <Link href="/register">Daftar sekarang</Link>
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

"use client";

import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";
import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AuthExperience } from "./auth-experience";

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
  onGoogleSignIn: (rememberMe: boolean) => void;
  onFacebookSignIn: (rememberMe: boolean) => void;
};

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
  onFacebookSignIn,
}: SignInPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const emailError = state.errors?.email;
  const passwordError = state.errors?.password;

  return (
    <AuthExperience
      titleId="sign-in-title"
      title={title}
      description={description}
      alternate={{ label: "Belum punya akun?", href: "/register", action: "Daftar sekarang" }}
    >
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
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
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
                  value={password}
                  onChange={(event) => setPassword(event.currentTarget.value)}
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
              <label>
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.currentTarget.checked)}
                />
                <span>Ingat saya</span>
              </label>
              <Link href="/reset-password">Lupa kata sandi?</Link>
            </div>

            {state.message ? (
              <p className="auth-message" role="alert" aria-label="Peringatan masuk">
                {state.message}
              </p>
            ) : null}

            <button className="button button-primary auth-submit sign-in-reveal sign-in-delay-8" type="submit" disabled={pending}>
              {pending ? "Memeriksa akun…" : "Masuk"}
            </button>
          </form>

          <div className="auth-divider sign-in-reveal sign-in-delay-9"><span>atau lanjutkan dengan</span></div>

          <div className="sign-in-oauth sign-in-reveal sign-in-delay-10">
            <button className="button button-secondary" type="button" onClick={() => onGoogleSignIn(rememberMe)} disabled={pending}>
              <Image
                src="/images/auth/google.svg"
                alt=""
                width={20}
                height={20}
                unoptimized
                aria-hidden="true"
              />
              Lanjutkan dengan Google
            </button>
            <button className="button button-secondary" type="button" onClick={() => onFacebookSignIn(rememberMe)} disabled={pending}>
              <Image
                src="/images/auth/facebook.svg"
                alt=""
                width={20}
                height={20}
                unoptimized
                aria-hidden="true"
              />
              Lanjutkan dengan Facebook
            </button>
          </div>
    </AuthExperience>
  );
}

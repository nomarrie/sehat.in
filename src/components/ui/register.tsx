"use client";

import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";
import { useState } from "react";
import { AuthExperience } from "./auth-experience";

export type RegisterState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
  verificationEmail?: string;
};

type RegisterPageProps = {
  state?: RegisterState;
  verificationState?: RegisterState;
  pending: boolean;
  verifying: boolean;
  formAction: (formData: FormData) => void | Promise<void>;
  verificationAction: (formData: FormData) => void | Promise<void>;
};

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  return errors?.[0] ? <small className="field-error" id={id}>{errors[0]}</small> : null;
}

export function RegisterPage({
  state = {},
  verificationState = {},
  pending,
  verifying,
  formAction,
  verificationAction,
}: RegisterPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const verificationEmail = verificationState.verificationEmail ?? state.verificationEmail;

  if (verificationEmail) {
    const otpError = verificationState.errors?.otp;
    return (
      <AuthExperience
        titleId="register-title"
        title="Periksa email kamu"
        description="Masukkan kode verifikasi untuk mengaktifkan akun dan melanjutkan ke pengaturan programmu."
        alternate={{ label: "Sudah terverifikasi?", href: "/login", action: "Masuk" }}
      >
        <div className="auth-notice sign-in-reveal sign-in-delay-5" role="status">
          <CheckCircleIcon size={19} weight="fill" aria-hidden="true" />
          <span>Kode dikirim ke {verificationEmail} dan berlaku selama beberapa menit.</span>
        </div>
        <form className="sign-in-form" action={verificationAction} noValidate>
          <input type="hidden" name="email" value={verificationEmail} />
          <div className="sign-in-field sign-in-reveal sign-in-delay-6">
            <label htmlFor="verification-code">Kode verifikasi</label>
            <input
              id="verification-code"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              required
              aria-invalid={Boolean(otpError)}
              aria-describedby={otpError ? "verification-code-error" : undefined}
            />
            <FieldError id="verification-code-error" errors={otpError} />
          </div>
          {verificationState.message ?? state.message ? (
            <p className="auth-message" role="alert" aria-label="Peringatan verifikasi">
              {verificationState.message ?? state.message}
            </p>
          ) : null}
          <button className="button button-primary auth-submit sign-in-reveal sign-in-delay-7" type="submit" disabled={verifying}>
            {verifying ? "Memverifikasi…" : "Verifikasi dan lanjutkan"}
          </button>
        </form>
      </AuthExperience>
    );
  }

  const nameError = state.errors?.name;
  const emailError = state.errors?.email;
  const passwordError = state.errors?.password;
  const passwordDescription = ["register-password-hint", passwordError ? "register-password-error" : null].filter(Boolean).join(" ");

  return (
    <AuthExperience
      titleId="register-title"
      title="Mulai dengan satu langkah"
      description="Buat akun privat untuk menyimpan progres, latihan, streak, dan rekomendasi makananmu."
      alternate={{ label: "Sudah punya akun?", href: "/login", action: "Masuk" }}
    >
      <form className="sign-in-form" action={formAction} noValidate>
        <div className="sign-in-field sign-in-reveal sign-in-delay-5">
          <label htmlFor="register-name">Nama lengkap</label>
          <input
            id="register-name"
            name="name"
            autoComplete="name"
            placeholder="Nama lengkapmu"
            required
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? "register-name-error" : undefined}
          />
          <FieldError id="register-name-error" errors={nameError} />
        </div>

        <div className="sign-in-field sign-in-reveal sign-in-delay-6">
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="nama@email.com"
            required
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? "register-email-error" : undefined}
          />
          <FieldError id="register-email-error" errors={emailError} />
        </div>

        <div className="sign-in-field sign-in-reveal sign-in-delay-7">
          <label htmlFor="new-password">Kata sandi</label>
          <small className="sign-in-field-helper" id="register-password-hint">Minimal 8 karakter, satu huruf kecil, dan satu angka.</small>
          <div className="sign-in-password-wrap">
            <input
              id="new-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Buat kata sandi"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              aria-invalid={Boolean(passwordError)}
              aria-describedby={passwordDescription}
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
          {passwordError?.length ? (
            <ul className="field-error-list register-password-errors" id="register-password-error">
              {passwordError.map((error) => <li key={error}>{error}</li>)}
            </ul>
          ) : null}
        </div>

        {state.message ? (
          <p className="auth-message" role="alert" aria-label="Peringatan pendaftaran">
            {state.message}
          </p>
        ) : null}

        <button className="button button-primary auth-submit sign-in-reveal sign-in-delay-8" type="submit" disabled={pending}>
          {pending ? "Membuat akun…" : "Buat akun"}
        </button>
      </form>
    </AuthExperience>
  );
}

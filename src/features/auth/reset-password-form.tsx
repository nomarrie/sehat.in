"use client";

import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";
import { useActionState, useState } from "react";
import { AuthExperience } from "@/components/ui/auth-experience";
import type { AuthFormState } from "./auth-validation";
import {
  requestPasswordResetAction,
  resetPasswordAction,
  verifyPasswordResetCodeAction,
} from "./actions";

type ResetPasswordFormViewProps = {
  state: AuthFormState;
  requesting: boolean;
  verifying: boolean;
  resetting: boolean;
  requestAction: (formData: FormData) => void;
  verificationAction: (formData: FormData) => void;
  resetAction: (formData: FormData) => void;
};

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  return errors?.[0] ? <small className="field-error" id={id}>{errors[0]}</small> : null;
}

function RecoveryMessage({ message, delay, isError = false }: { message?: string; delay: number; isError?: boolean }) {
  if (!message) return null;
  if (isError) return <p className="auth-message" role="alert">{message}</p>;
  return (
    <p className={`auth-notice sign-in-reveal sign-in-delay-${delay}`} role="status">
      <CheckCircleIcon size={19} weight="fill" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

export function ResetPasswordFormView({
  state,
  requesting,
  verifying,
  resetting,
  requestAction,
  verificationAction,
  resetAction,
}: ResetPasswordFormViewProps) {
  const email = state.verificationEmail ?? "";
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (state.passwordResetStep === "password") return (
    <AuthExperience
      titleId="reset-password-title"
      title="Buat kata sandi baru"
      description="Pilih kata sandi baru yang aman agar kamu bisa kembali melanjutkan programmu."
      alternate={{ label: "Sudah ingat kata sandi?", href: "/login", action: "Kembali masuk" }}
    >
      <RecoveryMessage message={state.message} delay={5} isError={Boolean(state.errors)} />
      <form className="sign-in-form" action={resetAction} noValidate>
        <input type="hidden" name="email" value={email} />
        <div className="sign-in-field sign-in-reveal sign-in-delay-6">
          <label htmlFor="new-password">Kata sandi baru</label>
          <small className="sign-in-field-helper" id="new-password-hint">Minimal 8 karakter, satu huruf kecil, dan satu angka.</small>
          <div className="sign-in-password-wrap">
            <input
              id="new-password"
              name="newPassword"
              type={showNewPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Buat kata sandi baru"
              minLength={8}
              required
              aria-invalid={Boolean(state.errors?.newPassword?.length)}
              aria-describedby={["new-password-hint", state.errors?.newPassword?.length ? "new-password-error" : null].filter(Boolean).join(" ")}
            />
            <button
              type="button"
              aria-label={showNewPassword ? "Sembunyikan kata sandi baru" : "Tampilkan kata sandi baru"}
              aria-pressed={showNewPassword}
              onClick={() => setShowNewPassword((visible) => !visible)}
            >
              {showNewPassword ? <EyeSlashIcon size={20} aria-hidden="true" /> : <EyeIcon size={20} aria-hidden="true" />}
            </button>
          </div>
          <FieldError id="new-password-error" errors={state.errors?.newPassword} />
        </div>
        <div className="sign-in-field sign-in-reveal sign-in-delay-7">
          <label htmlFor="confirm-new-password">Konfirmasi kata sandi baru</label>
          <div className="sign-in-password-wrap">
            <input
              id="confirm-new-password"
              name="confirmNewPassword"
              type={showConfirmation ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Ulangi kata sandi baru"
              minLength={8}
              required
              aria-invalid={Boolean(state.errors?.confirmNewPassword?.length)}
              aria-describedby={state.errors?.confirmNewPassword?.length ? "confirm-new-password-error" : undefined}
            />
            <button
              type="button"
              aria-label={showConfirmation ? "Sembunyikan konfirmasi kata sandi" : "Tampilkan konfirmasi kata sandi"}
              aria-pressed={showConfirmation}
              onClick={() => setShowConfirmation((visible) => !visible)}
            >
              {showConfirmation ? <EyeSlashIcon size={20} aria-hidden="true" /> : <EyeIcon size={20} aria-hidden="true" />}
            </button>
          </div>
          <FieldError id="confirm-new-password-error" errors={state.errors?.confirmNewPassword} />
        </div>
        <button className="button button-primary auth-submit sign-in-reveal sign-in-delay-8" type="submit" disabled={resetting}>{resetting ? "Memperbarui…" : "Perbarui kata sandi"}</button>
      </form>
    </AuthExperience>
  );

  if (state.passwordResetStep === "verify") return (
    <AuthExperience
      titleId="reset-password-title"
      title="Periksa email kamu"
      description="Masukkan kode pemulihan 6 digit untuk melanjutkan ke pembuatan kata sandi baru."
      alternate={{ label: "Sudah ingat kata sandi?", href: "/login", action: "Kembali masuk" }}
    >
      <div className="auth-notice sign-in-reveal sign-in-delay-5" role="status">
        <CheckCircleIcon size={19} weight="fill" aria-hidden="true" />
        <span>Permintaan pemulihan untuk {email}. {state.message}</span>
      </div>
      <form className="sign-in-form" action={verificationAction} noValidate>
        <input type="hidden" name="email" value={email} />
        <div className="sign-in-field sign-in-reveal sign-in-delay-6">
          <label htmlFor="recovery-code">Kode pemulihan</label>
          <input
            id="recovery-code"
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="000000"
            required
            aria-invalid={Boolean(state.errors?.otp?.length)}
            aria-describedby={state.errors?.otp?.length ? "recovery-code-error" : undefined}
          />
          <FieldError id="recovery-code-error" errors={state.errors?.otp} />
        </div>
        <button className="button button-primary auth-submit sign-in-reveal sign-in-delay-7" type="submit" disabled={verifying}>{verifying ? "Memverifikasi…" : "Verifikasi kode"}</button>
      </form>
    </AuthExperience>
  );

  return (
    <AuthExperience
      titleId="reset-password-title"
      title="Pulihkan akses akun"
      description="Kami akan mengirim kode singkat untuk membuat kata sandi baru."
      alternate={{ label: "Sudah ingat kata sandi?", href: "/login", action: "Kembali masuk" }}
    >
      <form className="sign-in-form" action={requestAction} noValidate>
        <div className="sign-in-field sign-in-reveal sign-in-delay-5">
          <label htmlFor="recovery-email">Email akun</label>
          <input
            id="recovery-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="nama@email.com"
            required
            aria-invalid={Boolean(state.errors?.email?.length)}
            aria-describedby={state.errors?.email?.length ? "recovery-email-error" : undefined}
          />
          <FieldError id="recovery-email-error" errors={state.errors?.email} />
        </div>
        {state.message ? <p className="auth-message" role="alert">{state.message}</p> : null}
        <button className="button button-primary auth-submit sign-in-reveal sign-in-delay-6" type="submit" disabled={requesting}>{requesting ? "Mengirim…" : "Kirim kode pemulihan"}</button>
      </form>
    </AuthExperience>
  );
}

export function ResetPasswordForm() {
  const [requestState, requestAction, requesting] = useActionState(requestPasswordResetAction, {});
  const [verificationState, verificationAction, verifying] = useActionState(verifyPasswordResetCodeAction, {});
  const [resetState, resetAction, resetting] = useActionState(resetPasswordAction, {});
  const state = resetState.passwordResetStep
    ? resetState
    : verificationState.passwordResetStep
      ? verificationState
      : requestState;

  return (
    <ResetPasswordFormView
      state={state}
      requesting={requesting}
      verifying={verifying}
      resetting={resetting}
      requestAction={requestAction}
      verificationAction={verificationAction}
      resetAction={resetAction}
    />
  );
}

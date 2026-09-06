"use client";

import { EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";
import { useActionState, useState } from "react";
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
    <form className="auth-form" action={resetAction} noValidate>
      <input type="hidden" name="email" value={email} />
      <div className="form-field">
        <label htmlFor="new-password">Kata sandi baru</label>
        <div className="sign-in-password-wrap">
          <input
            id="new-password"
            name="newPassword"
            type={showNewPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            required
            aria-invalid={Boolean(state.errors?.newPassword?.length)}
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
      </div>
      {state.errors?.newPassword?.map((error) => <small className="field-error" key={error}>{error}</small>)}
      <div className="form-field">
        <label htmlFor="confirm-new-password">Konfirmasi kata sandi baru</label>
        <div className="sign-in-password-wrap">
          <input
            id="confirm-new-password"
            name="confirmNewPassword"
            type={showConfirmation ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            required
            aria-invalid={Boolean(state.errors?.confirmNewPassword?.length)}
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
      </div>
      {state.errors?.confirmNewPassword?.map((error) => <small className="field-error" key={error}>{error}</small>)}
      <p className="auth-message" role="status">{state.message}</p>
      <button className="button button-primary auth-submit" disabled={resetting}>{resetting ? "Memperbarui…" : "Perbarui kata sandi"}</button>
    </form>
  );

  if (state.passwordResetStep === "verify") return (
    <form className="auth-form" action={verificationAction} noValidate>
      <input type="hidden" name="email" value={email} />
      <label className="form-field" htmlFor="recovery-code"><span>Kode pemulihan</span><input id="recovery-code" name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required /></label>
      {state.errors?.otp?.map((error) => <small className="field-error" key={error}>{error}</small>)}
      <p className="auth-message" role="status">{state.message}</p>
      <button className="button button-primary auth-submit" disabled={verifying}>{verifying ? "Memverifikasi…" : "Verifikasi kode"}</button>
    </form>
  );

  return (
    <form className="auth-form" action={requestAction} noValidate>
      <label className="form-field" htmlFor="recovery-email"><span>Email akun</span><input id="recovery-email" name="email" type="email" autoComplete="username" required /></label>
      {state.errors?.email?.map((error) => <small className="field-error" key={error}>{error}</small>)}
      <p className="auth-message" role="status">{state.message}</p>
      <button className="button button-primary auth-submit" disabled={requesting}>{requesting ? "Mengirim…" : "Kirim kode pemulihan"}</button>
    </form>
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

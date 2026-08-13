"use client";

import { useActionState } from "react";
import { requestPasswordResetAction, resetPasswordAction } from "./actions";

export function ResetPasswordForm() {
  const [requestState, requestAction, requesting] = useActionState(requestPasswordResetAction, {});
  const [resetState, resetAction, resetting] = useActionState(resetPasswordAction, {});
  const email = resetState.verificationEmail ?? requestState.verificationEmail;
  if (email) return (
    <form className="auth-form" action={resetAction} noValidate>
      <input type="hidden" name="email" value={email} />
      <label className="form-field"><span>Kode pemulihan</span><input name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required /></label>
      <label className="form-field"><span>Kata sandi baru</span><input name="newPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
      <p className="auth-message" role="status">{resetState.message ?? requestState.message}</p>
      <button className="button button-primary auth-submit" disabled={resetting}>{resetting ? "Memperbarui…" : "Perbarui kata sandi"}</button>
    </form>
  );
  return (
    <form className="auth-form" action={requestAction} noValidate>
      <label className="form-field"><span>Email akun</span><input name="email" type="email" autoComplete="username" required /></label>
      <p className="auth-message" role="status">{requestState.message}</p>
      <button className="button button-primary auth-submit" disabled={requesting}>{requesting ? "Mengirim…" : "Kirim kode pemulihan"}</button>
    </form>
  );
}

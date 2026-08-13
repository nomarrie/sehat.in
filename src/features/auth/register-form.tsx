"use client";

import { useActionState } from "react";
import { signUpAction, verifyEmailAction } from "./actions";

export function RegisterForm() {
  const [state, action, pending] = useActionState(signUpAction, {});
  const [verifyState, verifyAction, verifying] = useActionState(verifyEmailAction, {});
  const verificationEmail = verifyState.verificationEmail ?? state.verificationEmail;

  if (verificationEmail) {
    return (
      <form className="auth-form" action={verifyAction} noValidate>
        <input type="hidden" name="email" value={verificationEmail} />
        <div className="auth-notice"><strong>Periksa email kamu</strong><span>Kode dikirim ke {verificationEmail} dan berlaku selama beberapa menit.</span></div>
        <label className="form-field" htmlFor="verification-code"><span>Kode verifikasi</span><input id="verification-code" name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required /></label>
        <p className="auth-message" role="status" aria-live="polite">{verifyState.message ?? state.message}</p>
        <button className="button button-primary auth-submit" type="submit" disabled={verifying}>{verifying ? "Memverifikasi…" : "Verifikasi dan lanjutkan"}</button>
      </form>
    );
  }

  return (
    <form className="auth-form" action={action} noValidate>
      <label className="form-field" htmlFor="register-name"><span>Nama lengkap</span><input id="register-name" name="name" autoComplete="name" required /></label>
      {state.errors?.name ? <small className="field-error">{state.errors.name[0]}</small> : null}
      <label className="form-field" htmlFor="register-email"><span>Email</span><input id="register-email" name="email" type="email" autoComplete="username" required /></label>
      {state.errors?.email ? <small className="field-error">{state.errors.email[0]}</small> : null}
      <label className="form-field" htmlFor="new-password"><span>Kata sandi</span><small id="password-hint">Minimal 8 karakter, satu huruf kecil, dan satu angka.</small><input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} required aria-describedby="password-hint" /></label>
      {state.errors?.password ? <ul className="field-error-list">{state.errors.password.map((error) => <li key={error}>{error}</li>)}</ul> : null}
      <p className="auth-message" role="status" aria-live="polite">{state.message}</p>
      <button className="button button-primary auth-submit" type="submit" disabled={pending}>{pending ? "Membuat akun…" : "Buat akun"}</button>
    </form>
  );
}

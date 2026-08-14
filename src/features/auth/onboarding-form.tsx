"use client";

import { useActionState } from "react";
import { completeOnboardingAction } from "./actions";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState(completeOnboardingAction, {});
  const error = (field: string) => state.errors?.[field]?.[0];
  return (
    <form className="onboarding-form" action={action} noValidate>
      <section className="onboarding-section"><h2>Tentang kamu</h2><div className="settings-fields">
        <label className="form-field" htmlFor="onboarding-name"><span>Nama lengkap</span><input id="onboarding-name" name="fullName" defaultValue={defaultName} autoComplete="name" required /></label>
        <label className="form-field" htmlFor="onboarding-age"><span>Usia</span><span className="input-with-unit"><input id="onboarding-age" name="age" type="number" min={13} max={100} inputMode="numeric" required /><small>tahun</small></span>{error("age") ? <small className="field-error">{error("age")}</small> : null}</label>
        <label className="form-field" htmlFor="onboarding-height"><span>Tinggi badan</span><span className="input-with-unit"><input id="onboarding-height" name="heightCm" type="number" min={100} max={250} step="0.1" inputMode="decimal" required /><small>cm</small></span>{error("heightCm") ? <small className="field-error">{error("heightCm")}</small> : null}</label>
      </div></section>
      <section className="onboarding-section"><h2>Arah program</h2><div className="settings-fields">
        <label className="form-field"><span>Berat awal</span><span className="input-with-unit"><input name="initialWeightKg" type="number" min={30} max={300} step="0.1" required /><small>kg</small></span>{error("initialWeightKg") ? <small className="field-error">{error("initialWeightKg")}</small> : null}</label>
        <label className="form-field"><span>Target berat</span><span className="input-with-unit"><input name="targetWeightKg" type="number" min={30} max={300} step="0.1" required /><small>kg</small></span>{error("targetWeightKg") ? <small className="field-error">{error("targetWeightKg")}</small> : null}</label>
        <label className="form-field"><span>Target mingguan</span><span className="input-with-unit"><input name="weeklyTargetKg" type="number" min={0.5} max={1} step="0.1" defaultValue="0.5" required /><small>kg</small></span><small>Rentang program: 0,5–1 kg per minggu.</small></label>
        <label className="form-field"><span>Tingkat aktivitas</span><select name="activityLevel" defaultValue="pemula"><option value="pemula">Pemula</option><option value="menengah">Menengah</option><option value="aktif">Aktif</option></select></label>
        <label className="form-field"><span>Preferensi makanan</span><select name="mealPreference" defaultValue="seimbang"><option value="seimbang">Seimbang</option><option value="tinggi-protein">Tinggi protein</option><option value="nabati">Lebih banyak pilihan nabati</option></select></label>
      </div></section>
      <aside className="food-disclaimer"><strong>Catatan penting</strong><p>Sehat.in membantu menyusun kebiasaan umum dan bukan pengganti konsultasi tenaga profesional. Berhenti bila tubuh terasa tidak nyaman.</p></aside>
      <section className="ai-consent-card" aria-labelledby="ai-consent-title">
        <label htmlFor="ai-processing-consent">
          <input
            id="ai-processing-consent"
            name="aiProcessingConsent"
            type="checkbox"
            aria-describedby="ai-consent-description"
          />
          <span>
            <strong id="ai-consent-title">Izinkan personalisasi dengan AI</strong>
            <small id="ai-consent-description">
              Jika kamu setuju, berat saat ini dan target, preferensi makanan, tingkat aktivitas,
              serta pola latihan dikirim ke OpenRouter dengan Zero Data Retention dan provider
              terbatas. Nama, usia, tinggi badan, dan riwayat berat tidak dikirim. Tanpa
              persetujuan, Sehat.in tetap membuat rencana lokal.
            </small>
          </span>
        </label>
      </section>
      <p className="auth-message" role="status" aria-live="polite">{state.message}</p>
      <button className="button button-primary onboarding-submit" type="submit" disabled={pending}>{pending ? "Menyusun program awal…" : "Mulai program saya"}</button>
    </form>
  );
}

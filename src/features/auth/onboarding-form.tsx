"use client";

import { TrendDownIcon } from "@phosphor-icons/react/dist/ssr/TrendDown";
import { TrendUpIcon } from "@phosphor-icons/react/dist/ssr/TrendUp";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { weeklyTargetRange, type GoalDirection } from "@/lib/sehatin/goals";
import { completeOnboardingAction } from "./actions";

type OnboardingDraft = {
  fullName: string;
  age: string;
  heightCm: string;
  initialWeightKg: string;
  targetWeightKg: string;
  goalDirection: GoalDirection;
  weeklyTargetKg: string;
  activityLevel: "pemula" | "menengah" | "aktif";
  mealPreference: "seimbang" | "tinggi-protein" | "nabati";
  aiProcessingConsent: boolean;
};

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState(completeOnboardingAction, {});
  const [draft, setDraft] = useState<OnboardingDraft>({
    fullName: defaultName,
    age: "",
    heightCm: "",
    initialWeightKg: "",
    targetWeightKg: "",
    goalDirection: "lose",
    weeklyTargetKg: "0.5",
    activityLevel: "pemula",
    mealPreference: "seimbang",
    aiProcessingConsent: false,
  });
  const weeklyRange = weeklyTargetRange(draft.goalDirection);

  function update<K extends keyof OnboardingDraft>(
    key: K,
    value: OnboardingDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function chooseGoal(direction: GoalDirection) {
    setDraft((current) => ({
      ...current,
      goalDirection: direction,
      weeklyTargetKg: String(weeklyTargetRange(direction).defaultValue),
    }));
  }

  function fieldError(field: keyof OnboardingDraft) {
    const message = state.errors?.[field]?.[0];
    return message ? (
      <small className="field-error" id={`onboarding-${field}-error`}>
        {message}
      </small>
    ) : null;
  }

  function errorProps(field: keyof OnboardingDraft) {
    const hasError = Boolean(state.errors?.[field]?.length);
    return {
      "aria-invalid": hasError,
      "aria-describedby": hasError ? `onboarding-${field}-error` : undefined,
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  return (
    <form className="onboarding-form" onSubmit={handleSubmit} noValidate>
      <section className="onboarding-section">
        <h2>Tentang kamu</h2>
        <div className="settings-fields">
          <label className="form-field" htmlFor="onboarding-name">
            <span>Nama lengkap</span>
            <input
              id="onboarding-name"
              name="fullName"
              value={draft.fullName}
              onChange={(event) => update("fullName", event.target.value)}
              autoComplete="name"
              required
              {...errorProps("fullName")}
            />
            {fieldError("fullName")}
          </label>
          <label className="form-field" htmlFor="onboarding-age">
            <span>Usia</span>
            <span className="input-with-unit">
              <input
                id="onboarding-age"
                name="age"
                aria-label="Usia"
                type="number"
                min={13}
                max={100}
                inputMode="numeric"
                value={draft.age}
                onChange={(event) => update("age", event.target.value)}
                required
                {...errorProps("age")}
              />
              <small aria-hidden="true">tahun</small>
            </span>
            {fieldError("age")}
          </label>
          <label className="form-field" htmlFor="onboarding-height">
            <span>Tinggi badan</span>
            <span className="input-with-unit">
              <input
                id="onboarding-height"
                name="heightCm"
                aria-label="Tinggi badan"
                type="number"
                min={100}
                max={250}
                step="0.1"
                inputMode="decimal"
                value={draft.heightCm}
                onChange={(event) => update("heightCm", event.target.value)}
                required
                {...errorProps("heightCm")}
              />
              <small aria-hidden="true">cm</small>
            </span>
            {fieldError("heightCm")}
          </label>
        </div>
      </section>

      <section className="onboarding-section">
        <h2>Arah program</h2>
        <div className="settings-fields">
          <fieldset
            className="goal-direction-fieldset"
            aria-describedby={
              state.errors?.goalDirection?.length
                ? "onboarding-goalDirection-error"
                : undefined
            }
          >
            <legend>Tujuan utama</legend>
            <div className="goal-direction-options">
              <label
                className={
                  draft.goalDirection === "lose"
                    ? "goal-direction-option is-selected"
                    : "goal-direction-option"
                }
              >
                <input
                  type="radio"
                  name="goalDirection"
                  value="lose"
                  checked={draft.goalDirection === "lose"}
                  onChange={() => chooseGoal("lose")}
                />
                <TrendDownIcon size={22} weight="bold" aria-hidden="true" />
                <span>
                  <strong>Turunkan berat badan</strong>
                  <small>
                    Fokus pada kebiasaan aktif dan porsi yang mendukung penurunan bertahap.
                  </small>
                </span>
              </label>
              <label
                className={
                  draft.goalDirection === "gain"
                    ? "goal-direction-option is-selected"
                    : "goal-direction-option"
                }
              >
                <input
                  type="radio"
                  name="goalDirection"
                  value="gain"
                  checked={draft.goalDirection === "gain"}
                  onChange={() => chooseGoal("gain")}
                />
                <TrendUpIcon size={22} weight="bold" aria-hidden="true" />
                <span>
                  <strong>Naikkan berat badan</strong>
                  <small>
                    Fokus pada latihan kekuatan dan tambahan energi dari makanan bergizi.
                  </small>
                </span>
              </label>
            </div>
            {fieldError("goalDirection")}
          </fieldset>

          <label className="form-field">
            <span>Berat awal</span>
            <span className="input-with-unit">
              <input
                name="initialWeightKg"
                aria-label="Berat awal"
                type="number"
                min={30}
                max={300}
                step="0.1"
                value={draft.initialWeightKg}
                onChange={(event) => update("initialWeightKg", event.target.value)}
                required
                {...errorProps("initialWeightKg")}
              />
              <small aria-hidden="true">kg</small>
            </span>
            {fieldError("initialWeightKg")}
          </label>
          <label className="form-field">
            <span>Target berat</span>
            <span className="input-with-unit">
              <input
                name="targetWeightKg"
                aria-label="Target berat"
                type="number"
                min={30}
                max={300}
                step="0.1"
                value={draft.targetWeightKg}
                onChange={(event) => update("targetWeightKg", event.target.value)}
                required
                {...errorProps("targetWeightKg")}
              />
              <small aria-hidden="true">kg</small>
            </span>
            {fieldError("targetWeightKg")}
          </label>
          <label className="form-field">
            <span>Target mingguan</span>
            <span className="input-with-unit">
              <input
                name="weeklyTargetKg"
                aria-label="Target mingguan"
                type="number"
                min={weeklyRange.min}
                max={weeklyRange.max}
                step={weeklyRange.step}
                value={draft.weeklyTargetKg}
                onChange={(event) => update("weeklyTargetKg", event.target.value)}
                required
                {...errorProps("weeklyTargetKg")}
              />
              <small aria-hidden="true">kg</small>
            </span>
            <small>
              {draft.goalDirection === "gain"
                ? "Rentang kenaikan bertahap: 0,25–0,5 kg per minggu."
                : "Rentang penurunan bertahap: 0,5–1 kg per minggu."}
            </small>
            {fieldError("weeklyTargetKg")}
          </label>
          <label className="form-field">
            <span>Tingkat aktivitas</span>
            <select
              name="activityLevel"
              value={draft.activityLevel}
              onChange={(event) =>
                update(
                  "activityLevel",
                  event.target.value as OnboardingDraft["activityLevel"],
                )
              }
              {...errorProps("activityLevel")}
            >
              <option value="pemula">Pemula</option>
              <option value="menengah">Menengah</option>
              <option value="aktif">Aktif</option>
            </select>
            {fieldError("activityLevel")}
          </label>
          <label className="form-field">
            <span>Preferensi makanan</span>
            <select
              name="mealPreference"
              value={draft.mealPreference}
              onChange={(event) =>
                update(
                  "mealPreference",
                  event.target.value as OnboardingDraft["mealPreference"],
                )
              }
              {...errorProps("mealPreference")}
            >
              <option value="seimbang">Seimbang</option>
              <option value="tinggi-protein">Tinggi protein</option>
              <option value="nabati">Lebih banyak pilihan nabati</option>
            </select>
            {fieldError("mealPreference")}
          </label>
        </div>
      </section>

      <aside className="food-disclaimer">
        <strong>Catatan penting</strong>
        <p>
          Sehat.in membantu menyusun kebiasaan umum dan bukan pengganti konsultasi
          tenaga profesional. Berhenti bila tubuh terasa tidak nyaman.
        </p>
      </aside>
      <section className="ai-consent-card" aria-labelledby="ai-consent-title">
        <label htmlFor="ai-processing-consent">
          <input
            id="ai-processing-consent"
            name="aiProcessingConsent"
            type="checkbox"
            checked={draft.aiProcessingConsent}
            onChange={(event) => update("aiProcessingConsent", event.target.checked)}
            aria-describedby="ai-consent-description"
          />
          <span>
            <strong id="ai-consent-title">Izinkan personalisasi dengan AI</strong>
            <small id="ai-consent-description">
              Jika kamu setuju, berat saat ini dan target, preferensi makanan, tingkat
              aktivitas, serta pola latihan dikirim ke OpenRouter dengan Zero Data
              Retention dan provider terbatas. Nama, usia, tinggi badan, dan riwayat
              berat tidak dikirim. Tanpa persetujuan, Sehat.in tetap membuat rencana
              lokal.
            </small>
          </span>
        </label>
      </section>
      <p className="auth-message" role="status" aria-live="polite">
        {state.message}
      </p>
      <button
        className="button button-primary onboarding-submit"
        type="submit"
        disabled={pending}
      >
        {pending ? "Menyusun program awal…" : "Mulai program saya"}
      </button>
    </form>
  );
}

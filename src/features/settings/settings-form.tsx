"use client";

import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { FloppyDiskIcon } from "@phosphor-icons/react/dist/ssr/FloppyDisk";
import { BellIcon } from "@phosphor-icons/react/dist/ssr/Bell";
import { IdentificationCardIcon } from "@phosphor-icons/react/dist/ssr/IdentificationCard";
import { TargetIcon } from "@phosphor-icons/react/dist/ssr/Target";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import Link from "next/link";
import { useActionState, useMemo, useRef, useState, type FormEvent } from "react";
import type { ProfileSettings, SettingsDraft } from "./settings.types";
import { settingsToDraft, validateSettingsDraft } from "./settings-validation";
import { saveSettingsAction, type SettingsActionState } from "./actions";

type SettingsFormProps = { initialSettings: ProfileSettings; mode?: "all" | "preferences" | "program" };

const activityOptions = [
  { value: "pemula", label: "Pemula — baru membangun kebiasaan" },
  { value: "menengah", label: "Menengah — aktif beberapa kali seminggu" },
  { value: "aktif", label: "Aktif — rutin bergerak hampir setiap hari" },
] as const;

const mealOptions = [
  { value: "seimbang", label: "Seimbang" },
  { value: "tinggi-protein", label: "Tinggi protein" },
  { value: "nabati", label: "Lebih banyak pilihan nabati" },
] as const;

export function SettingsForm({ initialSettings, mode = "all" }: SettingsFormProps) {
  const initialDraft = useMemo(() => settingsToDraft(initialSettings), [initialSettings]);
  const [savedDraft, setSavedDraft] = useState(initialDraft);
  const [draft, setDraft] = useState(initialDraft);
  const draftRef = useRef(initialDraft);
  const [savedRevision, setSavedRevision] = useState(0);
  const [errors, setErrors] = useState<ReturnType<typeof validateSettingsDraft>["errors"]>({});
  const [message, setMessage] = useState("");
  const [, saveAction, pending] = useActionState(async (previousState: SettingsActionState, formData: FormData) => {
    const result = await saveSettingsAction(previousState, formData);
    setMessage(result.message ?? "");
    if (result.ok) {
      const submittedDraft = draftRef.current;
      setSavedDraft(submittedDraft);
      setDraft({ ...submittedDraft });
      setSavedRevision((revision) => revision + 1);
    }
    return result;
  }, {});
  const isDirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);

  function update<K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      draftRef.current = next;
      return next;
    });
    setErrors((current) => ({ ...current, [key]: undefined }));
    setMessage("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const result = validateSettingsDraft(draft);
    setErrors(result.errors);
    if (!result.value) {
      event.preventDefault();
      setMessage("Periksa kembali kolom yang ditandai.");
      return;
    }
    setMessage("");
  }

  function cancelChanges() {
    draftRef.current = savedDraft;
    setDraft(savedDraft);
    setErrors({});
    setMessage("Perubahan yang belum disimpan dibatalkan.");
  }

  const fieldError = (key: keyof SettingsDraft) =>
    errors[key] ? <span className="field-error" id={`${key}-error`}>{errors[key]}</span> : null;

  const errorProps = (key: keyof SettingsDraft) => ({
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
  });

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div>
          {mode !== "all" && <Link className="profile-back-link" href="/dashboard"><ArrowLeftIcon size={18} />Kembali ke dashboard</Link>}
          <h1>{mode === "program" ? "Data program" : mode === "preferences" ? "Preferensi pribadi" : "Pengaturan"}</h1>
          <p>{mode === "program" ? "Sesuaikan data yang menjadi dasar target dan rekomendasimu." : "Kelola identitas dan cara Sehat.in mengingatkanmu."}</p>
        </div>
        <div className="demo-data-note">
          <CheckCircleIcon size={22} weight="fill" aria-hidden="true" />
          <span><strong>Tersimpan di akunmu</strong><small>Perubahan digunakan untuk target dan rekomendasi berikutnya.</small></span>
        </div>
      </header>

      <form key={savedRevision} className="settings-form" action={saveAction} onSubmit={handleSubmit} noValidate>
        {mode === "preferences" && <>
          <input type="hidden" name="heightCm" value={draft.heightCm} />
          <input type="hidden" name="currentWeightKg" value={draft.currentWeightKg} />
          <input type="hidden" name="targetWeightKg" value={draft.targetWeightKg} />
          <input type="hidden" name="weeklyTargetKg" value={draft.weeklyTargetKg} />
          <input type="hidden" name="activityLevel" value={draft.activityLevel} />
          <input type="hidden" name="mealPreference" value={draft.mealPreference} />
          <input type="hidden" name="aiProcessingConsent" value={draft.aiProcessingConsent ? "on" : ""} />
        </>}
        {mode === "program" && <>
          <input type="hidden" name="fullName" value={draft.fullName} />
          <input type="hidden" name="age" value={draft.age} />
          <input type="hidden" name="reminderEnabled" value={draft.reminderEnabled ? "on" : ""} />
          <input type="hidden" name="reminderTime" value={draft.reminderTime} />
          <input type="hidden" name="weeklySummaryEnabled" value={draft.weeklySummaryEnabled ? "on" : ""} />
        </>}
        {mode !== "program" && <section className="settings-section" aria-labelledby="profile-title">
          <div className="settings-section-heading">
            <span className="settings-section-icon"><IdentificationCardIcon size={22} aria-hidden="true" /></span>
            <div><h2 id="profile-title">Data pribadi</h2><p>Informasi dasar yang digunakan di dalam programmu.</p></div>
          </div>
          <div className="settings-fields">
            <label className="form-field">
              <span>Nama lengkap</span>
              <input name="fullName" value={draft.fullName} onChange={(event) => update("fullName", event.target.value)} {...errorProps("fullName")} />
              {fieldError("fullName")}
            </label>
            <label className="form-field">
              <span>Email</span>
              <input name="email" type="email" value={draft.email} readOnly aria-describedby="email-readonly-hint" />
              <small id="email-readonly-hint" className="field-hint">Email akun dikelola melalui autentikasi.</small>
            </label>
            <label className="form-field">
              <span>Usia</span>
              <span className="input-with-unit"><input name="age" aria-label="Usia" type="number" inputMode="numeric" min="13" max="100" value={draft.age} onChange={(event) => update("age", event.target.value)} {...errorProps("age")} /><small aria-hidden="true">tahun</small></span>
              {fieldError("age")}
            </label>
          </div>
        </section>}

        {mode !== "preferences" && <section className="settings-section" aria-labelledby="program-title">
          <div className="settings-section-heading">
            <span className="settings-section-icon"><TargetIcon size={22} aria-hidden="true" /></span>
            <div><h2 id="program-title">Data program</h2><p>Perbarui titik awal agar target dan rekomendasi tetap relevan.</p></div>
          </div>
          <div className="settings-fields settings-fields-compact">
            <label className="form-field"><span>Tinggi badan</span><span className="input-with-unit"><input name="heightCm" aria-label="Tinggi badan" type="number" inputMode="decimal" value={draft.heightCm} onChange={(event) => update("heightCm", event.target.value)} {...errorProps("heightCm")} /><small aria-hidden="true">cm</small></span>{fieldError("heightCm")}</label>
            <label className="form-field"><span>Berat saat ini</span><span className="input-with-unit"><input name="currentWeightKg" aria-label="Berat saat ini" type="number" inputMode="decimal" step="0.1" value={draft.currentWeightKg} onChange={(event) => update("currentWeightKg", event.target.value)} {...errorProps("currentWeightKg")} /><small aria-hidden="true">kg</small></span>{fieldError("currentWeightKg")}</label>
            <label className="form-field"><span>Target berat</span><span className="input-with-unit"><input name="targetWeightKg" aria-label="Target berat" type="number" inputMode="decimal" step="0.1" value={draft.targetWeightKg} onChange={(event) => update("targetWeightKg", event.target.value)} {...errorProps("targetWeightKg")} /><small aria-hidden="true">kg</small></span>{fieldError("targetWeightKg")}</label>
            <label className="form-field"><span>Target mingguan</span><span className="input-with-unit"><input name="weeklyTargetKg" aria-label="Target mingguan" type="number" inputMode="decimal" min="0.5" max="1" step="0.1" value={draft.weeklyTargetKg} onChange={(event) => update("weeklyTargetKg", event.target.value)} {...errorProps("weeklyTargetKg")} /><small aria-hidden="true">kg</small></span><small className="field-hint">Rentang aman: 0,5–1 kg.</small>{fieldError("weeklyTargetKg")}</label>
            <label className="form-field"><span>Tingkat aktivitas</span><select name="activityLevel" value={draft.activityLevel} onChange={(event) => update("activityLevel", event.target.value as SettingsDraft["activityLevel"])}>{activityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="form-field"><span>Preferensi makanan</span><select name="mealPreference" value={draft.mealPreference} onChange={(event) => update("mealPreference", event.target.value as SettingsDraft["mealPreference"])}>{mealOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          </div>
        </section>}

        {mode !== "preferences" && <section className="settings-section" aria-labelledby="ai-personalization-title">
          <div className="settings-section-heading">
            <span className="settings-section-icon"><CheckCircleIcon size={22} aria-hidden="true" /></span>
            <div><h2 id="ai-personalization-title">Personalisasi AI</h2><p>Kelola izin pemrosesan data untuk rekomendasi adaptif.</p></div>
          </div>
          <div className="preference-list">
            <label className="preference-row">
              <span>
                <strong>Izinkan personalisasi dengan AI</strong>
                <small>Jika aktif, berat terkini, target program, preferensi makanan, dan ringkasan latihan dapat diproses untuk menyusun rekomendasi. Jika tidak, Sehat.in memakai rencana terkurasi.</small>
              </span>
              <input name="aiProcessingConsent" aria-label="Izinkan personalisasi dengan AI" className="switch-input" type="checkbox" checked={draft.aiProcessingConsent} onChange={(event) => update("aiProcessingConsent", event.target.checked)} />
            </label>
          </div>
        </section>}

        {mode !== "program" && <section className="settings-section" aria-labelledby="notifications-title">
          <div className="settings-section-heading">
            <span className="settings-section-icon"><BellIcon size={22} aria-hidden="true" /></span>
            <div><h2 id="notifications-title">Pengingat</h2><p>Pilih pembaruan yang ingin kamu lihat selama menjalani program.</p></div>
          </div>
          <div className="preference-list">
            <label className="preference-row"><span><strong>Pengingat harian</strong><small>Ingatkan jadwal latihan dan pencatatan berat.</small></span><input name="reminderEnabled" aria-label="Pengingat harian" className="switch-input" type="checkbox" checked={draft.reminderEnabled} onChange={(event) => update("reminderEnabled", event.target.checked)} /></label>
            {draft.reminderEnabled && <label className="form-field reminder-time"><span>Waktu pengingat</span><input name="reminderTime" type="time" value={draft.reminderTime} onChange={(event) => update("reminderTime", event.target.value)} {...errorProps("reminderTime")} />{fieldError("reminderTime")}</label>}
            {!draft.reminderEnabled && <input type="hidden" name="reminderTime" value={draft.reminderTime} />}
            <label className="preference-row"><span><strong>Ringkasan mingguan</strong><small>Tampilkan rangkuman progres setiap akhir pekan.</small></span><input name="weeklySummaryEnabled" aria-label="Ringkasan mingguan" className="switch-input" type="checkbox" checked={draft.weeklySummaryEnabled} onChange={(event) => update("weeklySummaryEnabled", event.target.checked)} /></label>
          </div>
        </section>}

        <div className="settings-actions">
          <p className={Object.keys(errors).length ? "settings-message is-error" : "settings-message"} role="status" aria-live="polite">{message}</p>
          <div>
            <button className="button button-secondary" type="button" onClick={cancelChanges} disabled={!isDirty}>Batalkan perubahan</button>
             <button className="button button-primary" type="submit" disabled={!isDirty || pending}><FloppyDiskIcon size={19} weight="bold" aria-hidden="true" />{pending ? "Menyimpan…" : "Simpan perubahan"}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

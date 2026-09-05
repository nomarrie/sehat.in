import type {
  ProfileSettings,
  SettingsDraft,
  SettingsErrors,
} from "@/features/settings/settings.types";

export function settingsToDraft(settings: ProfileSettings): SettingsDraft {
  return {
    ...settings,
    age: String(settings.age),
    heightCm: String(settings.heightCm),
    currentWeightKg: String(settings.currentWeightKg),
    targetWeightKg: String(settings.targetWeightKg),
    weeklyTargetKg: String(settings.weeklyTargetKg),
  };
}

export function validateSettingsDraft(draft: SettingsDraft): {
  errors: SettingsErrors;
  value?: ProfileSettings;
} {
  const errors: SettingsErrors = {};
  const heightCm = Number(draft.heightCm);
  const age = Number(draft.age);
  const currentWeightKg = Number(draft.currentWeightKg);
  const targetWeightKg = Number(draft.targetWeightKg);
  const weeklyTargetKg = Number(draft.weeklyTargetKg);

  if (draft.fullName.trim().length < 2) {
    errors.fullName = "Nama harus berisi minimal 2 karakter.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
    errors.email = "Masukkan alamat email yang valid.";
  }
  if (!Number.isInteger(age) || age < 13 || age > 100) {
    errors.age = "Usia harus antara 13–100 tahun.";
  }
  if (!Number.isFinite(heightCm) || heightCm < 100 || heightCm > 250) {
    errors.heightCm = "Tinggi badan harus antara 100–250 cm.";
  }
  if (!Number.isFinite(currentWeightKg) || currentWeightKg < 30 || currentWeightKg > 300) {
    errors.currentWeightKg = "Berat saat ini harus antara 30–300 kg.";
  }
  if (!Number.isFinite(targetWeightKg) || targetWeightKg < 30 || targetWeightKg > 300) {
    errors.targetWeightKg = "Target berat harus antara 30–300 kg.";
  } else if (draft.goalDirection === "lose" && Number.isFinite(currentWeightKg) && targetWeightKg >= currentWeightKg) {
    errors.targetWeightKg = "Target berat harus lebih rendah dari berat saat ini.";
  } else if (draft.goalDirection === "gain" && Number.isFinite(currentWeightKg) && targetWeightKg <= currentWeightKg) {
    errors.targetWeightKg = "Target berat harus lebih tinggi dari berat saat ini.";
  }
  const weeklyMin = draft.goalDirection === "gain" ? 0.25 : 0.5;
  const weeklyMax = draft.goalDirection === "gain" ? 0.5 : 1;
  if (!Number.isFinite(weeklyTargetKg) || weeklyTargetKg < weeklyMin || weeklyTargetKg > weeklyMax) {
    errors.weeklyTargetKg = draft.goalDirection === "gain"
      ? "Pilih target bertahap antara 0,25–0,5 kg per minggu."
      : "Pilih target bertahap antara 0,5–1 kg per minggu.";
  }
  if (draft.reminderEnabled && !draft.reminderTime) {
    errors.reminderTime = "Pilih waktu pengingat.";
  }

  if (Object.keys(errors).length > 0) return { errors };

  return {
    errors,
    value: {
      ...draft,
      fullName: draft.fullName.trim(),
      email: draft.email.trim(),
      age,
      heightCm,
      currentWeightKg,
      targetWeightKg,
      weeklyTargetKg,
    },
  };
}

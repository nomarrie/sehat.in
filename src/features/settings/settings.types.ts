export type ActivityLevel = "pemula" | "menengah" | "aktif";
export type MealPreference = "seimbang" | "tinggi-protein" | "nabati";

export type ProfileSettings = {
  fullName: string;
  email: string;
  age: number;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  weeklyTargetKg: number;
  activityLevel: ActivityLevel;
  mealPreference: MealPreference;
  aiProcessingConsent: boolean;
  reminderEnabled: boolean;
  reminderTime: string;
  weeklySummaryEnabled: boolean;
};

export type SettingsDraft = Omit<
  ProfileSettings,
  "age" | "heightCm" | "currentWeightKg" | "targetWeightKg" | "weeklyTargetKg"
> & {
  age: string;
  heightCm: string;
  currentWeightKg: string;
  targetWeightKg: string;
  weeklyTargetKg: string;
};

export type SettingsErrors = Partial<Record<keyof SettingsDraft, string>>;

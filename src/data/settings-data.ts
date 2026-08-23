import { dashboardData } from "@/data/mock-data";
import type { ProfileSettings } from "@/features/settings/settings.types";

export const profileSettings: ProfileSettings = {
  fullName: dashboardData.user.name,
  email: "naila.pratama@example.com",
  age: 29,
  heightCm: 164,
  currentWeightKg: dashboardData.user.currentWeight,
  targetWeightKg: dashboardData.user.targetWeight,
  weeklyTargetKg: 0.6,
  activityLevel: "pemula",
  mealPreference: "seimbang",
  aiProcessingConsent: false,
  reminderEnabled: true,
  reminderTime: "18:30",
  weeklySummaryEnabled: true,
};

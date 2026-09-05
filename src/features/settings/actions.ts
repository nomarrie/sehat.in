"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createInsForgeServerClient } from "@/lib/insforge/server";
import { getBackendErrorMessage } from "@/lib/insforge/errors";
import { getDateInTimeZone } from "@/lib/sehatin/format";

const settingsSchema = z.object({
  fullName: z.string().trim().min(2).max(100), age: z.coerce.number().int().min(13).max(100),
  heightCm: z.coerce.number().min(100).max(250), currentWeightKg: z.coerce.number().min(30).max(300),
  targetWeightKg: z.coerce.number().min(30).max(300), goalDirection: z.enum(["lose", "gain"]), weeklyTargetKg: z.coerce.number().min(0.25).max(1),
  activityLevel: z.enum(["pemula", "menengah", "aktif"]), mealPreference: z.enum(["seimbang", "tinggi-protein", "nabati"]),
  aiProcessingConsent: z.boolean(),
  reminderEnabled: z.boolean(), reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), weeklySummaryEnabled: z.boolean(),
}).superRefine((value, context) => {
  if (value.goalDirection === "lose" && value.targetWeightKg >= value.currentWeightKg) {
    context.addIssue({ code: "custom", path: ["targetWeightKg"], message: "Target must be lower than current weight" });
  }
  if (value.goalDirection === "gain" && value.targetWeightKg <= value.currentWeightKg) {
    context.addIssue({ code: "custom", path: ["targetWeightKg"], message: "Target must be higher than current weight" });
  }
  if (value.goalDirection === "gain" && value.weeklyTargetKg > 0.5) {
    context.addIssue({ code: "custom", path: ["weeklyTargetKg"], message: "Weekly gain is too high" });
  }
  if (value.goalDirection === "lose" && value.weeklyTargetKg < 0.5) {
    context.addIssue({ code: "custom", path: ["weeklyTargetKg"], message: "Weekly loss is too low" });
  }
});

export type SettingsActionState = { ok?: boolean; message?: string };

export async function saveSettingsAction(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const parsed = settingsSchema.safeParse({
    fullName: formData.get("fullName"), age: formData.get("age"), heightCm: formData.get("heightCm"),
    currentWeightKg: formData.get("currentWeightKg"), targetWeightKg: formData.get("targetWeightKg"), goalDirection: formData.get("goalDirection"), weeklyTargetKg: formData.get("weeklyTargetKg"),
    activityLevel: formData.get("activityLevel"), mealPreference: formData.get("mealPreference"),
    aiProcessingConsent: formData.get("aiProcessingConsent") === "on",
    reminderEnabled: formData.get("reminderEnabled") === "on", reminderTime: formData.get("reminderTime"), weeklySummaryEnabled: formData.get("weeklySummaryEnabled") === "on",
  });
  if (!parsed.success) return { ok: false, message: "Periksa kembali kolom yang ditandai." };

  const client = await createInsForgeServerClient();
  const currentResult = await client.database.from("profiles")
    .select("current_weight_kg, goal_direction, time_zone, ai_processing_consent_at, ai_processing_consent_version")
    .limit(1)
    .single();
  if (currentResult.error) return { ok: false, message: getBackendErrorMessage(currentResult.error, "Profil belum dapat diperbarui.") };
  if (currentResult.data.goal_direction !== parsed.data.goalDirection) {
    return { ok: false, message: "Arah program tidak cocok dengan profil. Muat ulang halaman lalu coba lagi." };
  }
  const updateResult = await client.database.from("profiles").update({
    full_name: parsed.data.fullName, age: parsed.data.age, height_cm: parsed.data.heightCm,
    target_weight_kg: parsed.data.targetWeightKg, weekly_target_kg: parsed.data.weeklyTargetKg,
    activity_level: parsed.data.activityLevel, meal_preference: parsed.data.mealPreference,
    reminder_enabled: parsed.data.reminderEnabled, reminder_time: parsed.data.reminderTime,
    weekly_summary_enabled: parsed.data.weeklySummaryEnabled,
  }).select("user_id").single();
  if (updateResult.error) return { ok: false, message: getBackendErrorMessage(updateResult.error, "Profil belum dapat diperbarui.") };

  const hadAiConsent = Boolean(currentResult.data.ai_processing_consent_at)
    && currentResult.data.ai_processing_consent_version === "2026-08-14";
  const consentChanged = hadAiConsent !== parsed.data.aiProcessingConsent;
  if (consentChanged) {
    const consentResult = await client.functions.invoke("sehatin-program", { body: {
      action: "set-ai-consent", consent: parsed.data.aiProcessingConsent,
    } });
    if (consentResult.error) {
      return { ok: false, message: "Data profil tersimpan, tetapi pilihan personalisasi AI belum berhasil diperbarui. Coba simpan kembali." };
    }
  }

  const weightChanged = Number(currentResult.data.current_weight_kg) !== parsed.data.currentWeightKg;
  if (weightChanged) {
    const weightResult = await client.functions.invoke("sehatin-program", { body: {
      action: "record-weight", requestId: crypto.randomUUID(), weightKg: parsed.data.currentWeightKg,
      loggedOn: getDateInTimeZone(String(currentResult.data.time_zone)),
    } });
    if (weightResult.error) return { ok: false, message: "Data profil tersimpan, tetapi pencatatan berat terbaru belum berhasil. Coba simpan kembali." };
  }
  if (consentChanged && parsed.data.aiProcessingConsent && !weightChanged) {
    const generationResult = await client.functions.invoke("sehatin-program", { body: {
      action: "generate-plan", reason: "weight-update", requestId: crypto.randomUUID(),
    } });
    if (generationResult.error) {
      return { ok: false, message: "Pilihan AI tersimpan, tetapi rekomendasi terbaru belum berhasil disusun. Perubahan berikutnya akan mencoba lagi." };
    }
  }
  revalidatePath("/dashboard"); revalidatePath("/food"); revalidatePath("/workouts"); revalidatePath("/profile");
  return { ok: true, message: "Perubahan tersimpan dan digunakan untuk programmu." };
}

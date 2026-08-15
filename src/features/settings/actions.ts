"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createInsForgeServerClient } from "@/lib/insforge/server";
import { getBackendErrorMessage } from "@/lib/insforge/errors";
import { getDateInTimeZone } from "@/lib/sehatin/format";

const settingsSchema = z.object({
  fullName: z.string().trim().min(2).max(100), age: z.coerce.number().int().min(13).max(100),
  heightCm: z.coerce.number().min(100).max(250), currentWeightKg: z.coerce.number().min(30).max(300),
  targetWeightKg: z.coerce.number().min(30).max(300), weeklyTargetKg: z.coerce.number().min(0.5).max(1),
  activityLevel: z.enum(["pemula", "menengah", "aktif"]), mealPreference: z.enum(["seimbang", "tinggi-protein", "nabati"]),
  reminderEnabled: z.boolean(), reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), weeklySummaryEnabled: z.boolean(),
});

export type SettingsActionState = { ok?: boolean; message?: string };

export async function saveSettingsAction(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const parsed = settingsSchema.safeParse({
    fullName: formData.get("fullName"), age: formData.get("age"), heightCm: formData.get("heightCm"),
    currentWeightKg: formData.get("currentWeightKg"), targetWeightKg: formData.get("targetWeightKg"), weeklyTargetKg: formData.get("weeklyTargetKg"),
    activityLevel: formData.get("activityLevel"), mealPreference: formData.get("mealPreference"),
    reminderEnabled: formData.get("reminderEnabled") === "on", reminderTime: formData.get("reminderTime"), weeklySummaryEnabled: formData.get("weeklySummaryEnabled") === "on",
  });
  if (!parsed.success) return { ok: false, message: "Periksa kembali kolom yang ditandai." };

  const client = await createInsForgeServerClient();
  const currentResult = await client.database.from("profiles").select("current_weight_kg, time_zone").limit(1).single();
  if (currentResult.error) return { ok: false, message: getBackendErrorMessage(currentResult.error, "Profil belum dapat diperbarui.") };
  const updateResult = await client.database.from("profiles").update({
    full_name: parsed.data.fullName, age: parsed.data.age, height_cm: parsed.data.heightCm,
    target_weight_kg: parsed.data.targetWeightKg, weekly_target_kg: parsed.data.weeklyTargetKg,
    activity_level: parsed.data.activityLevel, meal_preference: parsed.data.mealPreference,
    reminder_enabled: parsed.data.reminderEnabled, reminder_time: parsed.data.reminderTime,
    weekly_summary_enabled: parsed.data.weeklySummaryEnabled,
  }).select("user_id").single();
  if (updateResult.error) return { ok: false, message: getBackendErrorMessage(updateResult.error, "Profil belum dapat diperbarui.") };

  if (Number(currentResult.data.current_weight_kg) !== parsed.data.currentWeightKg) {
    const weightResult = await client.functions.invoke("sehatin-program", { body: {
      action: "record-weight", requestId: crypto.randomUUID(), weightKg: parsed.data.currentWeightKg,
      loggedOn: getDateInTimeZone(String(currentResult.data.time_zone)),
    } });
    if (weightResult.error) return { ok: false, message: "Data profil tersimpan, tetapi pencatatan berat terbaru belum berhasil. Coba simpan kembali." };
  }
  revalidatePath("/dashboard"); revalidatePath("/food"); revalidatePath("/profile");
  return { ok: true, message: "Perubahan tersimpan dan digunakan untuk programmu." };
}

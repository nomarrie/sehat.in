import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { createInsForgeServerClient } from "@/lib/insforge/server";
import type { ProfileRow } from "@/lib/sehatin/database.types";

export const getOptionalAuthContext = cache(async function getOptionalAuthContext() {
  const client = await createInsForgeServerClient();
  const { data, error } = await client.auth.getCurrentUser();
  if (error || !data.user) return { client, user: null, profile: null };

  const profileResult = await client.database
    .from("profiles")
    .select("user_id, full_name, age, height_cm, initial_weight_kg, current_weight_kg, target_weight_kg, goal_direction, weekly_target_kg, activity_level, meal_preference, ai_processing_consent_at, ai_processing_consent_version, reminder_enabled, reminder_time, weekly_summary_enabled, time_zone, onboarding_completed_at")
    .eq("user_id", data.user.id)
    .maybeSingle();

  return {
    client,
    user: data.user,
    profile: profileResult.error ? null : profileResult.data as ProfileRow | null,
  };
});

export async function requireUser() {
  const context = await getOptionalAuthContext();
  if (!context.user) redirect("/login");
  return { ...context, user: context.user };
}

export async function requireOnboardedUser() {
  const context = await requireUser();
  if (!context.profile) redirect("/onboarding");
  return { ...context, profile: context.profile };
}

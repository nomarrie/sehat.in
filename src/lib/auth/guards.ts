import "server-only";

import { redirect } from "next/navigation";
import { createInsForgeServerClient } from "@/lib/insforge/server";

export async function getOptionalAuthContext() {
  const client = await createInsForgeServerClient();
  const { data, error } = await client.auth.getCurrentUser();
  if (error || !data.user) return { client, user: null, profile: null };

  const profileResult = await client.database
    .from("profiles")
    .select("user_id, full_name, onboarding_completed_at")
    .eq("user_id", data.user.id)
    .maybeSingle();

  return {
    client,
    user: data.user,
    profile: profileResult.error ? null : profileResult.data,
  };
}

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

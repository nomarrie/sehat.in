import "server-only";

import type { DashboardData } from "@/features/dashboard/dashboard.types";
import {
  createChatThread,
  formatChatThreadTimeLabel,
} from "@/features/chat/chat-history";
import type {
  ChatAdjustment,
  ChatMessage,
  ChatPageData,
} from "@/features/chat/chat.types";
import type { FoodRecommendation, FoodRecommendationContext } from "@/features/food/food.types";
import type { ProfileSettings } from "@/features/settings/settings.types";
import type { ExercisePackage } from "@/features/workouts/workout.types";
import { requireOnboardedUser } from "@/lib/auth/guards";
import type {
  ExercisePackageRow,
  ProfileRow,
  SubExerciseRow,
  WeeklyGoalRow,
  WeightLogRow,
} from "./database.types";
import { formatDateLabel, formatLongDate, getDateInTimeZone } from "./format";
import { mapExercisePackage, mapWeightLog } from "./mappers";
import { resolvePackageLookup } from "./package-route";

function assertNoError(error: unknown, context: string) {
  if (error) {
    const message = error && typeof error === "object" && "message" in error ? String(error.message) : context;
    throw new Error(`${context}: ${message}`);
  }
}

async function loadPackageWithClient(client: Awaited<ReturnType<typeof requireOnboardedUser>>["client"], packageId?: string) {
  const lookup = resolvePackageLookup(packageId);
  if (lookup.kind === "invalid") return null;

  let query = client.database
    .from("exercise_packages")
    .select("id, name, scheduled_for, generated_by_ai, difficulty_level, purpose, estimated_minutes")
    .eq("generation_status", "ready");
  query = lookup.kind === "id"
    ? query.eq("id", lookup.id)
    : query.eq("status", "active").order("scheduled_for", { ascending: true }).order("created_at", { ascending: false }).limit(1);
  const packageResult = await query.limit(1);
  assertNoError(packageResult.error, "Gagal memuat paket latihan");
  const row = (packageResult.data?.[0] ?? null) as ExercisePackageRow | null;
  if (!row) return null;

  const exerciseResult = await client.database
    .from("sub_exercises")
    .select("id, name, mode, sets, repetitions, duration_seconds, rest_seconds, order_index, instruction")
    .eq("package_id", row.id)
    .order("order_index", { ascending: true })
    .limit(50);
  assertNoError(exerciseResult.error, "Gagal memuat rangkaian latihan");
  return mapExercisePackage(row, (exerciseResult.data ?? []) as SubExerciseRow[]);
}

export async function loadExercisePackage(packageId: string): Promise<ExercisePackage | null> {
  const { client } = await requireOnboardedUser();
  return loadPackageWithClient(client, packageId);
}

export async function loadDashboardData(): Promise<DashboardData> {
  const { client, user } = await requireOnboardedUser();
  const profileResult = await client.database.from("profiles").select("*").eq("user_id", user.id).single();
  assertNoError(profileResult.error, "Gagal memuat profil");
  const profile = profileResult.data as ProfileRow;
  const today = getDateInTimeZone(profile.time_zone);

  const [logsResult, goalResult, streakResult, sessionsResult, badgeResult, notificationResult, workoutPackage] = await Promise.all([
    client.database.from("weight_logs").select("weight_kg, logged_on").order("logged_on", { ascending: true }).limit(52),
    client.database.from("weekly_goals").select("start_weight_kg, target_weight_kg, status").order("week_start", { ascending: false }).limit(1),
    client.database.from("streaks").select("current_streak, longest_streak").eq("user_id", user.id).maybeSingle(),
    client.database.from("exercise_sessions").select("active_duration_seconds").eq("activity_date", today).limit(50),
    client.database.from("user_badges").select("earned_at, badges(name, description)").order("earned_at", { ascending: false }).limit(1),
    client.database.from("notifications").select("title, message").order("created_at", { ascending: false }).limit(1),
    loadPackageWithClient(client),
  ]);
  [logsResult, goalResult, streakResult, sessionsResult, badgeResult, notificationResult].forEach((result, index) => assertNoError(result.error, `Gagal memuat data dashboard (${index + 1})`));

  const logs = (logsResult.data ?? []) as WeightLogRow[];
  const latestGoal = (goalResult.data?.[0] ?? null) as WeeklyGoalRow | null;
  const currentWeight = Number(profile.current_weight_kg);
  const latestBadge = badgeResult.data?.[0] as { earned_at: string; badges: { name: string; description: string } | Array<{ name: string; description: string }> | null } | undefined;
  const badge = Array.isArray(latestBadge?.badges) ? latestBadge.badges[0] : latestBadge?.badges;
  const latestNotification = notificationResult.data?.[0] as { title: string; message: string } | undefined;

  return {
    currentDate: today,
    currentDateLabel: formatLongDate(today),
    user: {
      name: profile.full_name,
      initialWeight: Number(profile.initial_weight_kg),
      currentWeight,
      targetWeight: Number(profile.target_weight_kg),
    },
    weeklyGoal: latestGoal
      ? { startWeight: Number(latestGoal.start_weight_kg), currentWeight, targetWeight: Number(latestGoal.target_weight_kg) }
      : { startWeight: currentWeight, currentWeight, targetWeight: Math.max(Number(profile.target_weight_kg), currentWeight - Number(profile.weekly_target_kg)) },
    weightLogs: logs.map(mapWeightLog),
    streak: {
      currentDays: Number(streakResult.data?.current_streak ?? 0),
      longestDays: Number(streakResult.data?.longest_streak ?? 0),
      activeMinutesToday: Math.floor((sessionsResult.data ?? []).reduce((sum, row) => sum + Number(row.active_duration_seconds), 0) / 60),
      dailyGoalMinutes: 30,
    },
    latestAchievement: badge && latestBadge
      ? { name: badge.name, description: badge.description, earnedLabel: `Diraih ${formatDateLabel(latestBadge.earned_at.slice(0, 10))}` }
      : null,
    notification: latestNotification ?? null,
    todayPackage: workoutPackage,
  };
}

export async function loadProfileSettings(): Promise<ProfileSettings> {
  const { client, user } = await requireOnboardedUser();
  const result = await client.database.from("profiles").select("*").eq("user_id", user.id).single();
  assertNoError(result.error, "Gagal memuat pengaturan profil");
  const profile = result.data as ProfileRow;
  return {
    fullName: profile.full_name,
    email: user.email ?? "",
    age: profile.age,
    heightCm: Number(profile.height_cm),
    currentWeightKg: Number(profile.current_weight_kg),
    targetWeightKg: Number(profile.target_weight_kg),
    weeklyTargetKg: Number(profile.weekly_target_kg),
    activityLevel: profile.activity_level,
    mealPreference: profile.meal_preference,
    aiProcessingConsent: Boolean(profile.ai_processing_consent_at)
      && profile.ai_processing_consent_version === "2026-08-14",
    reminderEnabled: profile.reminder_enabled,
    reminderTime: profile.reminder_time.slice(0, 5),
    weeklySummaryEnabled: profile.weekly_summary_enabled,
  };
}

export async function loadFoodRecommendations(): Promise<{ context: FoodRecommendationContext; recommendations: FoodRecommendation[] }> {
  const { client } = await requireOnboardedUser();
  const setResult = await client.database.from("nutrition_recommendation_sets")
    .select("id, based_on_weight_kg, generated_by_ai, created_at")
    .eq("generation_status", "ready").order("created_at", { ascending: false }).limit(1);
  assertNoError(setResult.error, "Gagal memuat dasar rekomendasi makanan");
  const set = setResult.data?.[0] as { id: string; based_on_weight_kg: string | number; generated_by_ai: boolean; created_at: string } | undefined;
  if (!set) return { context: { basedOnWeight: 0, updatedLabel: "Belum diperbarui", generatedByAi: false }, recommendations: [] };

  const mealsResult = await client.database.from("nutrition_recommendations").select("*")
    .eq("recommendation_set_id", set.id).order("order_index", { ascending: true }).limit(10);
  assertNoError(mealsResult.error, "Gagal memuat rekomendasi makanan");
  const mealIds = (mealsResult.data ?? []).map((meal) => meal.id as string);
  const [ingredientsResult, stepsResult] = mealIds.length
    ? await Promise.all([
        client.database.from("nutrition_ingredients").select("recommendation_id, amount, name, order_index").in("recommendation_id", mealIds).order("order_index", { ascending: true }).limit(200),
        client.database.from("nutrition_steps").select("recommendation_id, instruction, order_index").in("recommendation_id", mealIds).order("order_index", { ascending: true }).limit(200),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  assertNoError(ingredientsResult.error, "Gagal memuat bahan makanan");
  assertNoError(stepsResult.error, "Gagal memuat cara memasak");

  const recommendations = (mealsResult.data ?? []).map((meal): FoodRecommendation => ({
    id: String(meal.id),
    mealType: meal.meal_type as FoodRecommendation["mealType"],
    name: String(meal.name),
    description: String(meal.description),
    rationale: String(meal.rationale),
    prepMinutes: Number(meal.prep_minutes),
    servings: Number(meal.servings),
    nutrition: {
      calories: Number(meal.calories), proteinGrams: Number(meal.protein_grams), carbsGrams: Number(meal.carbs_grams),
      fatGrams: Number(meal.fat_grams), fiberGrams: Number(meal.fiber_grams),
    },
    ingredients: (ingredientsResult.data ?? []).filter((item) => item.recommendation_id === meal.id).map((item) => ({ amount: String(item.amount), name: String(item.name) })),
    cookingSteps: (stepsResult.data ?? []).filter((item) => item.recommendation_id === meal.id).map((item) => String(item.instruction)),
  }));

  return {
    context: {
      basedOnWeight: Number(set.based_on_weight_kg),
      updatedLabel: `Diperbarui ${formatDateLabel(set.created_at.slice(0, 10), { year: "numeric" })}`,
      generatedByAi: set.generated_by_ai,
    },
    recommendations,
  };
}

export async function loadFoodRecommendation(id: string) {
  const data = await loadFoodRecommendations();
  return data.recommendations.find((recommendation) => recommendation.id === id);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mapChatAdjustment(
  payload: unknown,
  status: unknown,
): ChatAdjustment | undefined {
  if (!isRecord(payload)) return undefined;
  const rows = Array.isArray(payload.rows)
    ? payload.rows.flatMap((row) => isRecord(row)
      && typeof row.label === "string"
      && typeof row.before === "string"
      && typeof row.after === "string"
      ? [{ label: row.label, before: row.before, after: row.after }]
      : [])
    : Array.isArray(payload.changes)
      ? payload.changes.flatMap((change) => typeof change === "string"
        ? [{ label: "Penyesuaian", before: "Paket saat ini", after: change }]
        : [])
      : [];
  if (
    typeof payload.title !== "string"
    || typeof payload.description !== "string"
    || rows.length === 0
  ) {
    return undefined;
  }

  return {
    target: payload.target === "food" ? "food" : "workout",
    title: payload.title,
    description: payload.description,
    rows,
    status: status === "applied" || status === "declined" ? status : "pending",
  };
}

export async function loadChatPageData(): Promise<ChatPageData> {
  const { client, user } = await requireOnboardedUser();
  const profileResult = await client.database
    .from("profiles")
    .select("full_name, current_weight_kg, time_zone")
    .eq("user_id", user.id)
    .single();
  assertNoError(profileResult.error, "Gagal memuat konteks chat");
  const profile = profileResult.data as {
    full_name: string;
    current_weight_kg: string | number;
    time_zone: string;
  };
  const today = getDateInTimeZone(profile.time_zone);

  const [logsResult, streakResult, sessionsResult, workoutPackage, sessionResult] = await Promise.all([
    client.database
      .from("weight_logs")
      .select("weight_kg, logged_on")
      .order("logged_on", { ascending: false })
      .limit(2),
    client.database
      .from("streaks")
      .select("current_streak")
      .eq("user_id", user.id)
      .maybeSingle(),
    client.database
      .from("exercise_sessions")
      .select("active_duration_seconds")
      .eq("activity_date", today)
      .limit(50),
    loadPackageWithClient(client),
    client.database
      .from("chat_sessions")
      .select("id, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);
  [logsResult, streakResult, sessionsResult, sessionResult].forEach((result, index) => {
    assertNoError(result.error, `Gagal memuat konteks chat (${index + 1})`);
  });

  const sessionRows = (sessionResult.data ?? []) as Array<{
    id: string;
    updated_at: string;
  }>;
  const timeFormatter = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: profile.time_zone,
  });
  const messageResults = await Promise.all(sessionRows.map((session) => (
    client.database
      .from("chat_messages")
      .select("id, role, content, kind, generated_by_ai, adjustment_payload, adjustment_status, created_at")
      .eq("user_id", user.id)
      .eq("session_id", session.id)
      .order("created_at", { ascending: false })
      .limit(100)
  )));

  messageResults.forEach((result, index) => {
    assertNoError(result.error, `Gagal memuat riwayat chat (${index + 1})`);
  });

  const threads = sessionRows.map((session, index) => {
    const rows = [...(messageResults[index]?.data ?? [])].reverse();
    const threadMessages = rows.flatMap((row): ChatMessage[] => {
      if (row.role !== "assistant" && row.role !== "user") return [];
      const kind = row.kind === "adjustment" ? "adjustment" : "message";
      return [{
        id: String(row.id),
        role: row.role,
        content: String(row.content),
        timeLabel: timeFormatter.format(new Date(String(row.created_at))),
        kind,
        generatedByAi: Boolean(row.generated_by_ai),
        adjustment: kind === "adjustment"
          ? mapChatAdjustment(row.adjustment_payload, row.adjustment_status)
          : undefined,
      }];
    });

    return createChatThread({
      id: String(session.id),
      messages: threadMessages,
      timeLabel: formatChatThreadTimeLabel(
        String(session.updated_at),
        profile.time_zone,
      ),
    });
  });
  const sessionId = threads[0]?.id ?? null;
  let messages: ChatMessage[] = threads[0]?.messages ?? [];

  if (messages.length === 0) {
    const firstName = profile.full_name.trim().split(/\s+/)[0] || "teman";
    messages = [{
      id: "assistant-welcome",
      role: "assistant",
      content: `Halo, ${firstName}. Aku sudah melihat konteks program terbarumu. Mau membahas latihan, makanan, atau progresmu?`,
      timeLabel: "Sekarang",
      kind: "message",
      generatedByAi: false,
    }];
  }

  const logs = logsResult.data ?? [];
  const currentWeight = Number(profile.current_weight_kg);
  const previousWeight = logs[1] ? Number(logs[1].weight_kg) : null;
  const change = previousWeight === null ? null : previousWeight - currentWeight;
  const weightDetail = change === null
    ? "Catatan terbaru programmu"
    : change > 0
      ? `Turun ${change.toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg dari catatan sebelumnya`
      : change < 0
        ? `Berubah ${Math.abs(change).toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg dari catatan sebelumnya`
        : "Stabil dari catatan sebelumnya";
  const activeMinutes = Math.floor((sessionsResult.data ?? []).reduce(
    (total, row) => total + Number(row.active_duration_seconds),
    0,
  ) / 60);

  return {
    sessionId,
    threads,
    context: [
      {
        id: "weight",
        label: "Berat saat ini",
        value: `${currentWeight.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`,
        detail: weightDetail,
      },
      {
        id: "streak",
        label: "Streak aktif",
        value: `${Number(streakResult.data?.current_streak ?? 0)} hari`,
        detail: `${activeMinutes} dari 30 menit hari ini`,
      },
      {
        id: "workout",
        label: "Paket aktif",
        value: workoutPackage?.name ?? "Belum ada paket aktif",
        detail: workoutPackage
          ? `${workoutPackage.difficulty} · sekitar ${workoutPackage.estimatedMinutes} menit`
          : "Program berikutnya akan muncul di sini",
      },
    ],
    messages,
  };
}

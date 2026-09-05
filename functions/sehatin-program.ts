import { createAdminClient, createClient } from "npm:@insforge/sdk@1.5.2";
import { z } from "npm:zod@4.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const defaultPrimaryModel = "qwen/qwen3.8-27b";
const defaultSecondaryModel = "openai/gpt-oss-120b";
const groqChatCompletionsUrl = "https://api.groq.com/openai/v1/chat/completions";
const modelTimeoutMs = 25_000;
const qwenOnDemandMaxCompletionTokens = 1_000;
const AI_CONSENT_VERSION = "2026-08-14";

const exerciseSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    mode: z.enum(["timed", "repetitions"]),
    sets: z.number().int().min(1).max(10),
    repetitions: z.number().int().min(1).max(100).nullable(),
    durationSeconds: z.number().int().min(10).max(3600).nullable(),
    restSeconds: z.number().int().min(0).max(600),
    instruction: z.string().trim().min(5).max(500),
  })
  .refine(
    (value) =>
      (value.mode === "timed" && value.durationSeconds !== null && value.repetitions === null) ||
      (value.mode === "repetitions" && value.repetitions !== null && value.durationSeconds === null),
    "Exercise target does not match its mode",
  );

const mealSchema = z.object({
  mealType: z.enum(["Sarapan", "Makan siang", "Camilan", "Makan malam"]),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(500),
  rationale: z.string().trim().min(10).max(500),
  prepMinutes: z.number().int().min(1).max(240),
  servings: z.number().int().min(1).max(20),
  nutrition: z.object({
    calories: z.number().int().min(50).max(2000),
    proteinGrams: z.number().min(0).max(300),
    carbsGrams: z.number().min(0).max(500),
    fatGrams: z.number().min(0).max(200),
    fiberGrams: z.number().min(0).max(100),
  }),
  ingredients: z.array(z.object({ amount: z.string().min(1).max(80), name: z.string().min(1).max(160) })).min(2).max(20),
  cookingSteps: z.array(z.string().min(5).max(1000)).min(2).max(20),
});

const workoutSchema = z.object({
  name: z.string().trim().min(2).max(120),
  difficulty: z.enum(["pemula", "menengah"]),
  purpose: z.string().trim().min(10).max(500),
  estimatedMinutes: z.number().int().min(5).max(120),
  exercises: z.array(exerciseSchema).min(3).max(10),
});

const generatedPlanSchema = z.object({
  workout: workoutSchema,
  meals: z.array(mealSchema).length(4),
});

const chatReplySchema = z.object({
  answer: z.string().trim().min(1).max(3000),
  adjustment: z.object({
    target: z.enum(["workout", "food"]),
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().min(10).max(500),
    rows: z.array(z.object({
      label: z.string().trim().min(1).max(120),
      before: z.string().trim().min(1).max(300),
      after: z.string().trim().min(1).max(300),
    })).min(1).max(10),
    workout: workoutSchema.nullable(),
    meal: mealSchema.nullable(),
  }).nullable(),
});

const resultItemSchema = z.object({
  subExerciseId: z.string().uuid(),
  completedSets: z.number().int().min(0).max(10),
  completedRepetitions: z.number().int().min(0).max(1000).nullable().optional(),
  activeDurationSeconds: z.number().int().min(0).max(14400),
  completed: z.boolean(),
});

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("complete-onboarding"),
    fullName: z.string().trim().min(2).max(100),
    age: z.number().int().min(13).max(100),
    heightCm: z.number().min(100).max(250),
    initialWeightKg: z.number().min(30).max(300),
    targetWeightKg: z.number().min(30).max(300),
    weeklyTargetKg: z.number().min(0.5).max(1),
    activityLevel: z.enum(["pemula", "menengah", "aktif"]),
    mealPreference: z.enum(["seimbang", "tinggi-protein", "nabati"]),
    reminderEnabled: z.boolean().default(true),
    reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("18:30"),
    weeklySummaryEnabled: z.boolean().default(true),
    timeZone: z.string().min(1).max(100).default("Asia/Makassar"),
    aiProcessingConsent: z.boolean().default(false),
    requestId: z.string().uuid().optional(),
  }).refine((value) => value.targetWeightKg < value.initialWeightKg, {
    path: ["targetWeightKg"],
    message: "Target weight must be lower than the starting weight",
  }),
  z.object({
    action: z.literal("generate-plan"),
    reason: z.enum(["onboarding", "weight-update"]),
    requestId: z.string().uuid().optional(),
  }),
  z.object({
    action: z.literal("ensure-daily-plan"),
  }),
  z.object({
    action: z.literal("record-weight"),
    weightKg: z.number().min(30).max(300),
    loggedOn: z.string().date(),
    requestId: z.string().uuid().optional(),
  }),
  z.object({
    action: z.literal("set-ai-consent"),
    consent: z.boolean(),
  }),
  z.object({
    action: z.literal("complete-workout"),
    packageId: z.string().uuid(),
    clientCompletionId: z.string().uuid(),
    activeDurationSeconds: z.number().int().min(0).max(86400),
    startedAt: z.string().datetime().nullable(),
    completedAt: z.string().datetime(),
    results: z.array(resultItemSchema).max(50).default([]),
  }),
  z.object({
    action: z.literal("chat-message"),
    sessionId: z.string().uuid().nullable(),
    clientMessageId: z.string().uuid(),
    content: z.string().trim().min(1).max(500),
  }),
  z.object({
    action: z.literal("resolve-chat-adjustment"),
    messageId: z.string().uuid(),
    decision: z.enum(["apply", "decline"]),
  }),
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeProgramRequestBody(value: unknown): unknown {
  let candidate = value;

  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof candidate === "string") {
      try {
        candidate = JSON.parse(candidate);
        continue;
      } catch {
        break;
      }
    }
    if (isRecord(candidate) && typeof candidate.action !== "string" && "body" in candidate) {
      candidate = candidate.body;
      continue;
    }
    break;
  }

  if (isRecord(candidate) && candidate.action === "set-ai-consent" && typeof candidate.consent === "string") {
    const consent = candidate.consent.trim().toLocaleLowerCase("en-US");
    if (["true", "on", "1"].includes(consent)) return { ...candidate, consent: true };
    if (["false", "off", "0", ""].includes(consent)) return { ...candidate, consent: false };
  }

  return candidate;
}

function invalidRequestLogDetails(
  rawBody: unknown,
  normalizedBody: unknown,
  issues: z.core.$ZodIssue[],
  requestId: string,
) {
  return {
    requestId,
    rawType: Array.isArray(rawBody) ? "array" : typeof rawBody,
    normalizedKeys: isRecord(normalizedBody) ? Object.keys(normalizedBody).slice(0, 20) : [],
    actionType: isRecord(normalizedBody) ? typeof normalizedBody.action : "missing",
    consentType: isRecord(normalizedBody) ? typeof normalizedBody.consent : "missing",
    issues: issues.slice(0, 10).map((issue) => ({ code: issue.code, path: issue.path })),
  };
}

type GeneratedPlan = z.infer<typeof generatedPlanSchema>;
type ChatReply = z.infer<typeof chatReplySchema>;
type GenerationReason = "onboarding" | "weight-update" | "workout-complete" | "daily-refresh";

export type UserContext = {
  profile: Record<string, unknown>;
  weightLogs: Array<Record<string, unknown>>;
  weeklyGoals: Array<Record<string, unknown>>;
  latestPackage: Record<string, unknown> | null;
  latestExercises: Array<Record<string, unknown>>;
  latestMeals?: Array<{ mealType: string; name: string }>;
  latestWorkoutResult: {
    activeDurationSeconds: number;
    completedAt: string;
    exercises: Array<{
      subExerciseId: string;
      completedSets: number;
      completedRepetitions: number | null;
      activeDurationSeconds: number;
      completed: boolean;
    }>;
  } | null;
};

type ChatContext = {
  profile: Record<string, unknown>;
  weightLogs: Array<Record<string, unknown>>;
  weeklyGoal: Record<string, unknown> | null;
  streak: Record<string, unknown> | null;
  activePackage: Record<string, unknown> | null;
  activeExercises: Array<Record<string, unknown>>;
  activeRecommendationSet: Record<string, unknown> | null;
  activeMeals: GeneratedPlan["meals"];
};

type ModelSuccess<T> = {
  ok: true;
  data: T;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
};

type ModelResult<T> = ModelSuccess<T> | {
  ok: false;
  code: string;
  model: string;
};

type AiClaim = {
  allowed: boolean;
  duplicate: boolean;
  reason: string | null;
  requestId?: string;
};

class RequestRejectedError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function redactSensitiveText(value: string) {
  return value
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "[UUID]")
    .replace(/((?:api[_-]?key|token|authorization)\s*[:=]\s*)\S+/gi, "$1[REDACTED]")
    .slice(0, 600);
}

function errorLogDetails(error: unknown, requestId: string, action: string) {
  const record = error && typeof error === "object" ? error as Record<string, unknown> : null;
  return {
    requestId,
    action,
    name: error instanceof Error ? error.name : "UnknownError",
    code: typeof record?.code === "string" ? record.code.slice(0, 80) : undefined,
    message: redactSensitiveText(error instanceof Error ? error.message : String(error)),
  };
}

function hasCurrentAiConsent(profile: Record<string, unknown>) {
  return Boolean(profile.ai_processing_consent_at)
    && profile.ai_processing_consent_version === AI_CONSENT_VERSION;
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function isoDateInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function loadContext(admin: ReturnType<typeof createAdminClient>, userId: string): Promise<UserContext> {
  const [profileResult, logsResult, goalsResult, packagesResult, sessionResult, recommendationSetResult] = await Promise.all([
    admin.database.from("profiles").select("user_id, current_weight_kg, target_weight_kg, weekly_target_kg, activity_level, meal_preference, time_zone, ai_processing_consent_at, ai_processing_consent_version").eq("user_id", userId).maybeSingle(),
    admin.database.from("weight_logs").select("weight_kg, logged_on").eq("user_id", userId).order("logged_on", { ascending: false }).limit(12),
    admin.database.from("weekly_goals").select("week_start, start_weight_kg, target_weight_kg, planned_loss_kg, status").eq("user_id", userId).order("week_start", { ascending: false }).limit(4),
    admin.database.from("exercise_packages").select("id, name, difficulty_level, purpose, estimated_minutes, scheduled_for, status").eq("user_id", userId).order("scheduled_for", { ascending: false }).order("created_at", { ascending: false }).limit(1),
    admin.database.from("exercise_sessions").select("id, active_duration_seconds, completed_at").eq("user_id", userId).order("completed_at", { ascending: false }).limit(1),
    admin.database.from("nutrition_recommendation_sets").select("id").eq("user_id", userId).eq("generation_status", "ready").order("scheduled_for", { ascending: false }).order("created_at", { ascending: false }).limit(1),
  ]);

  const firstError = profileResult.error ?? logsResult.error ?? goalsResult.error
    ?? packagesResult.error ?? sessionResult.error ?? recommendationSetResult.error;
  if (firstError) throw firstError;
  if (!profileResult.data) throw new Error("Onboarding is required before generating a program.");

  const latestPackage = packagesResult.data?.[0] ?? null;
  let latestExercises: Array<Record<string, unknown>> = [];
  if (latestPackage?.id) {
    const exerciseResult = await admin.database
      .from("sub_exercises")
      .select("id, name, mode, sets, repetitions, duration_seconds, rest_seconds, order_index, instruction")
      .eq("package_id", latestPackage.id)
      .order("order_index", { ascending: true })
      .limit(20);
    if (exerciseResult.error) throw exerciseResult.error;
    latestExercises = exerciseResult.data ?? [];
  }

  const latestRecommendationSet = recommendationSetResult.data?.[0] ?? null;
  let latestMeals: Array<{ mealType: string; name: string }> = [];
  if (latestRecommendationSet?.id) {
    const mealResult = await admin.database.from("nutrition_recommendations")
      .select("meal_type, name")
      .eq("recommendation_set_id", latestRecommendationSet.id)
      .eq("user_id", userId)
      .order("order_index", { ascending: true })
      .limit(10);
    if (mealResult.error) throw mealResult.error;
    latestMeals = (mealResult.data ?? []).map((meal) => ({
      mealType: String(meal.meal_type),
      name: String(meal.name),
    }));
  }

  const latestSession = sessionResult.data?.[0] ?? null;
  let latestWorkoutResult: UserContext["latestWorkoutResult"] = null;
  if (latestSession?.id) {
    const itemResult = await admin.database.from("exercise_session_items")
      .select("sub_exercise_id, completed_sets, completed_repetitions, active_duration_seconds, completed")
      .eq("session_id", latestSession.id)
      .eq("user_id", userId)
      .limit(50);
    if (itemResult.error) throw itemResult.error;
    latestWorkoutResult = {
      activeDurationSeconds: Number(latestSession.active_duration_seconds),
      completedAt: String(latestSession.completed_at),
      exercises: (itemResult.data ?? []).map((item) => ({
        subExerciseId: String(item.sub_exercise_id),
        completedSets: Number(item.completed_sets),
        completedRepetitions: item.completed_repetitions === null
          ? null
          : Number(item.completed_repetitions),
        activeDurationSeconds: Number(item.active_duration_seconds),
        completed: Boolean(item.completed),
      })),
    };
  }

  return {
    profile: profileResult.data,
    weightLogs: logsResult.data ?? [],
    weeklyGoals: goalsResult.data ?? [],
    latestPackage,
    latestExercises,
    latestMeals,
    latestWorkoutResult,
  };
}

async function loadChatContext(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<ChatContext> {
  const profileResult = await admin.database.from("profiles")
    .select("current_weight_kg, target_weight_kg, weekly_target_kg, meal_preference, time_zone, ai_processing_consent_at, ai_processing_consent_version")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileResult.error) throw profileResult.error;
  if (!profileResult.data) throw new Error("Onboarding is required before chat.");
  const today = isoDateInTimeZone(
    new Date(),
    String(profileResult.data.time_zone ?? "Asia/Makassar"),
  );

  const [logsResult, goalResult, streakResult, packageResult, recommendationSetResult] = await Promise.all([
    admin.database.from("weight_logs")
      .select("weight_kg, logged_on")
      .eq("user_id", userId)
      .order("logged_on", { ascending: false })
      .limit(3),
    admin.database.from("weekly_goals")
      .select("target_weight_kg, planned_loss_kg, status, week_start")
      .eq("user_id", userId)
      .order("week_start", { ascending: false })
      .limit(1),
    admin.database.from("streaks")
      .select("current_streak, longest_streak, last_active_date")
      .eq("user_id", userId)
      .maybeSingle(),
    admin.database.from("exercise_packages")
      .select("id, name, difficulty_level, purpose, estimated_minutes, scheduled_for")
      .eq("user_id", userId)
      .eq("status", "active")
      .eq("generation_status", "ready")
      .eq("scheduled_for", today)
      .order("created_at", { ascending: false })
      .limit(1),
    admin.database.from("nutrition_recommendation_sets")
      .select("id, based_on_weight_kg, generated_by_ai, scheduled_for, created_at")
      .eq("user_id", userId)
      .eq("generation_status", "ready")
      .eq("scheduled_for", today)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  const firstError = logsResult.error ?? goalResult.error
    ?? streakResult.error ?? packageResult.error ?? recommendationSetResult.error;
  if (firstError) throw firstError;

  const activePackage = packageResult.data?.[0] ?? null;
  const activeRecommendationSet = recommendationSetResult.data?.[0] ?? null;
  let activeExercises: Array<Record<string, unknown>> = [];
  let activeMeals: GeneratedPlan["meals"] = [];
  if (activePackage?.id) {
    const exerciseResult = await admin.database.from("sub_exercises")
      .select("name, mode, sets, repetitions, duration_seconds, rest_seconds, order_index, instruction")
      .eq("package_id", activePackage.id)
      .eq("user_id", userId)
      .order("order_index", { ascending: true })
      .limit(20);
    if (exerciseResult.error) throw exerciseResult.error;
    activeExercises = exerciseResult.data ?? [];
  }

  if (activeRecommendationSet?.id) {
    const mealResult = await admin.database.from("nutrition_recommendations")
      .select("id, meal_type, name, description, rationale, prep_minutes, servings, calories, protein_grams, carbs_grams, fat_grams, fiber_grams, order_index")
      .eq("recommendation_set_id", activeRecommendationSet.id)
      .eq("user_id", userId)
      .order("order_index", { ascending: true })
      .limit(10);
    if (mealResult.error) throw mealResult.error;
    const mealRows = mealResult.data ?? [];
    const mealIds = mealRows.map((meal) => String(meal.id));
    const [ingredientResult, stepResult] = mealIds.length
      ? await Promise.all([
          admin.database.from("nutrition_ingredients")
            .select("recommendation_id, amount, name, order_index")
            .in("recommendation_id", mealIds)
            .order("order_index", { ascending: true })
            .limit(200),
          admin.database.from("nutrition_steps")
            .select("recommendation_id, instruction, order_index")
            .in("recommendation_id", mealIds)
            .order("order_index", { ascending: true })
            .limit(200),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];
    if (ingredientResult.error || stepResult.error) throw ingredientResult.error ?? stepResult.error;
    activeMeals = mealRows.flatMap((meal) => {
      const parsed = mealSchema.safeParse({
        mealType: meal.meal_type,
        name: meal.name,
        description: meal.description,
        rationale: meal.rationale,
        prepMinutes: Number(meal.prep_minutes),
        servings: Number(meal.servings),
        nutrition: {
          calories: Number(meal.calories),
          proteinGrams: Number(meal.protein_grams),
          carbsGrams: Number(meal.carbs_grams),
          fatGrams: Number(meal.fat_grams),
          fiberGrams: Number(meal.fiber_grams),
        },
        ingredients: (ingredientResult.data ?? [])
          .filter((item) => item.recommendation_id === meal.id)
          .map((item) => ({ amount: String(item.amount), name: String(item.name) })),
        cookingSteps: (stepResult.data ?? [])
          .filter((item) => item.recommendation_id === meal.id)
          .map((item) => String(item.instruction)),
      });
      return parsed.success ? [parsed.data] : [];
    });
  }

  return {
    profile: profileResult.data,
    weightLogs: logsResult.data ?? [],
    weeklyGoal: goalResult.data?.[0] ?? null,
    streak: streakResult.data ?? null,
    activePackage,
    activeExercises,
    activeRecommendationSet,
    activeMeals,
  };
}

function getGroqModels() {
  return {
    primary: Deno.env.get("GROQ_PRIMARY_MODEL") ?? defaultPrimaryModel,
    secondary: Deno.env.get("GROQ_SECONDARY_MODEL") ?? defaultSecondaryModel,
  };
}

export async function callGroqModel<T>(
  parser: z.ZodType<T>,
  schemaName: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  maxCompletionTokens: number,
  apiKey: string,
  model: string,
): Promise<ModelResult<T>> {
  try {
    const aiResponse = await fetch(groqChatCompletionsUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(modelTimeoutMs),
      body: JSON.stringify({
        model,
        messages,
        max_completion_tokens: model === defaultPrimaryModel
          ? Math.min(maxCompletionTokens, qwenOnDemandMaxCompletionTokens)
          : maxCompletionTokens,
        reasoning_effort: "low",
        response_format: {
          type: "json_schema",
          json_schema: {
            name: schemaName,
            strict: true,
            schema: z.toJSONSchema(parser, { target: "draft-7" }),
          },
        },
      }),
    });
    if (!aiResponse.ok) {
      return { ok: false, code: `groq_http_${aiResponse.status}`, model };
    }
    const payload = await aiResponse.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return { ok: false, code: "groq_empty_response", model };
    }

    const parsed = parser.safeParse(JSON.parse(content));
    if (!parsed.success) return { ok: false, code: "groq_invalid_response", model };
    return {
      ok: true,
      data: parsed.data,
      model: typeof payload.model === "string" ? payload.model : model,
      promptTokens: Number.isFinite(payload?.usage?.prompt_tokens)
        ? Number(payload.usage.prompt_tokens)
        : null,
      completionTokens: Number.isFinite(payload?.usage?.completion_tokens)
        ? Number(payload.usage.completion_tokens)
        : null,
    };
  } catch (error) {
    const code = error instanceof DOMException && error.name === "TimeoutError"
      ? "groq_timeout"
      : "groq_request_failed";
    return { ok: false, code, model };
  }
}

async function callGroq<T>(
  parser: z.ZodType<T>,
  schemaName: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  maxCompletionTokens: number,
  modelPreference: "primary" | "secondary" = "primary",
): Promise<ModelResult<T>> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  const { primary, secondary } = getGroqModels();
  const primaryModel = modelPreference === "secondary" ? secondary : primary;
  const secondaryModel = modelPreference === "secondary" ? primary : secondary;
  if (!apiKey) return { ok: false, code: "groq_unconfigured", model: primaryModel };

  const primaryResult = await callGroqModel(
    parser,
    schemaName,
    messages,
    maxCompletionTokens,
    apiKey,
    primaryModel,
  );
  if (primaryResult.ok || secondaryModel === primaryModel) return primaryResult;

  console.warn("Groq primary model failed; trying secondary", {
    model: primaryModel,
    code: primaryResult.code,
  });
  const secondaryResult = await callGroqModel(
    parser,
    schemaName,
    messages,
    maxCompletionTokens,
    apiKey,
    secondaryModel,
  );
  if (secondaryResult.ok) return secondaryResult;

  return {
    ok: false,
    code: `groq_fallback_exhausted:${primaryResult.code}:${secondaryResult.code}`,
    model: secondaryModel,
  };
}

async function claimAiRequest(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  feature: "chat" | "program",
  clientRequestId: string,
): Promise<AiClaim> {
  const result = await admin.database.rpc("edge_claim_ai_request", {
    p_user_id: userId,
    p_feature: feature,
    p_client_request_id: clientRequestId,
    p_daily_limit: feature === "chat" ? 40 : 6,
    p_cooldown_seconds: feature === "chat" ? 2 : 45,
  });
  if (result.error) throw result.error;
  return result.data as AiClaim;
}

async function finishAiRequest(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  requestId: string,
  values: { status: "succeeded" | "failed"; model?: string; usedAi?: boolean; failureCode?: string },
) {
  const result = await admin.database.rpc("edge_finish_ai_request", {
    p_user_id: userId,
    p_request_id: requestId,
    p_status: values.status,
    p_model: values.model ?? null,
    p_used_ai: values.usedAi ?? false,
    p_failure_code: values.failureCode ?? null,
  });
  if (result.error) console.error("Failed to finish AI request", result.error);
}

export function dailyPlanRotation(planDate: string, rotationCount = 3) {
  const dayNumber = Math.floor(
    new Date(`${planDate}T12:00:00Z`).getTime() / 86_400_000,
  );
  return ((dayNumber % rotationCount) + rotationCount) % rotationCount;
}

function alternativeFallbackMeals(
  preference: unknown,
  rotation: number,
): GeneratedPlan["meals"] | null {
  if (rotation === 1) {
    const breakfastProtein = preference === "nabati" ? "tahu hancur" : "telur";
    const lunchProtein = preference === "nabati" ? "tempe panggang" : "ikan kembung panggang";
    return [
      {
        mealType: "Sarapan",
        name: preference === "nabati" ? "Tahu Orak-Arik Sayur dan Roti Gandum" : "Telur Orak-Arik Sayur dan Roti Gandum",
        description: "Sarapan gurih dengan sayuran berwarna dan roti gandum yang mudah disiapkan.",
        rationale: "Protein dan serat membantu membangun porsi sarapan yang terasa cukup tanpa persiapan panjang.",
        prepMinutes: 15,
        servings: 1,
        nutrition: { calories: 410, proteinGrams: 24, carbsGrams: 43, fatGrams: 16, fiberGrams: 8 },
        ingredients: [
          { amount: preference === "nabati" ? "150 g" : "2 butir", name: breakfastProtein },
          { amount: "2 lembar", name: "roti gandum" },
          { amount: "1 mangkuk kecil", name: "bayam, tomat, dan paprika" },
          { amount: "1 sdt", name: "minyak kanola" },
        ],
        cookingSteps: ["Tumis sayuran sebentar dengan minyak hingga sedikit layu.", `Masukkan ${breakfastProtein}, masak hingga matang, lalu sajikan bersama roti gandum.`],
      },
      {
        mealType: "Makan siang",
        name: preference === "nabati" ? "Nasi Jagung Tempe Kunyit" : "Nasi Jagung Ikan Kunyit",
        description: "Makan siang bercita rasa kunyit dengan nasi jagung dan lalapan segar.",
        rationale: "Sumber protein, karbohidrat, dan sayuran disusun dalam satu porsi yang praktis.",
        prepMinutes: 30,
        servings: 1,
        nutrition: { calories: 570, proteinGrams: preference === "nabati" ? 29 : 39, carbsGrams: 66, fatGrams: 17, fiberGrams: 9 },
        ingredients: [
          { amount: "120 g", name: lunchProtein },
          { amount: "150 g", name: "nasi jagung matang" },
          { amount: "1 mangkuk", name: "timun, kemangi, dan tomat" },
          { amount: "secukupnya", name: "kunyit, bawang putih, dan jeruk nipis" },
        ],
        cookingSteps: ["Lumuri lauk dengan kunyit, bawang putih, dan jeruk nipis.", "Panggang hingga matang lalu sajikan bersama nasi jagung dan lalapan."],
      },
      {
        mealType: "Camilan",
        name: "Apel, Yogurt Tawar, dan Biji Bunga Matahari",
        description: "Camilan segar dengan rasa manis alami dan tekstur renyah.",
        rationale: "Buah, protein, dan lemak dalam porsi kecil cocok untuk jeda antarwaktu makan.",
        prepMinutes: 5,
        servings: 1,
        nutrition: { calories: 230, proteinGrams: 12, carbsGrams: 31, fatGrams: 8, fiberGrams: 6 },
        ingredients: [
          { amount: "1 buah kecil", name: "apel, iris" },
          { amount: "150 g", name: preference === "nabati" ? "yogurt kedelai tawar" : "yogurt tawar" },
          { amount: "1 sdm", name: "biji bunga matahari" },
        ],
        cookingSteps: ["Masukkan yogurt ke mangkuk.", "Tambahkan irisan apel dan biji bunga matahari sebelum dinikmati."],
      },
      {
        mealType: "Makan malam",
        name: "Tumis Tahu Jamur dan Nasi Merah",
        description: "Makan malam hangat dengan tumisan tahu, jamur, dan sayuran hijau.",
        rationale: "Porsi ini menawarkan protein nabati dan sayuran dengan bumbu sederhana.",
        prepMinutes: 22,
        servings: 1,
        nutrition: { calories: 475, proteinGrams: 28, carbsGrams: 56, fatGrams: 17, fiberGrams: 10 },
        ingredients: [
          { amount: "150 g", name: "tahu putih" },
          { amount: "100 g", name: "jamur tiram" },
          { amount: "120 g", name: "nasi merah matang" },
          { amount: "1 mangkuk", name: "sawi hijau dan wortel" },
        ],
        cookingSteps: ["Tumis tahu dan jamur hingga permukaannya keemasan.", "Tambahkan sayuran dan sedikit air, masak hingga matang, lalu sajikan bersama nasi merah."],
      },
    ];
  }

  if (rotation === 2) {
    const dinnerProtein = preference === "nabati" ? "tahu dan kacang merah" : "ayam tanpa kulit";
    return [
      {
        mealType: "Sarapan",
        name: "Bubur Kacang Hijau Ringan",
        description: "Bubur hangat dengan kacang hijau, oat, dan rasa manis ringan.",
        rationale: "Kacang hijau dan oat menyumbang serat serta protein untuk memulai hari.",
        prepMinutes: 25,
        servings: 1,
        nutrition: { calories: 400, proteinGrams: 19, carbsGrams: 64, fatGrams: 9, fiberGrams: 11 },
        ingredients: [
          { amount: "60 g", name: "kacang hijau rebus" },
          { amount: "30 g", name: "oat utuh" },
          { amount: "200 ml", name: "susu rendah lemak atau susu kedelai" },
          { amount: "1/2 buah", name: "pisang, lumatkan" },
        ],
        cookingSteps: ["Masak kacang hijau, oat, dan susu dengan api kecil hingga mengental.", "Aduk pisang lumat sebagai pemanis alami lalu sajikan hangat."],
      },
      {
        mealType: "Makan siang",
        name: "Gado-Gado Tempe dengan Kentang",
        description: "Sayuran rebus, tempe, dan kentang dengan saus kacang dalam porsi terukur.",
        rationale: "Beragam sayuran dipadukan dengan protein tempe untuk makan siang yang lengkap.",
        prepMinutes: 28,
        servings: 1,
        nutrition: { calories: 550, proteinGrams: 30, carbsGrams: 58, fatGrams: 22, fiberGrams: 12 },
        ingredients: [
          { amount: "120 g", name: "tempe panggang" },
          { amount: "120 g", name: "kentang rebus" },
          { amount: "2 mangkuk", name: "kol, tauge, kacang panjang, dan timun" },
          { amount: "2 sdm", name: "saus kacang encer" },
        ],
        cookingSteps: ["Rebus sayuran hingga matang tetapi tetap renyah.", "Susun bersama kentang dan tempe, lalu tuangkan saus kacang sebelum disajikan."],
      },
      {
        mealType: "Camilan",
        name: "Edamame dan Jeruk",
        description: "Camilan sederhana yang gurih, segar, dan mudah dibawa.",
        rationale: "Edamame memberi protein sementara jeruk menambah buah dalam porsi harian.",
        prepMinutes: 8,
        servings: 1,
        nutrition: { calories: 210, proteinGrams: 13, carbsGrams: 27, fatGrams: 7, fiberGrams: 8 },
        ingredients: [
          { amount: "100 g", name: "edamame rebus" },
          { amount: "1 buah", name: "jeruk" },
        ],
        cookingSteps: ["Rebus atau hangatkan edamame lalu tiriskan.", "Sajikan edamame bersama jeruk yang sudah dikupas."],
      },
      {
        mealType: "Makan malam",
        name: preference === "nabati" ? "Sup Tahu Kacang Merah" : "Sup Ayam Kacang Merah",
        description: "Sup bening hangat dengan protein, kacang merah, dan sayuran.",
        rationale: "Kuah hangat membuat porsi sayur dan protein terasa nyaman untuk makan malam.",
        prepMinutes: 30,
        servings: 1,
        nutrition: { calories: 470, proteinGrams: preference === "nabati" ? 27 : 38, carbsGrams: 49, fatGrams: 14, fiberGrams: 12 },
        ingredients: [
          { amount: "150 g", name: dinnerProtein },
          { amount: "80 g", name: "kacang merah matang" },
          { amount: "1 mangkuk", name: "wortel, buncis, dan kol" },
          { amount: "400 ml", name: "kaldu rendah garam" },
        ],
        cookingSteps: ["Masak protein dan wortel dalam kaldu hingga matang.", "Tambahkan kacang merah serta sayuran lain, lalu masak hingga semuanya empuk."],
      },
    ];
  }

  return null;
}

function fallbackMeals(preference: unknown, planDate?: string): GeneratedPlan["meals"] {
  const rotation = planDate ? dailyPlanRotation(planDate) : 0;
  const alternative = alternativeFallbackMeals(preference, rotation);
  if (alternative) return alternative;

  const proteinLunch = preference === "nabati"
    ? { name: "Nasi Merah Tempe Panggang", protein: 28, rationale: "Tempe, nasi merah, dan sayuran memberi porsi nabati yang lengkap dan mudah disiapkan." }
    : { name: "Nasi Merah Ayam Panggang", protein: 42, rationale: "Protein ayam dipadukan dengan nasi merah dan sayuran untuk porsi utama yang seimbang." };

  return [
    {
      mealType: "Sarapan",
      name: "Oat Pisang Kayu Manis",
      description: "Sarapan hangat dengan tekstur lembut dan rasa manis alami dari pisang.",
      rationale: "Serat dari oat dan pisang membantu membuat sarapan terasa lebih mengenyangkan.",
      prepMinutes: 12,
      servings: 1,
      nutrition: { calories: 390, proteinGrams: 18, carbsGrams: 61, fatGrams: 9, fiberGrams: 10 },
      ingredients: [
        { amount: "50 g", name: "oat utuh" },
        { amount: "200 ml", name: "susu rendah lemak atau susu kedelai" },
        { amount: "1 buah kecil", name: "pisang, iris" },
        { amount: "1 sdm", name: "selai kacang tanpa gula" },
      ],
      cookingSteps: ["Masak oat dan susu dengan api kecil selama 5–7 menit sambil diaduk.", "Tambahkan pisang dan selai kacang, lalu sajikan hangat."],
    },
    {
      mealType: "Makan siang",
      name: proteinLunch.name,
      description: "Porsi makan siang sederhana dengan lauk berbumbu ringan dan sayuran segar.",
      rationale: proteinLunch.rationale,
      prepMinutes: 30,
      servings: 1,
      nutrition: { calories: 560, proteinGrams: proteinLunch.protein, carbsGrams: 64, fatGrams: 15, fiberGrams: 8 },
      ingredients: [
        { amount: "120 g", name: preference === "nabati" ? "tempe" : "dada ayam tanpa kulit" },
        { amount: "150 g", name: "nasi merah matang" },
        { amount: "1 mangkuk", name: "selada, timun, dan tomat" },
        { amount: "secukupnya", name: "bawang putih, lada, dan jeruk nipis" },
      ],
      cookingSteps: ["Lumuri lauk dengan bawang putih, lada, dan jeruk nipis selama 10 menit.", "Panggang hingga matang, lalu sajikan bersama nasi merah dan sayuran."],
    },
    {
      mealType: "Camilan",
      name: "Yogurt Jambu Biji",
      description: "Camilan dingin dan praktis untuk jeda di antara makan utama.",
      rationale: "Porsi sederhana ini menggabungkan protein dengan serat dari buah.",
      prepMinutes: 5,
      servings: 1,
      nutrition: { calories: 220, proteinGrams: 13, carbsGrams: 32, fatGrams: 5, fiberGrams: 6 },
      ingredients: [{ amount: "170 g", name: "yogurt tawar tinggi protein" }, { amount: "100 g", name: "jambu biji merah" }, { amount: "1 sdm", name: "biji labu panggang" }],
      cookingSteps: ["Masukkan yogurt ke mangkuk saji.", "Tambahkan jambu biji dan biji labu sebelum dinikmati."],
    },
    {
      mealType: "Makan malam",
      name: "Sup Tahu Sayur dan Kentang",
      description: "Makan malam berkuah dengan tahu, kentang, dan sayuran berwarna-warni.",
      rationale: "Kuah hangat dan beragam sayuran memberi porsi makan malam yang nyaman dan ringan.",
      prepMinutes: 25,
      servings: 1,
      nutrition: { calories: 460, proteinGrams: 27, carbsGrams: 55, fatGrams: 15, fiberGrams: 11 },
      ingredients: [{ amount: "150 g", name: "tahu putih" }, { amount: "120 g", name: "kentang" }, { amount: "1 mangkuk", name: "wortel, buncis, dan kol" }, { amount: "400 ml", name: "kaldu rendah garam" }],
      cookingSteps: ["Masak kentang dan wortel dalam kaldu hingga hampir empuk.", "Tambahkan tahu, buncis, dan kol lalu masak lima menit lagi."],
    },
  ];
}

function dailyFallbackWorkout(
  context: UserContext,
  planDate: string,
): GeneratedPlan["workout"] {
  const rotation = dailyPlanRotation(planDate);
  const difficulty = context.profile.activity_level === "pemula" ? "pemula" : "menengah";

  if (rotation === 1) {
    return {
      name: "Kardio Ringan dan Stabilitas",
      difficulty,
      purpose: "Menjaga kebugaran dengan kardio rendah benturan dan latihan stabilitas yang berbeda dari sesi sebelumnya.",
      estimatedMinutes: 28,
      exercises: [
        { name: "Jalan Cepat di Tempat", mode: "timed", sets: 1, repetitions: null, durationSeconds: 360, restSeconds: 45, instruction: "Ayunkan lengan secara nyaman dan pertahankan langkah yang stabil." },
        { name: "Step Touch", mode: "timed", sets: 2, repetitions: null, durationSeconds: 120, restSeconds: 45, instruction: "Melangkah ke samping bergantian tanpa menghentakkan kaki." },
        { name: "Standing Knee Drive", mode: "repetitions", sets: 2, repetitions: 10, durationSeconds: null, restSeconds: 60, instruction: "Angkat lutut bergantian sambil menjaga badan tetap tegak." },
        { name: "Bird Dog Berdiri", mode: "repetitions", sets: 2, repetitions: 8, durationSeconds: null, restSeconds: 45, instruction: "Panjangkan lengan dan kaki berlawanan dengan pegangan kursi bila perlu." },
        { name: "Peregangan Betis dan Bahu", mode: "timed", sets: 1, repetitions: null, durationSeconds: 300, restSeconds: 0, instruction: "Tahan setiap posisi dengan napas tenang tanpa memaksakan rentang gerak." },
      ],
    };
  }

  if (rotation === 2) {
    return {
      name: "Pemulihan Aktif dan Mobilitas",
      difficulty: "pemula",
      purpose: "Memberi ruang pemulihan aktif melalui gerakan ringan, mobilitas, dan pernapasan tanpa menghentikan kebiasaan harian.",
      estimatedMinutes: 22,
      exercises: [
        { name: "Jalan Santai di Tempat", mode: "timed", sets: 1, repetitions: null, durationSeconds: 300, restSeconds: 30, instruction: "Gunakan tempo santai yang memungkinkanmu berbicara dengan nyaman." },
        { name: "Putaran Bahu dan Lengan", mode: "timed", sets: 2, repetitions: null, durationSeconds: 90, restSeconds: 30, instruction: "Gerakkan bahu dan lengan perlahan dalam rentang yang nyaman." },
        { name: "Hip Hinge dengan Kursi", mode: "repetitions", sets: 2, repetitions: 8, durationSeconds: null, restSeconds: 45, instruction: "Dorong pinggul ke belakang sambil menjaga punggung tetap netral." },
        { name: "Peregangan Samping Berdiri", mode: "timed", sets: 2, repetitions: null, durationSeconds: 60, restSeconds: 30, instruction: "Miringkan tubuh perlahan dan hentikan bila terasa tidak nyaman." },
        { name: "Pernapasan Terarah", mode: "timed", sets: 1, repetitions: null, durationSeconds: 300, restSeconds: 0, instruction: "Tarik dan keluarkan napas perlahan sambil merilekskan bahu." },
      ],
    };
  }

  return {
    name: "Kekuatan Dasar Seluruh Tubuh",
    difficulty,
    purpose: "Melatih kekuatan dasar seluruh tubuh dengan gerakan rendah benturan dan peningkatan yang tetap terkendali.",
    estimatedMinutes: 30,
    exercises: [
      { name: "Pemanasan Jalan di Tempat", mode: "timed", sets: 1, repetitions: null, durationSeconds: 300, restSeconds: 45, instruction: "Mulai dengan langkah ringan dan bahu yang rileks." },
      { name: "Chair Squat", mode: "repetitions", sets: 3, repetitions: 10, durationSeconds: null, restSeconds: 60, instruction: "Sentuhkan pinggul ke kursi lalu berdiri dengan stabil." },
      { name: "Wall Push-Up", mode: "repetitions", sets: 3, repetitions: 8, durationSeconds: null, restSeconds: 60, instruction: "Pertahankan tubuh lurus saat mendekat ke dinding." },
      { name: "Standing Calf Raise", mode: "repetitions", sets: 2, repetitions: 12, durationSeconds: null, restSeconds: 45, instruction: "Gunakan kursi sebagai penyangga dan turunkan tumit secara perlahan." },
      { name: "Pendinginan Ringan", mode: "timed", sets: 1, repetitions: null, durationSeconds: 300, restSeconds: 0, instruction: "Atur napas dan lakukan gerakan perlahan tanpa memaksakan rentang gerak." },
    ],
  };
}

function fallbackWorkout(
  context: UserContext,
  reason: GenerationReason,
  planDate?: string,
): GeneratedPlan["workout"] {
  if (reason === "daily-refresh" && planDate) {
    return dailyFallbackWorkout(context, planDate);
  }

  const { shouldEase, shouldProgress } = deriveWorkoutAdaptation(context, reason);

  if (context.latestExercises.length >= 3 && reason === "workout-complete") {
    const exercises = context.latestExercises.map((raw) => {
      const mode = raw.mode === "timed" ? "timed" as const : "repetitions" as const;
      const repetitions = mode === "repetitions"
        ? Math.max(4, Math.min(100, Number(raw.repetitions) + (shouldProgress ? 2 : shouldEase ? -2 : 0)))
        : null;
      const durationSeconds = mode === "timed"
        ? Math.max(30, Math.min(3600, Number(raw.duration_seconds) + (shouldProgress ? 30 : shouldEase ? -30 : 0)))
        : null;
      return {
        name: String(raw.name), mode, sets: Number(raw.sets), repetitions, durationSeconds,
        restSeconds: Math.max(0, Math.min(600, Number(raw.rest_seconds) + (shouldEase ? 15 : 0))),
        instruction: String(raw.instruction),
      };
    });
    return {
      name: "Latihan Berikutnya",
      difficulty: context.latestPackage?.difficulty_level === "menengah" && !shouldEase ? "menengah" : "pemula",
      purpose: shouldProgress
        ? "Melanjutkan ritme dengan peningkatan kecil setelah target minggu ini tercapai."
        : shouldEase
          ? "Menjaga kebiasaan dengan intensitas yang lebih ringan dan ruang istirahat lebih panjang."
          : "Menjaga ritme latihan dengan target yang stabil dan mudah diikuti.",
      estimatedMinutes: Math.max(15, Math.min(60, Number(context.latestPackage?.estimated_minutes ?? 28) + (shouldProgress ? 3 : shouldEase ? -3 : 0))),
      exercises,
    };
  }

  return {
    name: "Latihan Hari Ini",
    difficulty: "pemula",
    purpose: shouldEase
      ? "Memulai kembali dengan gerakan rendah benturan dan jeda yang lebih longgar."
      : "Membangun daya tahan secara bertahap dengan gerakan rendah benturan.",
    estimatedMinutes: shouldEase ? 24 : 30,
    exercises: [
      { name: "Jalan di Tempat", mode: "timed", sets: 1, repetitions: null, durationSeconds: shouldEase ? 180 : 300, restSeconds: 45, instruction: "Jaga langkah tetap ringan dan bahu rileks." },
      { name: "Chair Squat", mode: "repetitions", sets: shouldEase ? 2 : 3, repetitions: shouldEase ? 8 : 10, durationSeconds: null, restSeconds: 60, instruction: "Sentuhkan pinggul ke kursi lalu berdiri dengan stabil." },
      { name: "Wall Push-Up", mode: "repetitions", sets: shouldEase ? 2 : 3, repetitions: shouldEase ? 6 : 8, durationSeconds: null, restSeconds: 60, instruction: "Pertahankan tubuh lurus saat mendekat ke dinding." },
      { name: "Low Impact Knee Raise", mode: "timed", sets: 2, repetitions: null, durationSeconds: shouldEase ? 120 : 180, restSeconds: 45, instruction: "Angkat lutut bergantian dengan tempo yang terasa nyaman." },
      { name: "Pendinginan Ringan", mode: "timed", sets: 1, repetitions: null, durationSeconds: 300, restSeconds: 0, instruction: "Atur napas dan lakukan gerakan perlahan tanpa memaksakan rentang gerak." },
    ],
  };
}

function fallbackPlan(
  context: UserContext,
  reason: GenerationReason,
  planDate?: string,
): GeneratedPlan {
  return {
    workout: fallbackWorkout(context, reason, planDate),
    meals: fallbackMeals(context.profile.meal_preference, planDate),
  };
}

export function buildAiContext(context: UserContext) {
  const allowedGoalStatuses = new Set(["active", "met", "missed"]);
  const previousWorkout = context.latestPackage
    ? {
        difficulty: String(context.latestPackage.difficulty_level ?? "pemula"),
        estimatedMinutes: Number(context.latestPackage.estimated_minutes ?? 30),
        exercises: context.latestExercises.slice(0, 10).map((exercise) => ({
          name: String(exercise.name),
          mode: exercise.mode === "timed" ? "timed" : "repetitions",
          sets: Number(exercise.sets),
          repetitions: exercise.repetitions === null ? null : Number(exercise.repetitions),
          durationSeconds: exercise.duration_seconds === null ? null : Number(exercise.duration_seconds),
          restSeconds: Number(exercise.rest_seconds),
          instruction: String(exercise.instruction),
        })),
      }
    : null;
  const exerciseNames = new Map(
    context.latestExercises.map((exercise) => [String(exercise.id), String(exercise.name)]),
  );
  const latestWorkoutResult = context.latestWorkoutResult
    ? {
        activeDurationSeconds: context.latestWorkoutResult.activeDurationSeconds,
        completedAt: context.latestWorkoutResult.completedAt,
        exercises: context.latestWorkoutResult.exercises.map((exercise) => ({
          name: exerciseNames.get(exercise.subExerciseId) ?? "Latihan",
          completedSets: exercise.completedSets,
          completedRepetitions: exercise.completedRepetitions,
          activeDurationSeconds: exercise.activeDurationSeconds,
          completed: exercise.completed,
        })),
      }
    : null;

  return {
    currentWeightKg: Math.round(Number(context.profile.current_weight_kg)),
    targetWeightKg: Math.round(Number(context.profile.target_weight_kg)),
    weeklyTargetKg: Number(context.profile.weekly_target_kg),
    activityLevel: String(context.profile.activity_level),
    mealPreference: String(context.profile.meal_preference),
    recentGoalStatuses: context.weeklyGoals
      .slice(0, 2)
      .map((goal) => String(goal.status))
      .filter((status) => allowedGoalStatuses.has(status)),
    previousWorkout,
    ...(context.latestMeals?.length
      ? { previousMeals: context.latestMeals.map((meal) => ({ ...meal })) }
      : {}),
    latestWorkoutResult,
  };
}

export function deriveWorkoutAdaptation(
  context: UserContext,
  reason: GenerationReason,
) {
  const recentGoalStatuses = context.weeklyGoals
    .slice(0, 2)
    .map((goal) => String(goal.status));
  const shouldEase = recentGoalStatuses.length === 2
    && recentGoalStatuses.every((status) => status === "missed");
  const completedExercises = context.latestWorkoutResult?.exercises ?? [];
  const completedLatestWorkout = completedExercises.length > 0
    && completedExercises.every((exercise) => exercise.completed);

  return {
    shouldEase,
    shouldProgress: reason === "workout-complete"
      && completedLatestWorkout
      && !shouldEase,
  };
}

export async function tryAiPlan(
  context: UserContext,
  reason: GenerationReason,
  planDate: string,
): Promise<ModelResult<GeneratedPlan>> {
  const model = getGroqModels().secondary;
  if (!hasCurrentAiConsent(context.profile)) {
    return { ok: false, code: "ai_consent_missing", model };
  }
  const safeContext = { ...buildAiContext(context), planDate };
  return callGroq(
    generatedPlanSchema,
    "sehatin_program",
    [
      {
        role: "system",
        content: "Kamu menyusun paket latihan adaptif dan rekomendasi makanan dinamis Sehat.in dalam Bahasa Indonesia yang tenang, suportif, dan ramah pemula. Jangan memberi diagnosis, label kondisi medis, klaim terapi, atau mendorong perubahan ekstrem. Target penurunan mingguan wajib tetap 0,5–1 kg. Gunakan hasil latihan terakhir: bila seluruh target latihan selesai dan dua minggu terbaru tidak sama-sama gagal, naikkan hanya satu dimensi secara kecil (repetisi, set, atau durasi). Bila dua target mingguan terbaru berturut-turut gagal, prioritaskan latihan lebih ringan atau gerakan pengganti dengan jeda cukup. Untuk daily-refresh, hindari mengulang persis susunan latihan dan nama menu sebelumnya; variasikan secara wajar dan gunakan pemulihan aktif saat tubuh memerlukan hari yang lebih ringan. Rekomendasi makanan harus menyesuaikan berat terkini dan preferensi pengguna, realistis, menyebut perkiraan gizi per porsi, dan selalu terdiri dari Sarapan, Makan siang, Camilan, dan Makan malam.",
      },
      {
        role: "user",
        content: `Susun program untuk alasan ${reason} dari konteks minimum berikut: ${JSON.stringify(safeContext)}`,
      },
    ],
    3000,
    "secondary",
  );
}

async function persistPlan(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  context: UserContext,
  plan: GeneratedPlan,
  generatedByAi: boolean,
  scheduledFor: string,
  options: { createWorkout?: boolean; createMeals?: boolean } = {},
) {
  const createWorkout = options.createWorkout ?? true;
  const createMeals = options.createMeals ?? true;
  const scheduledDate = new Date(`${scheduledFor}T00:00:00Z`);
  const day = scheduledDate.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  scheduledDate.setUTCDate(scheduledDate.getUTCDate() + mondayOffset);
  const weekStart = scheduledDate.toISOString().slice(0, 10);

  let packageId: string | null = null;
  if (createWorkout) {
    const packageResult = await admin.database.from("exercise_packages").insert([{
      user_id: userId,
      week_start: weekStart,
      scheduled_for: scheduledFor,
      name: plan.workout.name,
      difficulty_level: plan.workout.difficulty,
      purpose: plan.workout.purpose,
      estimated_minutes: plan.workout.estimatedMinutes,
      generated_by_ai: generatedByAi,
      generation_status: "ready",
      status: "active",
    }]).select("id").single();
    if (packageResult.error || !packageResult.data) throw packageResult.error ?? new Error("Package insert failed");
    packageId = String(packageResult.data.id);

    const exerciseResult = await admin.database.from("sub_exercises").insert(
      plan.workout.exercises.map((exercise, index) => ({
        package_id: packageId,
        user_id: userId,
        name: exercise.name,
        mode: exercise.mode,
        sets: exercise.sets,
        repetitions: exercise.repetitions,
        duration_seconds: exercise.durationSeconds,
        rest_seconds: exercise.restSeconds,
        order_index: index + 1,
        instruction: exercise.instruction,
      })),
    );
    if (exerciseResult.error) throw exerciseResult.error;
  }

  let recommendationSetId: string | null = null;
  if (createMeals) {
    const setResult = await admin.database.from("nutrition_recommendation_sets").insert([{
      user_id: userId,
      based_on_weight_kg: Number(context.profile.current_weight_kg),
      scheduled_for: scheduledFor,
      generated_by_ai: generatedByAi,
      generation_status: "generating",
    }]).select("id").single();
    if (setResult.error || !setResult.data) throw setResult.error ?? new Error("Recommendation set insert failed");
    recommendationSetId = String(setResult.data.id);

    for (const [index, meal] of plan.meals.entries()) {
      const mealResult = await admin.database.from("nutrition_recommendations").insert([{
        recommendation_set_id: recommendationSetId,
        user_id: userId,
        meal_type: meal.mealType,
        name: meal.name,
        description: meal.description,
        rationale: meal.rationale,
        prep_minutes: meal.prepMinutes,
        servings: meal.servings,
        calories: meal.nutrition.calories,
        protein_grams: meal.nutrition.proteinGrams,
        carbs_grams: meal.nutrition.carbsGrams,
        fat_grams: meal.nutrition.fatGrams,
        fiber_grams: meal.nutrition.fiberGrams,
        order_index: index + 1,
      }]).select("id").single();
      if (mealResult.error || !mealResult.data) throw mealResult.error ?? new Error("Meal insert failed");

      const [ingredientResult, stepResult] = await Promise.all([
        admin.database.from("nutrition_ingredients").insert(meal.ingredients.map((ingredient, ingredientIndex) => ({
          recommendation_id: mealResult.data.id,
          user_id: userId,
          amount: ingredient.amount,
          name: ingredient.name,
          order_index: ingredientIndex + 1,
        }))),
        admin.database.from("nutrition_steps").insert(meal.cookingSteps.map((instruction, stepIndex) => ({
          recommendation_id: mealResult.data.id,
          user_id: userId,
          instruction,
          order_index: stepIndex + 1,
        }))),
      ]);
      if (ingredientResult.error || stepResult.error) throw ingredientResult.error ?? stepResult.error;
    }

    const readyResult = await admin.database.from("nutrition_recommendation_sets")
      .update({ generation_status: "ready" })
      .eq("id", recommendationSetId);
    if (readyResult.error) throw readyResult.error;
  }

  return { packageId, recommendationSetId, generatedByAi, scheduledFor };
}

function scheduledDateFor(context: UserContext, reason: GenerationReason) {
  const timeZone = String(context.profile.time_zone ?? "Asia/Makassar");
  const today = isoDateInTimeZone(new Date(), timeZone);
  if (reason === "daily-refresh") return today;
  const currentActive = context.latestPackage?.status === "active"
    && String(context.latestPackage?.scheduled_for ?? "") >= today;
  return reason === "workout-complete" || currentActive ? addDays(today, 1) : today;
}

async function generateAndPersist(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  reason: GenerationReason,
  clientRequestId: string,
  options?: {
    scheduledFor?: string;
    createWorkout?: boolean;
    createMeals?: boolean;
  },
) {
  const claim = await claimAiRequest(admin, userId, "program", clientRequestId);
  if (!claim.allowed || !claim.requestId) {
    return { skipped: true, reason: claim.reason ?? "request_rejected", duplicate: claim.duplicate };
  }

  try {
    const context = await loadContext(admin, userId);
    const scheduledFor = options?.scheduledFor ?? scheduledDateFor(context, reason);
    const modelResult = await tryAiPlan(context, reason, scheduledFor);
    const plan = modelResult.ok ? modelResult.data : fallbackPlan(context, reason, scheduledFor);
    const persisted = await persistPlan(
      admin,
      userId,
      context,
      plan,
      modelResult.ok,
      scheduledFor,
      options,
    );
    await finishAiRequest(admin, userId, claim.requestId, {
      status: "succeeded",
      model: modelResult.model,
      usedAi: modelResult.ok,
      failureCode: modelResult.ok ? undefined : modelResult.code,
    });
    return {
      ...persisted,
      model: modelResult.model,
      fallbackReason: modelResult.ok ? null : modelResult.code,
    };
  } catch (error) {
    await finishAiRequest(admin, userId, claim.requestId, {
      status: "failed",
      failureCode: "program_generation_failed",
    });
    throw error;
  }
}

async function ensureDailyPlan(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const profileResult = await admin.database.from("profiles")
    .select("time_zone")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileResult.error) throw profileResult.error;
  if (!profileResult.data) throw new Error("Onboarding is required before generating a daily plan.");

  const today = isoDateInTimeZone(
    new Date(),
    String(profileResult.data.time_zone ?? "Asia/Makassar"),
  );
  const [packageResult, recommendationSetResult] = await Promise.all([
    admin.database.from("exercise_packages")
      .select("id")
      .eq("user_id", userId)
      .eq("scheduled_for", today)
      .eq("generation_status", "ready")
      .order("created_at", { ascending: false })
      .limit(1),
    admin.database.from("nutrition_recommendation_sets")
      .select("id")
      .eq("user_id", userId)
      .eq("scheduled_for", today)
      .eq("generation_status", "ready")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  if (packageResult.error || recommendationSetResult.error) {
    throw packageResult.error ?? recommendationSetResult.error;
  }

  const packageId = packageResult.data?.[0]?.id ?? null;
  const recommendationSetId = recommendationSetResult.data?.[0]?.id ?? null;
  if (packageId && recommendationSetId) {
    return {
      skipped: true,
      reason: "already_ready",
      scheduledFor: today,
      packageId,
      recommendationSetId,
    };
  }

  return generateAndPersist(
    admin,
    userId,
    "daily-refresh",
    crypto.randomUUID(),
    {
      scheduledFor: today,
      createWorkout: !packageId,
      createMeals: !recommendationSetId,
    },
  );
}

function createEasierWorkout(context: ChatContext): GeneratedPlan["workout"] | null {
  if (!context.activePackage || context.activeExercises.length < 3) return null;

  const exercises = context.activeExercises.map((raw) => {
    const mode = raw.mode === "timed" ? "timed" as const : "repetitions" as const;
    const originalSets = Math.max(1, Number(raw.sets));
    const sets = Math.max(1, originalSets - 1);
    const repetitions = mode === "repetitions"
      ? Math.max(1, Math.round(Number(raw.repetitions) * 0.8))
      : null;
    const durationSeconds = mode === "timed"
      ? Math.max(10, Number(raw.duration_seconds) - 30)
      : null;
    return {
      name: String(raw.name),
      mode,
      sets,
      repetitions,
      durationSeconds,
      restSeconds: Math.min(600, Number(raw.rest_seconds) + 15),
      instruction: String(raw.instruction),
    };
  });

  return workoutSchema.parse({
    name: `${String(context.activePackage.name)} - Versi Ringan`.slice(0, 120),
    difficulty: "pemula",
    purpose: "Menjaga ritme latihan hari ini dengan beban yang lebih ringan dan jeda lebih longgar.",
    estimatedMinutes: Math.max(5, Number(context.activePackage.estimated_minutes) - 5),
    exercises,
  });
}

function createHarderWorkout(context: ChatContext): GeneratedPlan["workout"] | null {
  if (!context.activePackage || context.activeExercises.length < 3) return null;

  const exercises = context.activeExercises.map((raw) => {
    const mode = raw.mode === "timed" ? "timed" as const : "repetitions" as const;
    return {
      name: String(raw.name),
      mode,
      sets: Math.min(10, Math.max(1, Number(raw.sets))),
      repetitions: mode === "repetitions"
        ? Math.min(100, Math.max(1, Number(raw.repetitions) + 2))
        : null,
      durationSeconds: mode === "timed"
        ? Math.min(3600, Math.max(10, Number(raw.duration_seconds) + 30))
        : null,
      restSeconds: Math.max(0, Number(raw.rest_seconds)),
      instruction: String(raw.instruction),
    };
  });

  return workoutSchema.parse({
    name: `${String(context.activePackage.name)} - Tantangan Bertahap`.slice(0, 120),
    difficulty: context.activePackage.difficulty_level === "menengah" ? "menengah" : "pemula",
    purpose: "Menambah tantangan secara bertahap tanpa mengubah seluruh ritme latihan hari ini.",
    estimatedMinutes: Math.min(120, Number(context.activePackage.estimated_minutes) + 5),
    exercises,
  });
}

function exerciseTarget(exercise: {
  mode: "timed" | "repetitions";
  sets: number;
  repetitions: number | null;
  durationSeconds: number | null;
}) {
  return exercise.mode === "repetitions"
    ? `${exercise.sets} set × ${exercise.repetitions} repetisi`
    : `${exercise.sets} set × ${exercise.durationSeconds} detik`;
}

function workoutAdjustmentRows(context: ChatContext, workout: GeneratedPlan["workout"]) {
  return workout.exercises.map((exercise, index) => {
    const current = context.activeExercises[index];
    const currentMode = current?.mode === "timed" ? "timed" as const : "repetitions" as const;
    return {
      label: exercise.name,
      before: current
        ? exerciseTarget({
            mode: currentMode,
            sets: Number(current.sets),
            repetitions: currentMode === "repetitions" ? Number(current.repetitions) : null,
            durationSeconds: currentMode === "timed" ? Number(current.duration_seconds) : null,
          })
        : "Belum ada",
      after: exerciseTarget(exercise),
    };
  });
}

function requestedMealType(normalized: string): GeneratedPlan["meals"][number]["mealType"] {
  return /sarapan/.test(normalized)
    ? "Sarapan"
    : /camilan|snack/.test(normalized)
      ? "Camilan"
      : /malam/.test(normalized)
        ? "Makan malam"
        : "Makan siang";
}

function createFoodAdjustment(context: ChatContext, normalized: string): GeneratedPlan["meals"][number] | null {
  if (!context.activeRecommendationSet || context.activeMeals.length !== 4) return null;
  const mealType = requestedMealType(normalized);

  if (/bubur/.test(normalized)) {
    return mealSchema.parse({
      mealType,
      name: "Bubur Ayam Sayur",
      description: "Bubur nasi hangat dengan ayam suwir dan sayuran lembut untuk satu porsi makan malam yang tetap seimbang.",
      rationale: "Memberi karbohidrat, protein, dan serat dalam sajian yang mudah disiapkan serta nyaman dinikmati malam hari.",
      prepMinutes: 35,
      servings: 1,
      nutrition: {
        calories: 430,
        proteinGrams: 30,
        carbsGrams: 55,
        fatGrams: 10,
        fiberGrams: 5,
      },
      ingredients: [
        { amount: "150 g", name: "nasi matang" },
        { amount: "100 g", name: "dada ayam matang, disuwir" },
        { amount: "1 mangkuk", name: "sayuran lembut" },
        { amount: "500 ml", name: "air atau kaldu rendah garam" },
      ],
      cookingSteps: [
        "Masak nasi bersama air atau kaldu sambil diaduk sampai menjadi bubur.",
        "Tambahkan sayuran, lalu sajikan dengan ayam suwir setelah seluruh bahan matang.",
      ],
    });
  }

  if (/ayam/.test(normalized)) {
    return mealSchema.parse({
        mealType,
        name: "Ayam Panggang dengan Nasi dan Sayur",
        description: "Ayam panggang sederhana dengan nasi secukupnya dan sayuran berwarna untuk satu porsi makan yang seimbang.",
        rationale: "Memberi sumber protein, karbohidrat, lemak, dan serat dalam porsi realistis sesuai ritme programmu.",
        prepMinutes: 30,
        servings: 1,
        nutrition: {
          calories: 520,
          proteinGrams: 42,
          carbsGrams: 55,
          fatGrams: 14,
          fiberGrams: 7,
        },
        ingredients: [
          { amount: "150 g", name: "dada ayam tanpa kulit" },
          { amount: "150 g", name: "nasi matang" },
          { amount: "1 mangkuk", name: "sayuran campur" },
          { amount: "1 sdt", name: "minyak untuk memanggang" },
        ],
        cookingSteps: [
          "Bumbui ayam secukupnya, lalu panggang sampai matang merata.",
          "Sajikan ayam bersama nasi dan sayuran yang sudah dimasak.",
        ],
      });
  }
  return null;
}

function fallbackChatReply(context: ChatContext, content: string): ChatReply {
  const normalized = content.toLocaleLowerCase("id-ID");

  if (/sakit|nyeri|pusing|sesak/.test(normalized)) {
    return {
      answer: "Hentikan gerakan yang memicu rasa sakit dan beri tubuhmu waktu untuk pulih. Aku tidak bisa menilai penyebabnya lewat chat. Bila keluhan menetap, memburuk, atau mengganggu aktivitas, sebaiknya bicara dengan tenaga kesehatan.",
      adjustment: null,
    };
  }

  if (/latihan/.test(normalized) && /berat|sulit|terlalu|ringan|mudah/.test(normalized)) {
    const wantsMoreChallenge = /ringan|mudah/.test(normalized) && !/terlalu berat|terlalu sulit/.test(normalized);
    const workout = wantsMoreChallenge ? createHarderWorkout(context) : createEasierWorkout(context);
    if (workout) {
      return {
        answer: wantsMoreChallenge
          ? "Kita bisa menambah tantangan secara bertahap. Aku menyiapkan perbandingan di bawah; paket aktifmu tetap sama sampai kamu mengonfirmasi."
          : "Kita bisa membuat latihan hari ini lebih ringan. Aku menyiapkan perbandingan di bawah; paket aktifmu tetap sama sampai kamu mengonfirmasi.",
        adjustment: {
          target: "workout",
          title: "Usulan penyesuaian",
          description: wantsMoreChallenge
            ? "Naikkan tantangan secara kecil sambil mempertahankan susunan latihanmu."
            : "Turunkan beban hari ini tanpa menghilangkan ritme latihanmu.",
          rows: workoutAdjustmentRows(context, workout),
          workout,
          meal: null,
        },
      };
    }
  }

  if (/makan|menu|makanan/.test(normalized) && /ingin|ganti|ubah|sesuaikan|mau/.test(normalized)) {
    const meal = createFoodAdjustment(context, normalized);
    if (meal) {
      const currentMeal = context.activeMeals.find((item) => item.mealType === meal.mealType);
      return {
        answer: "Aku menyiapkan usulan perubahan makanan dalam tabel di bawah. Rekomendasi terbarumu tetap sama sampai kamu mengonfirmasi.",
        adjustment: {
          target: "food",
          title: "Usulan penyesuaian makanan",
          description: "Ubah menu yang diminta tanpa mengganti waktu makan lain.",
          rows: [{
            label: meal.mealType,
            before: currentMeal?.name ?? "Belum ada",
            after: meal.name,
          }],
          workout: null,
          meal,
        },
      };
    }
  }

  if (/makan|lapar|kalori/.test(normalized)) {
    return {
      answer: "Pilih makanan yang terasa cukup, mudah disiapkan, dan sesuai preferensimu. Gunakan rekomendasi makanan terbaru sebagai titik awal, lalu sesuaikan bahan dengan alergi, kebutuhan, atau arahan tenaga profesional.",
      adjustment: null,
    };
  }

  if (/target|progres|minggu|berat/.test(normalized)) {
    const currentWeight = Number(context.profile.current_weight_kg);
    const weeklyTarget = Number(context.weeklyGoal?.target_weight_kg ?? currentWeight);
    return {
      answer: `Catatan terbarumu ${currentWeight.toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg dan target minggu berjalan ${weeklyTarget.toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg. Tidak perlu mengejar angka dengan perubahan ekstrem; lanjutkan ritme yang terasa sanggup dijaga.`,
      adjustment: null,
    };
  }

  return {
    answer: "Aku sudah mencatat pertanyaanmu. Ceritakan apakah hal itu lebih berkaitan dengan latihan, makanan, atau progres mingguan agar jawabanku lebih terarah.",
    adjustment: null,
  };
}

async function tryAiChat(
  context: ChatContext,
  history: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<ModelResult<ChatReply>> {
  const model = getGroqModels().primary;
  if (!hasCurrentAiConsent(context.profile)) {
    return { ok: false, code: "ai_consent_missing", model };
  }
  const contextForModel = {
    profile: {
      currentWeightKg: Number(context.profile.current_weight_kg),
      targetWeightKg: Number(context.profile.target_weight_kg),
      weeklyTargetKg: Number(context.profile.weekly_target_kg),
      mealPreference: String(context.profile.meal_preference),
    },
    recentWeights: context.weightLogs,
    weeklyGoal: context.weeklyGoal,
    streak: context.streak,
    activePackage: context.activePackage,
    activeExercises: context.activeExercises,
    activeRecommendationSet: context.activeRecommendationSet,
    activeMeals: context.activeMeals,
  };

  return callGroq(
    chatReplySchema,
    "sehatin_chat_reply",
    [
      {
        role: "system",
        content: `Kamu adalah Pendamping Sehat.in. Jawab dalam Bahasa Indonesia yang tenang, suportif, ringkas, dan ramah pemula. Gunakan hanya konteks minimum berikut: ${JSON.stringify(contextForModel)}. Jangan memberi diagnosis, label kondisi medis, klaim terapi, atau mendorong penurunan ekstrem. Untuk rasa sakit, pusing, atau sesak: sarankan menghentikan gerakan pemicu dan menghubungi tenaga kesehatan bila menetap, memburuk, atau mengganggu aktivitas. Jangan mengarang data yang tidak ada. Isi adjustment hanya bila pengguna secara eksplisit meminta perubahan latihan atau makanan, termasuk mengatakan latihan terlalu berat, terlalu ringan, atau meminta menu/bahan tertentu. Untuk target workout: target wajib "workout", workout berisi versi aman dari paket aktif dengan 3–10 gerakan, meal wajib null, dan rows membandingkan target setiap gerakan saat ini dengan usulan. Untuk target food: target wajib "food", meal wajib berisi tepat satu menu pengganti lengkap untuk waktu makan yang diminta, workout wajib null, dan rows hanya membandingkan menu tersebut. Jangan menerapkan perubahan sebelum pengguna mengonfirmasi melalui tombol. Untuk pertanyaan atau ide yang tidak meminta perubahan, adjustment wajib null.`,
      },
      ...history,
    ],
    2000,
  );
}

function mapStoredAssistant(row: Record<string, unknown>) {
  const payload = row.adjustment_payload && typeof row.adjustment_payload === "object"
    ? row.adjustment_payload as Record<string, unknown>
    : null;
  const rows = Array.isArray(payload?.rows)
    ? payload.rows.flatMap((item) => isRecord(item)
      && typeof item.label === "string"
      && typeof item.before === "string"
      && typeof item.after === "string"
      ? [{ label: item.label, before: item.before, after: item.after }]
      : [])
    : Array.isArray(payload?.changes)
      ? payload.changes.flatMap((item) => typeof item === "string"
        ? [{ label: "Penyesuaian", before: "Paket saat ini", after: item }]
        : [])
      : [];
  const adjustment = row.kind === "adjustment" && payload
    ? {
        target: payload.target === "food" ? "food" as const : "workout" as const,
        title: String(payload.title ?? "Usulan penyesuaian"),
        description: String(payload.description ?? "Tinjau penyesuaian sebelum diterapkan."),
        rows,
        status: row.adjustment_status === "applied" || row.adjustment_status === "declined"
          ? row.adjustment_status
          : "pending",
      }
    : null;
  return {
    id: String(row.id),
    content: String(row.content),
    kind: row.kind === "adjustment" ? "adjustment" : "message",
    generatedByAi: Boolean(row.generated_by_ai),
    adjustment,
    createdAt: String(row.created_at),
  };
}

async function loadExistingChatResponse(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  clientMessageId: string,
) {
  const userMessageResult = await admin.database.from("chat_messages")
    .select("id, session_id")
    .eq("user_id", userId)
    .eq("client_message_id", clientMessageId)
    .maybeSingle();
  if (userMessageResult.error) throw userMessageResult.error;
  if (!userMessageResult.data) return null;

  const assistantResult = await admin.database.from("chat_messages")
    .select("id, content, kind, generated_by_ai, adjustment_payload, adjustment_status, created_at")
    .eq("user_id", userId)
    .eq("reply_to_message_id", userMessageResult.data.id)
    .maybeSingle();
  if (assistantResult.error) throw assistantResult.error;
  if (!assistantResult.data) return null;
  return {
    sessionId: String(userMessageResult.data.session_id),
    assistantMessage: mapStoredAssistant(assistantResult.data),
  };
}

async function handleChatMessage(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  input: { sessionId: string | null; clientMessageId: string; content: string },
) {
  const claim = await claimAiRequest(admin, userId, "chat", input.clientMessageId);
  if (!claim.allowed || !claim.requestId) {
    if (claim.duplicate) {
      const existing = await loadExistingChatResponse(admin, userId, input.clientMessageId);
      if (existing) return existing;
    }
    throw new RequestRejectedError(429, claim.reason ?? "request_rejected");
  }

  try {
    let sessionId = input.sessionId;
    if (sessionId) {
      const sessionResult = await admin.database.from("chat_sessions")
        .select("id")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .maybeSingle();
      if (sessionResult.error) throw sessionResult.error;
      if (!sessionResult.data) throw new RequestRejectedError(404, "chat_session_not_found");
    } else {
      const sessionResult = await admin.database.from("chat_sessions")
        .insert([{ user_id: userId }])
        .select("id")
        .single();
      if (sessionResult.error || !sessionResult.data) {
        throw sessionResult.error ?? new Error("Chat session insert failed");
      }
      sessionId = String(sessionResult.data.id);
    }

    const userMessageResult = await admin.database.from("chat_messages").insert([{
      session_id: sessionId,
      user_id: userId,
      client_message_id: input.clientMessageId,
      role: "user",
      content: input.content,
      kind: "message",
      generated_by_ai: false,
    }]).select("id").single();
    if (userMessageResult.error || !userMessageResult.data) {
      throw userMessageResult.error ?? new Error("Chat message insert failed");
    }

    const [context, historyResult] = await Promise.all([
      loadChatContext(admin, userId),
      admin.database.from("chat_messages")
        .select("role, content, created_at")
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);
    if (historyResult.error) throw historyResult.error;
    const history = [...(historyResult.data ?? [])]
      .reverse()
      .flatMap((message): Array<{ role: "user" | "assistant"; content: string }> =>
        message.role === "user" || message.role === "assistant"
          ? [{ role: message.role, content: String(message.content) }]
          : [],
      );

    const modelResult = await tryAiChat(context, history);
    const fallback = fallbackChatReply(context, input.content);
    const reply = modelResult.ok ? modelResult.data : fallback;
    const validAdjustment = reply.adjustment?.target === "workout"
      && reply.adjustment.workout
      && reply.adjustment.meal === null
      && context.activePackage?.id
      ? reply.adjustment
      : reply.adjustment?.target === "food"
        && reply.adjustment.meal
        && reply.adjustment.workout === null
        && reply.adjustment.meal.mealType === requestedMealType(input.content.toLocaleLowerCase("id-ID"))
        && context.activeRecommendationSet?.id
        ? reply.adjustment
        : null;
    const adjustmentPayload = validAdjustment
      ? validAdjustment.target === "workout"
        ? {
          target: "workout",
          basePackageId: String(context.activePackage?.id),
          title: validAdjustment.title,
          description: validAdjustment.description,
          rows: validAdjustment.rows,
          workout: validAdjustment.workout,
        }
        : {
          target: "food",
          baseRecommendationSetId: String(context.activeRecommendationSet?.id),
          title: validAdjustment.title,
          description: validAdjustment.description,
          rows: [{
            label: validAdjustment.meal.mealType,
            before: context.activeMeals.find((meal) => meal.mealType === validAdjustment.meal?.mealType)?.name ?? "Belum ada",
            after: validAdjustment.meal.name,
          }],
          meal: validAdjustment.meal,
        }
      : null;

    const assistantResult = await admin.database.from("chat_messages").insert([{
      session_id: sessionId,
      user_id: userId,
      reply_to_message_id: userMessageResult.data.id,
      role: "assistant",
      content: reply.answer,
      kind: adjustmentPayload ? "adjustment" : "message",
      generated_by_ai: modelResult.ok,
      model: modelResult.model,
      prompt_tokens: modelResult.ok ? modelResult.promptTokens : null,
      completion_tokens: modelResult.ok ? modelResult.completionTokens : null,
      adjustment_payload: adjustmentPayload,
      adjustment_status: adjustmentPayload ? "pending" : "none",
    }]).select("id, content, kind, generated_by_ai, adjustment_payload, adjustment_status, created_at").single();
    if (assistantResult.error || !assistantResult.data) {
      throw assistantResult.error ?? new Error("Assistant message insert failed");
    }

    const sessionUpdate = await admin.database.from("chat_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("user_id", userId);
    if (sessionUpdate.error) throw sessionUpdate.error;

    await finishAiRequest(admin, userId, claim.requestId, {
      status: "succeeded",
      model: modelResult.model,
      usedAi: modelResult.ok,
      failureCode: modelResult.ok ? undefined : modelResult.code,
    });

    return {
      sessionId,
      assistantMessage: mapStoredAssistant(assistantResult.data),
    };
  } catch (error) {
    await finishAiRequest(admin, userId, claim.requestId, {
      status: "failed",
      failureCode: error instanceof RequestRejectedError ? error.code : "chat_request_failed",
    });
    throw error;
  }
}

async function resolveChatAdjustment(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  messageId: string,
  decision: "apply" | "decline",
) {
  const result = await admin.database.rpc("edge_resolve_chat_adjustment", {
    p_user_id: userId,
    p_message_id: messageId,
    p_decision: decision,
  });
  if (result.error) throw result.error;
  return result.data;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const requestId = crypto.randomUUID();
  let action = "unknown";
  try {
    const baseUrl = requiredEnv("INSFORGE_BASE_URL");
    const apiKey = requiredEnv("API_KEY");
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return response({ error: "Unauthorized" }, 401);

    const userClient = createClient({ baseUrl, accessToken: token });
    const userResult = await userClient.auth.getCurrentUser();
    const userId = userResult.data?.user?.id;
    if (userResult.error || !userId) return response({ error: "Unauthorized" }, 401);

    const rawBody = await req.json().catch(() => null);
    const normalizedBody = normalizeProgramRequestBody(rawBody);
    const parsed = requestSchema.safeParse(normalizedBody);
    if (!parsed.success) {
      console.warn(
        "sehatin-program rejected invalid request",
        invalidRequestLogDetails(rawBody, normalizedBody, parsed.error.issues, requestId),
      );
      return response({ error: "Invalid request", requestId }, 400);
    }
    action = parsed.data.action;
    const admin = createAdminClient({ baseUrl, apiKey });

    if (parsed.data.action === "complete-onboarding") {
      const onboardingResult = await admin.database.rpc("edge_complete_onboarding", {
        p_user_id: userId,
        p_full_name: parsed.data.fullName,
        p_age: parsed.data.age,
        p_height_cm: parsed.data.heightCm,
        p_initial_weight_kg: parsed.data.initialWeightKg,
        p_target_weight_kg: parsed.data.targetWeightKg,
        p_weekly_target_kg: parsed.data.weeklyTargetKg,
        p_activity_level: parsed.data.activityLevel,
        p_meal_preference: parsed.data.mealPreference,
        p_reminder_enabled: parsed.data.reminderEnabled,
        p_reminder_time: parsed.data.reminderTime,
        p_weekly_summary_enabled: parsed.data.weeklySummaryEnabled,
        p_time_zone: parsed.data.timeZone,
        p_ai_processing_consent: parsed.data.aiProcessingConsent,
        p_ai_processing_consent_version: AI_CONSENT_VERSION,
      });
      if (onboardingResult.error) throw onboardingResult.error;
      const generation = await generateAndPersist(
        admin,
        userId,
        "onboarding",
        parsed.data.requestId ?? crypto.randomUUID(),
      );
      return response({ ok: true, result: onboardingResult.data, generation });
    }

    if (parsed.data.action === "generate-plan") {
      const generation = await generateAndPersist(
        admin,
        userId,
        parsed.data.reason,
        parsed.data.requestId ?? crypto.randomUUID(),
      );
      return response({ ok: true, generation });
    }

    if (parsed.data.action === "ensure-daily-plan") {
      const generation = await ensureDailyPlan(admin, userId);
      return response({ ok: true, generation });
    }

    if (parsed.data.action === "record-weight") {
      const rpcResult = await admin.database.rpc("edge_record_weight_entry", {
        p_user_id: userId,
        p_weight_kg: parsed.data.weightKg,
        p_logged_on: parsed.data.loggedOn,
      });
      if (rpcResult.error) throw rpcResult.error;
      const shouldRecalibrate = Boolean((rpcResult.data as { shouldRecalibrate?: boolean } | null)?.shouldRecalibrate);
      const generation = shouldRecalibrate
        ? await generateAndPersist(
            admin,
            userId,
            "weight-update",
            parsed.data.requestId ?? crypto.randomUUID(),
          )
        : null;
      return response({ ok: true, result: rpcResult.data, generation });
    }

    if (parsed.data.action === "set-ai-consent") {
      const consentResult = await admin.database.from("profiles").update({
        ai_processing_consent_at: parsed.data.consent ? new Date().toISOString() : null,
        ai_processing_consent_version: parsed.data.consent ? AI_CONSENT_VERSION : null,
      }).eq("user_id", userId).select("user_id").single();
      if (consentResult.error) throw consentResult.error;
      return response({ ok: true, aiProcessingConsent: parsed.data.consent });
    }

    if (parsed.data.action === "chat-message") {
      const chat = await handleChatMessage(admin, userId, parsed.data);
      return response({ ok: true, ...chat });
    }

    if (parsed.data.action === "resolve-chat-adjustment") {
      const resolution = await resolveChatAdjustment(
        admin,
        userId,
        parsed.data.messageId,
        parsed.data.decision,
      );
      return response({ ok: true, ...(resolution as Record<string, unknown>) });
    }

    const rpcResult = await admin.database.rpc("edge_complete_workout_session", {
      p_user_id: userId,
      p_package_id: parsed.data.packageId,
      p_client_completion_id: parsed.data.clientCompletionId,
      p_active_duration_seconds: parsed.data.activeDurationSeconds,
      p_started_at: parsed.data.startedAt,
      p_completed_at: parsed.data.completedAt,
      p_results: parsed.data.results.map((item) => ({
        sub_exercise_id: item.subExerciseId,
        completed_sets: item.completedSets,
        completed_repetitions: item.completedRepetitions ?? null,
        active_duration_seconds: item.activeDurationSeconds,
        completed: item.completed,
      })),
    });
    if (rpcResult.error) throw rpcResult.error;
    const duplicate = Boolean((rpcResult.data as { duplicate?: boolean } | null)?.duplicate);
    const generation = duplicate
      ? null
      : await generateAndPersist(
          admin,
          userId,
          "workout-complete",
          parsed.data.clientCompletionId,
        );
    return response({ ok: true, result: rpcResult.data, generation });
  } catch (error) {
    console.error("sehatin-program failed", errorLogDetails(error, requestId, action));
    if (error instanceof RequestRejectedError) {
      return response({ error: "Request could not be processed", code: error.code }, error.status);
    }
    return response({
      error: "Layanan belum dapat memproses permintaan.",
      code: "INTERNAL_ERROR",
      requestId,
    }, 500);
  }
}

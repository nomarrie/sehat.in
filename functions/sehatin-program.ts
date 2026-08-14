import { createAdminClient, createClient } from "npm:@insforge/sdk@1.5.2";
import { z } from "npm:zod@4.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const AI_CONSENT_VERSION = "2026-08-14";
const AI_TIMEOUT_MS = 20_000;
const AI_MAX_COMPLETION_TOKENS = 3_000;
const GENERATION_DAILY_LIMIT = 3;
const GENERATION_COOLDOWN_SECONDS = 10 * 60;

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

const generatedPlanSchema = z.object({
  workout: z.object({
    name: z.string().trim().min(2).max(120),
    difficulty: z.enum(["pemula", "menengah"]),
    purpose: z.string().trim().min(10).max(500),
    estimatedMinutes: z.number().int().min(5).max(120),
    exercises: z.array(exerciseSchema).min(3).max(10),
  }),
  meals: z.array(mealSchema).length(4),
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
  }).refine((value) => value.targetWeightKg < value.initialWeightKg, {
    path: ["targetWeightKg"],
    message: "Target weight must be lower than the starting weight",
  }),
  z.object({
    action: z.literal("generate-plan"),
    reason: z.enum(["onboarding", "weight-update"]),
    clientRequestId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("record-weight"),
    weightKg: z.number().min(30).max(300),
    loggedOn: z.string().date(),
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
]);

type GeneratedPlan = z.infer<typeof generatedPlanSchema>;
type GenerationReason = "onboarding" | "weight-update" | "workout-complete";

export type UserContext = {
  profile: Record<string, unknown>;
  weightLogs: Array<Record<string, unknown>>;
  weeklyGoals: Array<Record<string, unknown>>;
  latestPackage: Record<string, unknown> | null;
  latestExercises: Array<Record<string, unknown>>;
};

type GenerationClaim = {
  allowed: boolean;
  duplicate: boolean;
  reason: "allowed" | "duplicate" | "in-progress" | "cooldown" | "quota";
  requestId?: string;
  packageId?: string;
  recommendationSetId?: string;
  retryAfterSeconds: number;
};

type PersistedGeneration = {
  packageId: string;
  recommendationSetId: string;
  generatedByAi: boolean;
};

function response(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...headers },
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
  const [profileResult, logsResult, goalsResult, packagesResult] = await Promise.all([
    admin.database.from("profiles").select("user_id, full_name, age, height_cm, initial_weight_kg, current_weight_kg, target_weight_kg, weekly_target_kg, activity_level, meal_preference, time_zone, ai_processing_consent_at, ai_processing_consent_version").eq("user_id", userId).maybeSingle(),
    admin.database.from("weight_logs").select("weight_kg, logged_on").eq("user_id", userId).order("logged_on", { ascending: false }).limit(12),
    admin.database.from("weekly_goals").select("week_start, start_weight_kg, target_weight_kg, planned_loss_kg, status").eq("user_id", userId).order("week_start", { ascending: false }).limit(4),
    admin.database.from("exercise_packages").select("id, name, difficulty_level, purpose, estimated_minutes, scheduled_for, status").eq("user_id", userId).order("scheduled_for", { ascending: false }).order("created_at", { ascending: false }).limit(1),
  ]);

  const firstError = profileResult.error ?? logsResult.error ?? goalsResult.error ?? packagesResult.error;
  if (firstError) throw firstError;
  if (!profileResult.data) throw new Error("Onboarding is required before generating a program.");

  const latestPackage = packagesResult.data?.[0] ?? null;
  let latestExercises: Array<Record<string, unknown>> = [];
  if (latestPackage?.id) {
    const exerciseResult = await admin.database
      .from("sub_exercises")
      .select("name, mode, sets, repetitions, duration_seconds, rest_seconds, order_index, instruction")
      .eq("package_id", latestPackage.id)
      .order("order_index", { ascending: true })
      .limit(20);
    if (exerciseResult.error) throw exerciseResult.error;
    latestExercises = exerciseResult.data ?? [];
  }

  return {
    profile: profileResult.data,
    weightLogs: logsResult.data ?? [],
    weeklyGoals: goalsResult.data ?? [],
    latestPackage,
    latestExercises,
  };
}

function fallbackMeals(preference: unknown): GeneratedPlan["meals"] {
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

function fallbackWorkout(context: UserContext, reason: GenerationReason): GeneratedPlan["workout"] {
  const latestStatus = String(context.weeklyGoals[0]?.status ?? "active");
  const missedWeeks = context.weeklyGoals.filter((goal) => goal.status === "missed").slice(0, 2).length;
  const shouldProgress = reason === "workout-complete" && latestStatus === "met";
  const shouldEase = missedWeeks >= 2;

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

function fallbackPlan(context: UserContext, reason: GenerationReason): GeneratedPlan {
  return {
    workout: fallbackWorkout(context, reason),
    meals: fallbackMeals(context.profile.meal_preference),
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
  };
}

export function parseAllowedProviders(raw: string | null | undefined): string[] | null {
  if (!raw?.trim()) return null;
  const providers = raw.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (providers.length === 0 || providers.some((provider) => !/^[a-z0-9-]+$/.test(provider))) {
    return null;
  }
  return [...new Set(providers)];
}

export function buildOpenRouterRequest(model: string, prompt: string, providers: string[]) {
  return {
    model,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_completion_tokens: AI_MAX_COMPLETION_TOKENS,
    provider: {
      only: providers,
      zdr: true,
      data_collection: "deny",
    },
  };
}

function buildAiPrompt(context: UserContext, reason: GenerationReason) {
  return `Susun program Sehat.in dalam JSON untuk alasan ${reason}. Gunakan Bahasa Indonesia yang suportif. Jangan tampilkan label kondisi medis, diagnosis, atau klaim terapi. Target penurunan mingguan harus tetap 0,5–1 kg. Latihan harus rendah risiko untuk pemula, progresif dalam kenaikan kecil, dan menjadi lebih ringan bila dua target mingguan berturut-turut gagal. Buat tepat empat rekomendasi makanan: Sarapan, Makan siang, Camilan, Makan malam. Data program yang sudah diminimalkan: ${JSON.stringify(buildAiContext(context))}. Bentuk JSON wajib: {"workout":{"name":string,"difficulty":"pemula"|"menengah","purpose":string,"estimatedMinutes":number,"exercises":[{"name":string,"mode":"timed"|"repetitions","sets":number,"repetitions":number|null,"durationSeconds":number|null,"restSeconds":number,"instruction":string}]},"meals":[{"mealType":"Sarapan"|"Makan siang"|"Camilan"|"Makan malam","name":string,"description":string,"rationale":string,"prepMinutes":number,"servings":number,"nutrition":{"calories":number,"proteinGrams":number,"carbsGrams":number,"fatGrams":number,"fiberGrams":number},"ingredients":[{"amount":string,"name":string}],"cookingSteps":[string]}]}`;
}

async function tryAiPlan(context: UserContext, reason: GenerationReason): Promise<GeneratedPlan | null> {
  const hasCurrentConsent = Boolean(context.profile.ai_processing_consent_at)
    && context.profile.ai_processing_consent_version === AI_CONSENT_VERSION;
  if (!hasCurrentConsent) return null;

  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  const model = Deno.env.get("OPENROUTER_MODEL");
  const providers = parseAllowedProviders(Deno.env.get("OPENROUTER_ALLOWED_PROVIDERS"));
  if (!apiKey || !model || !providers) return null;

  try {
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildOpenRouterRequest(model, buildAiPrompt(context, reason), providers)),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
    if (!aiResponse.ok) return null;
    const payload = await aiResponse.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;
    return generatedPlanSchema.parse(JSON.parse(content));
  } catch {
    return null;
  }
}

async function persistPlan(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  context: UserContext,
  plan: GeneratedPlan,
  generatedByAi: boolean,
  reason: GenerationReason,
): Promise<PersistedGeneration> {
  const timeZone = String(context.profile.time_zone ?? "Asia/Makassar");
  const today = isoDateInTimeZone(new Date(), timeZone);
  const currentActive = context.latestPackage?.status === "active" && String(context.latestPackage?.scheduled_for ?? "") >= today;
  const scheduledFor = reason === "workout-complete" || currentActive ? addDays(today, 1) : today;
  const scheduledDate = new Date(`${scheduledFor}T00:00:00Z`);
  const day = scheduledDate.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  scheduledDate.setUTCDate(scheduledDate.getUTCDate() + mondayOffset);
  const weekStart = scheduledDate.toISOString().slice(0, 10);

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

  const exerciseResult = await admin.database.from("sub_exercises").insert(
    plan.workout.exercises.map((exercise, index) => ({
      package_id: packageResult.data.id,
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

  const setResult = await admin.database.from("nutrition_recommendation_sets").insert([{
    user_id: userId,
    based_on_weight_kg: Number(context.profile.current_weight_kg),
    generated_by_ai: generatedByAi,
    generation_status: "generating",
  }]).select("id").single();
  if (setResult.error || !setResult.data) throw setResult.error ?? new Error("Recommendation set insert failed");

  for (const [index, meal] of plan.meals.entries()) {
    const mealResult = await admin.database.from("nutrition_recommendations").insert([{
      recommendation_set_id: setResult.data.id,
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

  const readyResult = await admin.database.from("nutrition_recommendation_sets").update({ generation_status: "ready" }).eq("id", setResult.data.id);
  if (readyResult.error) throw readyResult.error;
  return { packageId: packageResult.data.id, recommendationSetId: setResult.data.id, generatedByAi };
}

async function claimGeneration(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  reason: GenerationReason,
  idempotencyKey: string,
): Promise<GenerationClaim> {
  const result = await admin.database.rpc("edge_claim_program_generation", {
    p_user_id: userId,
    p_idempotency_key: idempotencyKey,
    p_reason: reason,
    p_daily_limit: GENERATION_DAILY_LIMIT,
    p_cooldown_seconds: GENERATION_COOLDOWN_SECONDS,
  });
  if (result.error || !result.data) throw result.error ?? new Error("Generation claim failed");
  const raw = result.data as Partial<GenerationClaim>;
  if (typeof raw.allowed !== "boolean" || typeof raw.duplicate !== "boolean") {
    throw new Error("Invalid generation claim response");
  }
  return {
    allowed: raw.allowed,
    duplicate: raw.duplicate,
    reason: raw.reason ?? "quota",
    requestId: raw.requestId,
    packageId: raw.packageId,
    recommendationSetId: raw.recommendationSetId,
    retryAfterSeconds: Math.max(0, Number(raw.retryAfterSeconds ?? 0)),
  };
}

async function finishGeneration(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  requestId: string,
  outcome: "completed" | "failed",
  result?: PersistedGeneration,
) {
  const finishResult = await admin.database.rpc("edge_finish_program_generation", {
    p_user_id: userId,
    p_request_id: requestId,
    p_outcome: outcome,
    p_package_id: result?.packageId ?? null,
    p_recommendation_set_id: result?.recommendationSetId ?? null,
    p_failure_code: outcome === "failed" ? "GENERATION_FAILED" : null,
  });
  if (finishResult.error) throw finishResult.error;
}

async function generateAndPersist(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  reason: GenerationReason,
  idempotencyKey: string,
) {
  const claim = await claimGeneration(admin, userId, reason, idempotencyKey);
  if (!claim.allowed) {
    return claim.duplicate
      ? {
          status: "duplicate" as const,
          reason: claim.reason,
          requestId: claim.requestId,
          packageId: claim.packageId,
          recommendationSetId: claim.recommendationSetId,
          retryAfterSeconds: claim.retryAfterSeconds,
        }
      : {
          status: "rate-limited" as const,
          reason: claim.reason,
          retryAfterSeconds: claim.retryAfterSeconds,
        };
  }
  if (!claim.requestId) throw new Error("Generation claim is missing its request id");

  try {
    const context = await loadContext(admin, userId);
    const aiPlan = await tryAiPlan(context, reason);
    const plan = aiPlan ?? fallbackPlan(context, reason);
    const persisted = await persistPlan(admin, userId, context, plan, Boolean(aiPlan), reason);
    await finishGeneration(admin, userId, claim.requestId, "completed", persisted);
    return { status: "ready" as const, requestId: claim.requestId, ...persisted };
  } catch (error) {
    try {
      await finishGeneration(admin, userId, claim.requestId, "failed");
    } catch (finishError) {
      console.error("generation claim cleanup failed", errorLogDetails(
        finishError,
        claim.requestId,
        "finish-generation",
      ));
    }
    throw error;
  }
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

    const parsed = requestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return response({ error: "Invalid request", issues: parsed.error.issues }, 400);
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
      const generation = await generateAndPersist(admin, userId, "onboarding", "onboarding:v1");
      return response({ ok: true, result: onboardingResult.data, generation });
    }

    if (parsed.data.action === "generate-plan") {
      const generation = await generateAndPersist(
        admin,
        userId,
        parsed.data.reason,
        `manual:${parsed.data.clientRequestId}`,
      );
      if (generation.status === "rate-limited") {
        return response(
          {
            error: "Terlalu banyak permintaan pembuatan program.",
            code: "GENERATION_RATE_LIMITED",
            retryAfterSeconds: generation.retryAfterSeconds,
          },
          429,
          { "Retry-After": String(generation.retryAfterSeconds) },
        );
      }
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
            `weight:${parsed.data.loggedOn}:${parsed.data.weightKg.toFixed(1)}`,
          )
        : null;
      return response({ ok: true, result: rpcResult.data, generation });
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
          `workout:${parsed.data.clientCompletionId}`,
        );
    return response({ ok: true, result: rpcResult.data, generation });
  } catch (error) {
    console.error("sehatin-program failed", errorLogDetails(error, requestId, action));
    return response({
      error: "Layanan belum dapat memproses permintaan.",
      code: "INTERNAL_ERROR",
      requestId,
    }, 500);
  }
}

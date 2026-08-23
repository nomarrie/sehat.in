import {
  buildAiContext,
  default as handler,
  deriveWorkoutAdaptation,
  normalizeProgramRequestBody,
  redactSensitiveText,
  type UserContext,
} from "./sehatin-program.ts";

function assertEquals(actual: unknown, expected: unknown, message?: string) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(
      message ?? `Expected ${expectedJson}, received ${actualJson}`,
    );
  }
}

Deno.test("AI context contains only the program attributes needed for generation", () => {
  const context: UserContext = {
    profile: {
      user_id: "7f9fc8a4-c39f-4e59-91f8-89ce8acb6e62",
      full_name: "Naila Putri",
      age: 28,
      height_cm: 165,
      initial_weight_kg: 88.7,
      current_weight_kg: 84.4,
      target_weight_kg: 75,
      weekly_target_kg: 0.5,
      activity_level: "pemula",
      meal_preference: "seimbang",
      time_zone: "Asia/Makassar",
      ai_processing_consent_at: "2026-08-14T00:00:00Z",
      ai_processing_consent_version: "2026-08-14",
    },
    weightLogs: [{ weight_kg: 84.4, logged_on: "2026-08-14" }],
    weeklyGoals: [{
      week_start: "2026-08-10",
      status: "active",
      start_weight_kg: 85,
    }],
    latestPackage: {
      id: "2f97f29f-1960-4973-af8d-31f475b26371",
      name: "Latihan Hari Ini",
      difficulty_level: "pemula",
      estimated_minutes: 30,
      scheduled_for: "2026-08-14",
    },
    latestExercises: [{
      id: "5f74f840-0f7b-4191-b741-7fd24db241b3",
      name: "Jalan di Tempat",
      mode: "timed",
      sets: 1,
      repetitions: null,
      duration_seconds: 300,
      rest_seconds: 45,
      instruction: "Jaga langkah tetap ringan.",
      order_index: 1,
    }],
    latestWorkoutResult: {
      activeDurationSeconds: 300,
      completedAt: "2026-08-14T08:00:00.000Z",
      exercises: [{
        subExerciseId: "5f74f840-0f7b-4191-b741-7fd24db241b3",
        completedSets: 1,
        completedRepetitions: null,
        activeDurationSeconds: 300,
        completed: true,
      }],
    },
  };

  assertEquals(buildAiContext(context), {
    currentWeightKg: 84,
    targetWeightKg: 75,
    weeklyTargetKg: 0.5,
    activityLevel: "pemula",
    mealPreference: "seimbang",
    recentGoalStatuses: ["active"],
    previousWorkout: {
      difficulty: "pemula",
      estimatedMinutes: 30,
      exercises: [{
        name: "Jalan di Tempat",
        mode: "timed",
        sets: 1,
        repetitions: null,
        durationSeconds: 300,
        restSeconds: 45,
        instruction: "Jaga langkah tetap ringan.",
      }],
    },
    latestWorkoutResult: {
      activeDurationSeconds: 300,
      completedAt: "2026-08-14T08:00:00.000Z",
      exercises: [{
        name: "Jalan di Tempat",
        completedSets: 1,
        completedRepetitions: null,
        activeDurationSeconds: 300,
        completed: true,
      }],
    },
  });
});

Deno.test("workout adaptation progresses completed sessions unless two recent weeks were missed", () => {
  const base: UserContext = {
    profile: {},
    weightLogs: [],
    weeklyGoals: [{ status: "met" }],
    latestPackage: null,
    latestExercises: [],
    latestWorkoutResult: {
      activeDurationSeconds: 300,
      completedAt: "2026-08-14T08:00:00.000Z",
      exercises: [{
        subExerciseId: "5f74f840-0f7b-4191-b741-7fd24db241b3",
        completedSets: 1,
        completedRepetitions: null,
        activeDurationSeconds: 300,
        completed: true,
      }],
    },
  };

  assertEquals(deriveWorkoutAdaptation(base, "workout-complete"), {
    shouldEase: false,
    shouldProgress: true,
  });

  assertEquals(deriveWorkoutAdaptation({
    ...base,
    weeklyGoals: [{ status: "missed" }, { status: "missed" }],
  }, "workout-complete"), {
    shouldEase: true,
    shouldProgress: false,
  });
});

Deno.test("workout adaptation does not treat non-consecutive missed weeks as a streak", () => {
  const context: UserContext = {
    profile: {},
    weightLogs: [],
    weeklyGoals: [
      { status: "missed" },
      { status: "met" },
      { status: "missed" },
    ],
    latestPackage: null,
    latestExercises: [],
    latestWorkoutResult: null,
  };

  assertEquals(deriveWorkoutAdaptation(context, "weight-update"), {
    shouldEase: false,
    shouldProgress: false,
  });
});

Deno.test("log redaction removes common credentials and direct identifiers", () => {
  const redacted = redactSensitiveText(
    "Bearer secret-token naila@example.com user 7f9fc8a4-c39f-4e59-91f8-89ce8acb6e62",
  );
  assertEquals(redacted, "Bearer [REDACTED] [EMAIL] user [UUID]");
});

Deno.test("consent requests accept direct and serialized server-action payloads", () => {
  assertEquals(
    normalizeProgramRequestBody({ action: "set-ai-consent", consent: true }),
    { action: "set-ai-consent", consent: true },
  );
  assertEquals(
    normalizeProgramRequestBody({
      body: JSON.stringify({ action: "set-ai-consent", consent: "on" }),
    }),
    { action: "set-ai-consent", consent: true },
  );
  assertEquals(
    normalizeProgramRequestBody(JSON.stringify({
      body: { action: "set-ai-consent", consent: "false" },
    })),
    { action: "set-ai-consent", consent: false },
  );
});

Deno.test("unexpected backend failures return a generic client error with a request id", async () => {
  const previousBaseUrl = Deno.env.get("INSFORGE_BASE_URL");
  Deno.env.delete("INSFORGE_BASE_URL");
  try {
    const response = await handler(
      new Request("https://example.test/sehatin-program", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({ action: "generate-plan" }),
      }),
    );
    const payload = await response.json();

    assertEquals(response.status, 500);
    assertEquals(payload.code, "INTERNAL_ERROR");
    if (
      typeof payload.requestId !== "string" || payload.requestId.length < 30
    ) {
      throw new Error(
        "Expected a correlation request id in the generic error response",
      );
    }
    if (JSON.stringify(payload).includes("INSFORGE_BASE_URL")) {
      throw new Error(
        "Internal environment details leaked to the client response",
      );
    }
  } finally {
    if (previousBaseUrl === undefined) Deno.env.delete("INSFORGE_BASE_URL");
    else Deno.env.set("INSFORGE_BASE_URL", previousBaseUrl);
  }
});

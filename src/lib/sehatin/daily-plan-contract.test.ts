import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const queriesSource = readFileSync(
  resolve(process.cwd(), "src/lib/sehatin/queries.ts"),
  "utf8",
);
const guardsSource = readFileSync(
  resolve(process.cwd(), "src/lib/auth/guards.ts"),
  "utf8",
);
const migrationSource = readFileSync(
  resolve(
    process.cwd(),
    "migrations/20260904000000_add-daily-workout-and-meal-plans.sql",
  ),
  "utf8",
);
const functionSource = readFileSync(
  resolve(process.cwd(), "functions/sehatin-program.ts"),
  "utf8",
);

describe("daily workout and meal plan contract", () => {
  it("reads today's plan before invoking the daily-plan function", () => {
    expect(queriesSource).toContain('action: "ensure-daily-plan"');
    expect(queriesSource).toMatch(
      /let snapshot = await loadDailyPlanSnapshot[\s\S]*snapshot\.packageRow\?\.status === "active"[\s\S]*snapshot\.recommendationSet[\s\S]*await ensureDailyPlan/,
    );
    expect(queriesSource.match(/await ensureDailyPlan\(client\)/g)).toHaveLength(1);
    expect(queriesSource).toMatch(/loadDashboardData[\s\S]*loadReadyDailyPlanSnapshot/);
    expect(queriesSource).toMatch(/loadFoodRecommendations[\s\S]*loadReadyDailyPlanSnapshot/);
    expect(queriesSource).toMatch(/loadChatPageData[\s\S]*loadReadyDailyPlanSnapshot/);
  });

  it("replaces a completed daily workout with a persisted plan", () => {
    expect(functionSource).toMatch(
      /async function ensureDailyPlan[\s\S]*\.eq\("scheduled_for", today\)[\s\S]*\.eq\("generation_status", "ready"\)[\s\S]*\.eq\("status", "active"\)/,
    );
  });

  it("reuses the authenticated profile within a server request", () => {
    expect(guardsSource).toContain("cache(async function getOptionalAuthContext");
    expect(queriesSource).not.toContain('.from("profiles")');
  });

  it("keeps the current workout route available when daily generation is unavailable", () => {
    expect(queriesSource).toContain(
      'getPackageById("latihan-hari-ini")',
    );
  });

  it("stores meal recommendation sets against the user's local date", () => {
    expect(migrationSource).toContain(
      "ADD COLUMN IF NOT EXISTS scheduled_for DATE",
    );
    expect(migrationSource).toContain(
      "set_nutrition_recommendation_scheduled_for",
    );
    expect(migrationSource).toContain(
      "nutrition_sets_user_schedule_idx",
    );
  });
});

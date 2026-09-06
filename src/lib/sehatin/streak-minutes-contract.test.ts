import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSource = readFileSync(
  resolve(
    process.cwd(),
    "migrations/20260906080633_count-trusted-workout-minutes.sql",
  ),
  "utf8",
);
const queriesSource = readFileSync(
  resolve(process.cwd(), "src/lib/sehatin/queries.ts"),
  "utf8",
);

describe("trusted workout streak minute contract", () => {
  it("counts every saved session from a trusted ready workout", () => {
    expect(migrationSource).toContain(
      "CREATE OR REPLACE FUNCTION public.edge_complete_workout_session",
    );
    expect(migrationSource).toMatch(
      /SELECT COALESCE\(SUM\(active_duration_seconds\), 0\)::INTEGER INTO v_daily_seconds[\s\S]*FROM public\.exercise_sessions WHERE user_id = p_user_id AND activity_date = v_activity_date/,
    );
    expect(migrationSource).not.toContain("generated_by_ai");
  });

  it("loads saved session minutes without requiring package provenance", () => {
    expect(queriesSource).not.toContain("exercise_packages(generated_by_ai)");
    expect(queriesSource).toContain("calculateEligibleStreakSeconds(");
  });
});

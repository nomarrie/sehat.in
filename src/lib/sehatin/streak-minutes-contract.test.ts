import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSource = readFileSync(
  resolve(
    process.cwd(),
    "migrations/20260906030215_gate-fallback-streak-minutes.sql",
  ),
  "utf8",
);
const queriesSource = readFileSync(
  resolve(process.cwd(), "src/lib/sehatin/queries.ts"),
  "utf8",
);

describe("fallback streak minute contract", () => {
  it("only includes fallback sessions when an AI session exists that day", () => {
    expect(migrationSource).toContain(
      "CREATE OR REPLACE FUNCTION public.edge_complete_workout_session",
    );
    expect(migrationSource).toMatch(
      /JOIN public\.exercise_packages AS workout_package[\s\S]*workout_package\.generated_by_ai[\s\S]*OR EXISTS \([\s\S]*ai_package\.generated_by_ai/,
    );
    expect(migrationSource).toMatch(
      /ai_session\.activity_date = v_activity_date/,
    );
  });

  it("loads package provenance before calculating dashboard minutes", () => {
    expect(queriesSource).toContain(
      'exercise_packages(generated_by_ai)',
    );
    expect(queriesSource).toContain("calculateEligibleStreakSeconds(");
  });
});

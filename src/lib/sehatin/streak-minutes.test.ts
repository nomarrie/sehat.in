import { describe, expect, it } from "vitest";

import { calculateEligibleStreakSeconds } from "./streak-minutes";

describe("calculateEligibleStreakSeconds", () => {
  it("counts an AI-recommended workout by itself", () => {
    expect(calculateEligibleStreakSeconds([
      session(1_200, true),
    ])).toBe(1_200);
  });

  it("counts trusted fallback workouts without an AI-recommended completion", () => {
    expect(calculateEligibleStreakSeconds([
      session(900, false),
      session(600, false),
    ])).toBe(1_500);
  });

  it("counts fallback workouts after an AI-recommended workout is completed that day", () => {
    expect(calculateEligibleStreakSeconds([
      session(1_200, true),
      session(600, false),
    ])).toBe(1_800);
  });

  it("counts an earlier fallback workout once an AI workout is completed later that day", () => {
    expect(calculateEligibleStreakSeconds([
      session(600, false),
      session(1_200, true),
    ])).toBe(1_800);
  });
});

function session(activeSeconds: number, generatedByAi: boolean) {
  return {
    active_duration_seconds: activeSeconds,
    exercise_packages: { generated_by_ai: generatedByAi },
  };
}

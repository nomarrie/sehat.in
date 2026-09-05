import { describe, expect, it } from "vitest";
import { calculateWeeklyProgress, calculateWeightProgress } from "./progress";

describe("weight progress", () => {
  it("reports the completed share between the initial and target weight", () => {
    expect(
      calculateWeightProgress({
        initialWeight: 92.4,
        currentWeight: 88.7,
        targetWeight: 72,
      }),
    ).toBe(18);
  });

  it("clamps progress when the current value passes the target", () => {
    expect(
      calculateWeightProgress({
        initialWeight: 92.4,
        currentWeight: 70,
        targetWeight: 72,
      }),
    ).toBe(100);
  });

  it("reports weekly progress toward a lower target", () => {
    expect(
      calculateWeeklyProgress({
        startWeight: 89.2,
        currentWeight: 88.7,
        targetWeight: 88.6,
      }),
    ).toBe(83);
  });

  it("reports progress toward a higher target", () => {
    expect(
      calculateWeightProgress({
        initialWeight: 52,
        currentWeight: 54,
        targetWeight: 60,
      }),
    ).toBe(25);
  });

  it("reports weekly progress toward a higher target", () => {
    expect(
      calculateWeeklyProgress({
        startWeight: 54,
        currentWeight: 54.3,
        targetWeight: 54.5,
      }),
    ).toBe(60);
  });
});

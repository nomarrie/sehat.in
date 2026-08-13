import { describe, expect, it } from "vitest";
import type { WeightLog } from "./dashboard.types";
import { formatWeightLogLabel, upsertWeightLog, validateWeightEntry } from "./weight-log";

const logs: WeightLog[] = [
  { date: "2026-08-04", label: "4 Agu", weight: 89.2 },
  { date: "2026-08-11", label: "11 Agu", weight: 88.7 },
];

describe("weight log helpers", () => {
  it("validates a realistic weight and date", () => {
    const result = validateWeightEntry({ date: "2026-08-12", weight: "88.4" }, "2026-08-12");
    expect(result.errors).toEqual({});
    expect(result.value).toEqual({ date: "2026-08-12", label: "12 Agu", weight: 88.4 });
  });

  it("rejects future dates and out-of-range weights", () => {
    const result = validateWeightEntry({ date: "2026-08-13", weight: "10" }, "2026-08-12");
    expect(result.errors.date).toContain("masa depan");
    expect(result.errors.weight).toContain("30–300");
  });

  it("replaces a same-day entry without mutating the input", () => {
    const result = upsertWeightLog(logs, { date: "2026-08-11", label: "11 Agu", weight: 88.5 });
    expect(result).toHaveLength(2);
    expect(result.at(-1)?.weight).toBe(88.5);
    expect(logs.at(-1)?.weight).toBe(88.7);
  });

  it("formats Indonesian labels and sorts a new entry", () => {
    expect(formatWeightLogLabel("2026-09-02")).toBe("2 Sep");
    expect(upsertWeightLog(logs, { date: "2026-07-30", label: "30 Jul", weight: 89.5 })[0].date).toBe("2026-07-30");
  });
});

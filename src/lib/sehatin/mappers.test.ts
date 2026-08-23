import { describe, expect, it } from "vitest";
import { mapExercisePackage, mapWeightLog } from "./mappers";

describe("InsForge row mappers", () => {
  it("normalizes numeric Postgres values in weight logs", () => {
    expect(mapWeightLog({ logged_on: "2026-08-13", weight_kg: "88.4" })).toEqual({
      date: "2026-08-13",
      label: "13 Agu",
      weight: 88.4,
    });
  });

  it("keeps exercise order and nullable duration fields", () => {
    const mapped = mapExercisePackage(
      {
        id: "package-1",
        name: "Latihan Dasar",
        scheduled_for: "2026-08-13",
        difficulty_level: "pemula",
        purpose: "Membangun ritme gerak.",
        estimated_minutes: 30,
        generated_by_ai: true,
      },
      [{
        id: "exercise-1",
        name: "Chair Squat",
        mode: "repetitions",
        sets: 3,
        repetitions: 10,
        duration_seconds: null,
        rest_seconds: 45,
        order_index: 1,
        instruction: "Turun perlahan ke arah kursi.",
      }],
    );

    expect(mapped.difficulty).toBe("Pemula");
    expect(mapped.generatedByAi).toBe(true);
    expect(mapped.exercises[0]).toMatchObject({
      order: 1,
      repetitions: 10,
      durationSeconds: null,
    });
  });
});

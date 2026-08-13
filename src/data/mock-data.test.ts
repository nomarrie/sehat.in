import { describe, expect, it } from "vitest";
import { dashboardData, getPackageById } from "./mock-data";

describe("mock workout data", () => {
  it("returns today's package with exercises in explicit order", () => {
    const workout = getPackageById("latihan-hari-ini");
    expect(workout?.exercises.map((exercise) => exercise.order)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(workout?.exercises.map((exercise) => exercise.name)).toEqual([
      "Jalan di Tempat",
      "Chair Squat",
      "Wall Push-Up",
      "Low Impact Knee Raise",
    ]);
  });

  it("returns undefined for an unknown package", () => {
    expect(getPackageById("tidak-ada")).toBeUndefined();
  });

  it("keeps the dashboard package linked to the package fixture", () => {
    expect(dashboardData.todayPackage?.id).toBe("latihan-hari-ini");
    expect(dashboardData.streak.dailyGoalMinutes).toBe(30);
  });
});

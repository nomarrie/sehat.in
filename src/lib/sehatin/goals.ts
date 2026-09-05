export type GoalDirection = "lose" | "gain";

export const goalDirectionLabels: Record<GoalDirection, string> = {
  lose: "Turunkan berat badan",
  gain: "Naikkan berat badan",
};

export function weeklyTargetRange(direction: GoalDirection) {
  return direction === "gain"
    ? { min: 0.25, max: 0.5, defaultValue: 0.25, step: 0.05 }
    : { min: 0.5, max: 1, defaultValue: 0.5, step: 0.1 };
}

export function remainingWeight(
  currentWeight: number,
  targetWeight: number,
  direction: GoalDirection,
) {
  return direction === "gain"
    ? Math.max(0, targetWeight - currentWeight)
    : Math.max(0, currentWeight - targetWeight);
}

export function nextWeeklyTarget(
  currentWeight: number,
  finalTargetWeight: number,
  weeklyTargetKg: number,
  direction: GoalDirection,
) {
  return direction === "gain"
    ? Math.min(finalTargetWeight, currentWeight + weeklyTargetKg)
    : Math.max(finalTargetWeight, currentWeight - weeklyTargetKg);
}

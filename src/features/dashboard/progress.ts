type WeightProgressInput = {
  initialWeight: number;
  currentWeight: number;
  targetWeight: number;
};

type WeeklyProgressInput = {
  startWeight: number;
  currentWeight: number;
  targetWeight: number;
};

const clampPercent = (value: number) =>
  Math.min(100, Math.max(0, Math.round(value)));

export function calculateWeightProgress(input: WeightProgressInput): number {
  const plannedChange = input.targetWeight - input.initialWeight;
  if (plannedChange === 0) return 0;

  return clampPercent(
    ((input.currentWeight - input.initialWeight) / plannedChange) * 100,
  );
}

export function calculateWeeklyProgress(input: WeeklyProgressInput): number {
  const plannedChange = input.targetWeight - input.startWeight;
  if (plannedChange === 0) return 0;

  return clampPercent(
    ((input.currentWeight - input.startWeight) / plannedChange) * 100,
  );
}

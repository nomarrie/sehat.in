import type { WeightLog } from "@/features/dashboard/dashboard.types";
import type { ExercisePackage } from "@/features/workouts/workout.types";
import type { ExercisePackageRow, SubExerciseRow, WeightLogRow } from "./database.types";
import { formatDateLabel, formatLongDate } from "./format";

export function mapWeightLog(row: WeightLogRow): WeightLog {
  return {
    date: row.logged_on,
    label: formatDateLabel(row.logged_on),
    weight: Number(row.weight_kg),
  };
}

export function mapExercisePackage(
  row: ExercisePackageRow,
  exercises: SubExerciseRow[],
): ExercisePackage {
  return {
    id: row.id,
    name: row.name,
    dayLabel: formatLongDate(row.scheduled_for),
    generatedByAi: row.generated_by_ai,
    difficulty: row.difficulty_level === "menengah" ? "Menengah" : "Pemula",
    purpose: row.purpose,
    estimatedMinutes: row.estimated_minutes,
    exercises: exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      mode: exercise.mode,
      sets: exercise.sets,
      repetitions: exercise.repetitions,
      durationSeconds: exercise.duration_seconds,
      restSeconds: exercise.rest_seconds,
      order: exercise.order_index,
      instruction: exercise.instruction,
    })),
  };
}

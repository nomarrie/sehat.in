export type StreakSessionRow = {
  active_duration_seconds: unknown;
  exercise_packages:
    | { generated_by_ai?: unknown }
    | Array<{ generated_by_ai?: unknown }>
    | null;
};

function wasGeneratedByAi(session: StreakSessionRow) {
  const workoutPackage = Array.isArray(session.exercise_packages)
    ? session.exercise_packages[0]
    : session.exercise_packages;
  return workoutPackage?.generated_by_ai === true;
}

export function calculateEligibleStreakSeconds(sessions: StreakSessionRow[]) {
  if (!sessions.some(wasGeneratedByAi)) return 0;

  return sessions.reduce(
    (total, session) => total + Number(session.active_duration_seconds),
    0,
  );
}

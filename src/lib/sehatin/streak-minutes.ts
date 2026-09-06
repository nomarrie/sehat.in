export type StreakSessionRow = {
  active_duration_seconds: unknown;
};

export function calculateEligibleStreakSeconds(sessions: StreakSessionRow[]) {
  return sessions.reduce(
    (total, session) => total + Number(session.active_duration_seconds),
    0,
  );
}

export type ExerciseMode = "timed" | "repetitions";

export type SubExercise = {
  id: string;
  name: string;
  mode: ExerciseMode;
  sets: number;
  repetitions: number | null;
  durationSeconds: number | null;
  restSeconds: number;
  order: number;
  instruction: string;
};

export type ExercisePackage = {
  id: string;
  name: string;
  dayLabel: string;
  generatedByAi: boolean;
  difficulty: "Pemula" | "Menengah";
  purpose: string;
  estimatedMinutes: number;
  exercises: SubExercise[];
};

export type ExerciseSessionStep = {
  kind: "exercise";
  exerciseIndex: number;
  setIndex: number;
  durationSeconds: number | null;
};

export type RestSessionStep = {
  kind: "rest";
  afterExerciseIndex: number;
  durationSeconds: number;
};

export type SessionStep = ExerciseSessionStep | RestSessionStep;
export type ActiveSessionPhase = "exercise" | "rest";
export type SessionPhase = "idle" | ActiveSessionPhase | "paused" | "completed";

export type WorkoutSessionState = {
  phase: SessionPhase;
  pausedPhase: ActiveSessionPhase | null;
  steps: SessionStep[];
  stepIndex: number;
  remainingMs: number | null;
  deadlineMs: number | null;
  lastTickAtMs: number | null;
  activeElapsedMs: number;
  startedAtMs: number | null;
  completedAtMs: number | null;
};

export type SessionEvent =
  | { type: "START"; nowMs: number }
  | { type: "TICK"; nowMs: number }
  | { type: "COMPLETE_WORK"; nowMs: number }
  | { type: "PAUSE"; nowMs: number }
  | { type: "RESUME"; nowMs: number }
  | { type: "SKIP_REST"; nowMs: number }
  | { type: "RESET" };

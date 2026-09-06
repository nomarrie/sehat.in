import type {
  ExercisePackage,
  SessionEvent,
  SessionStep,
  WorkoutSessionState,
} from "./workout.types";

export function buildSessionSteps(
  workoutPackage: ExercisePackage,
): SessionStep[] {
  const workSteps = [...workoutPackage.exercises]
    .sort((a, b) => a.order - b.order)
    .flatMap((exercise, exerciseIndex) =>
      Array.from({ length: exercise.sets }, (_, setIndex) => ({
        exercise,
        step: {
          kind: "exercise" as const,
          exerciseIndex,
          setIndex,
          durationSeconds: exercise.durationSeconds,
        },
      })),
    );

  return workSteps.flatMap(({ exercise, step }, index): SessionStep[] => {
    const hasNextWork = index < workSteps.length - 1;
    if (!hasNextWork || exercise.restSeconds === 0) return [step];

    return [
      step,
      {
        kind: "rest",
        afterExerciseIndex: step.exerciseIndex,
        durationSeconds: exercise.restSeconds,
      },
    ];
  });
}

const idleState = (steps: SessionStep[]): WorkoutSessionState => ({
  phase: "idle",
  pausedPhase: null,
  steps,
  stepIndex: -1,
  remainingMs: null,
  deadlineMs: null,
  lastTickAtMs: null,
  activeElapsedMs: 0,
  startedAtMs: null,
  completedAtMs: null,
});

export const createInitialSessionState = (workoutPackage: ExercisePackage) =>
  idleState(buildSessionSteps(workoutPackage));

function startStep(
  state: WorkoutSessionState,
  stepIndex: number,
  nowMs: number,
): WorkoutSessionState {
  const step = state.steps[stepIndex];
  if (!step) {
    return {
      ...state,
      phase: "completed",
      pausedPhase: null,
      stepIndex: state.steps.length,
      remainingMs: null,
      deadlineMs: null,
      lastTickAtMs: null,
      completedAtMs: nowMs,
    };
  }

  const durationMs =
    step.durationSeconds === null ? null : step.durationSeconds * 1000;

  return {
    ...state,
    phase: step.kind,
    pausedPhase: null,
    stepIndex,
    remainingMs: durationMs,
    deadlineMs: durationMs === null ? null : nowMs + durationMs,
    lastTickAtMs: step.kind === "exercise" ? nowMs : null,
    startedAtMs: state.startedAtMs ?? nowMs,
    completedAtMs: null,
  };
}

const advanceStep = (state: WorkoutSessionState, nowMs: number) =>
  startStep(state, state.stepIndex + 1, nowMs);

function tickActiveState(
  state: WorkoutSessionState,
  nowMs: number,
): WorkoutSessionState {
  if (state.phase === "exercise") {
    const activeEnd =
      state.deadlineMs === null ? nowMs : Math.min(nowMs, state.deadlineMs);
    const activeDelta = Math.max(
      0,
      activeEnd - (state.lastTickAtMs ?? activeEnd),
    );
    const remainingMs =
      state.deadlineMs === null
        ? null
        : state.deadlineMs - nowMs;
    const updated = {
      ...state,
      remainingMs,
      lastTickAtMs: activeEnd,
      activeElapsedMs: state.activeElapsedMs + activeDelta,
    };

    return updated;
  }

  if (state.phase === "rest" && state.deadlineMs !== null) {
    const remainingMs = Math.max(0, state.deadlineMs - nowMs);
    const updated = { ...state, remainingMs };
    return remainingMs === 0 ? advanceStep(updated, nowMs) : updated;
  }

  return state;
}

export function transitionSession(
  state: WorkoutSessionState,
  event: SessionEvent,
): WorkoutSessionState {
  switch (event.type) {
    case "START":
      return state.phase === "idle" ? startStep(state, 0, event.nowMs) : state;
    case "TICK":
      return tickActiveState(state, event.nowMs);
    case "COMPLETE_WORK": {
      const accounted = tickActiveState(state, event.nowMs);
      return accounted.phase === "exercise"
        ? advanceStep(accounted, event.nowMs)
        : accounted;
    }
    case "PAUSE": {
      const accounted = tickActiveState(state, event.nowMs);
      if (accounted.phase !== "exercise" && accounted.phase !== "rest") {
        return accounted;
      }

      return {
        ...accounted,
        phase: "paused",
        pausedPhase: accounted.phase,
        deadlineMs: null,
        lastTickAtMs: null,
      };
    }
    case "RESUME":
      if (state.phase !== "paused" || state.pausedPhase === null) return state;

      return {
        ...state,
        phase: state.pausedPhase,
        pausedPhase: null,
        deadlineMs:
          state.remainingMs === null ? null : event.nowMs + state.remainingMs,
        lastTickAtMs: state.pausedPhase === "exercise" ? event.nowMs : null,
      };
    case "SKIP_REST":
      return state.phase === "rest" ? advanceStep(state, event.nowMs) : state;
    case "RESET":
      return idleState(state.steps);
  }
}

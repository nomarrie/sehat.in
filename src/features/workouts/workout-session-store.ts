import { createStore } from "zustand/vanilla";
import { createInitialSessionState, transitionSession } from "./session-machine";
import type {
  ExercisePackage,
  SessionEvent,
  WorkoutSessionState,
} from "./workout.types";

export type WorkoutSessionStore = {
  session: WorkoutSessionState;
  start: () => void;
  tick: () => void;
  completeWork: () => void;
  pause: () => void;
  resume: () => void;
  skipRest: () => void;
  reset: () => void;
};

export function createWorkoutSessionStore(
  workoutPackage: ExercisePackage,
  getNow: () => number = Date.now,
) {
  return createStore<WorkoutSessionStore>()((set) => {
    const dispatch = (event: SessionEvent) =>
      set((current) => ({
        session: transitionSession(current.session, event),
      }));

    return {
      session: createInitialSessionState(workoutPackage),
      start: () => dispatch({ type: "START", nowMs: getNow() }),
      tick: () => dispatch({ type: "TICK", nowMs: getNow() }),
      completeWork: () =>
        dispatch({ type: "COMPLETE_WORK", nowMs: getNow() }),
      pause: () => dispatch({ type: "PAUSE", nowMs: getNow() }),
      resume: () => dispatch({ type: "RESUME", nowMs: getNow() }),
      skipRest: () => dispatch({ type: "SKIP_REST", nowMs: getNow() }),
      reset: () => dispatch({ type: "RESET" }),
    };
  });
}
